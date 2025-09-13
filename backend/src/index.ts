import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { githubAppAuth } from "./github-app-auth.js";

// Load environment variables
dotenv.config();

// Core types
type GitHubCodeSearchItem = {
  name: string;
  path: string;
  html_url: string;
  sha: string;
  size: number;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
};

type GitHubCodeSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubCodeSearchItem[];
};

type GitHubRepo = {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  pushed_at: string;
  owner: {
    login: string;
    html_url: string;
  };
};

type GitHubFileContent = {
  content: string; // base64 encoded
  encoding: string;
  sha: string;
  size: number;
};

type IndexedPlugin = {
  plugin_name: string;
  plugin_author: string;
  language: string;
  file: {
    path: string;
    html_url: string;
    raw_url: string;
    sha: string;
    size: number;
  };
  repository: {
    full_name: string;
    name: string;
    html_url: string;
    description: string | null;
    owner_login: string;
    owner_url: string;
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    created_at: string;
  };
  indexed_at: string;
};

// Simple fork-based approach
type SearchVariant = {
  name: string;
  query: string;
};

function buildSearchVariants(): SearchVariant[] {
  const baseQuery = 'namespace Oxide.Plugins in:file language:C#';
  return [
    { name: "all", query: baseQuery },
    { name: "with-extension", query: `${baseQuery} extension:cs` },
    { name: "fork-false", query: `${baseQuery} fork:false` },
    { name: "fork-true", query: `${baseQuery} fork:true` },
    { name: "fork-false-extension", query: `${baseQuery} extension:cs fork:false` },
    { name: "fork-true-extension", query: `${baseQuery} extension:cs fork:true` },
    { name: "size-small", query: `${baseQuery} size:<10000` },
    { name: "size-medium", query: `${baseQuery} size:10000..50000` },
    { name: "size-large", query: `${baseQuery} size:>50000` },
    // Добавляем больше вариантов для обхода лимитов
    { name: "size-tiny", query: `${baseQuery} size:<1000` },
    { name: "size-small-2", query: `${baseQuery} size:1000..5000` },
    { name: "size-small-3", query: `${baseQuery} size:5000..10000` },
    { name: "size-medium-2", query: `${baseQuery} size:50000..100000` },
    { name: "size-large-2", query: `${baseQuery} size:100000..200000` },
    { name: "size-huge", query: `${baseQuery} size:>200000` },
    // Попробуем без language фильтра
    { name: "no-language", query: 'namespace Oxide.Plugins in:file' },
    { name: "no-language-extension", query: 'namespace Oxide.Plugins in:file extension:cs' },
    // Попробуем с разными сортировками
    { name: "sort-indexed", query: `${baseQuery} sort:indexed` },
    { name: "sort-indexed-desc", query: `${baseQuery} sort:indexed order:desc` },
    { name: "sort-indexed-asc", query: `${baseQuery} sort:indexed order:asc` },
    // Попробуем с разными комбинациями
    { name: "csharp-only", query: 'namespace Oxide.Plugins language:C#' },
    { name: "csharp-extension", query: 'namespace Oxide.Plugins language:C# extension:cs' },
    { name: "csharp-fork-true", query: 'namespace Oxide.Plugins language:C# fork:true' },
    { name: "csharp-fork-false", query: 'namespace Oxide.Plugins language:C# fork:false' },
    // Попробуем с разными размерами для fork режимов
    { name: "fork-true-small", query: `${baseQuery} fork:true size:<10000` },
    { name: "fork-true-medium", query: `${baseQuery} fork:true size:10000..50000` },
    { name: "fork-true-large", query: `${baseQuery} fork:true size:>50000` },
    { name: "fork-false-small", query: `${baseQuery} fork:false size:<10000` },
    { name: "fork-false-medium", query: `${baseQuery} fork:false size:10000..50000` },
    { name: "fork-false-large", query: `${baseQuery} fork:false size:>50000` },
  ];
}

type IndexerState = {
  version: string;
  currentVariant: number;
  currentPage: number;
  seenKeys: Record<string, boolean>;
  repoCache: Record<string, GitHubRepo>;
  lastFullScanAt: string | null;
  query: string;
};

// Configuration
const CONTINUOUS = (process.env.CONTINUOUS ?? "false").toLowerCase() === "true";
const CYCLE_DELAY_MS = Number.parseInt(process.env.CYCLE_DELAY_MS ?? "900000", 10); // 15 min
const SEARCH_QUERY = process.env.SEARCH_QUERY ?? 'namespace Oxide.Plugins in:file language:C# extension:cs';

// GitHub token will be initialized in run() function
let GITHUB_TOKEN: string;

const OUT_DIR = path.resolve("output");
const OUT_FILE = path.join(OUT_DIR, "oxide_plugins.json");
const STATE_FILE = path.join(OUT_DIR, "state.json");

// Utility functions
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

function itemKey(item: GitHubCodeSearchItem): string {
  return `${item.repository.full_name}#${item.path}#${item.sha}`;
}

function indexedKey(p: IndexedPlugin): string {
  return `${p.repository.full_name}#${p.file.path}#${p.file.sha}`;
}

// GitHub API functions
async function githubFetchJson<T>(url: string, attempt = 1): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "oxide-rust-plugins-indexer/1.0",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  // Handle rate limiting
  if (res.status === 403) {
    const remaining = res.headers.get("X-RateLimit-Remaining");
    const resetSearch = res.headers.get("X-RateLimit-Reset-Search");
    const resetPrimary = res.headers.get("X-RateLimit-Reset");
    const retryAfter = res.headers.get("Retry-After");

    // Prefer search-specific rate limit
    const resetSeconds = parseInt((resetSearch ?? resetPrimary) || "0", 10);
    if (remaining === "0" && resetSeconds > 0) {
      const waitMs = Math.max(0, (resetSeconds * 1000) - Date.now()) + 1500;
      const resetIso = new Date(resetSeconds * 1000).toISOString();
      console.warn(`Rate limited. Resets at ${resetIso} (in ${formatDuration(waitMs)}). Sleeping...`);
      await sleep(waitMs);
      return githubFetchJson<T>(url, attempt + 1);
    }
    if (retryAfter) {
      const ms = Math.max(1000, parseInt(retryAfter, 10) * 1000);
      console.warn(`Retry-After=${retryAfter}s. Sleeping ${formatDuration(ms)} ...`);
      await sleep(ms);
      return githubFetchJson<T>(url, attempt + 1);
    }
    // Secondary rate limits
    const backoffMs = Math.min(120000, 5000 * attempt);
    console.warn(`HTTP 403 (secondary limit). Backing off ${formatDuration(backoffMs)} (attempt ${attempt}) ...`);
    await sleep(backoffMs);
    if (attempt >= 6) {
      const body = await res.text();
      throw new Error(`GitHub API 403 after retries. Body: ${body}`);
    }
    return githubFetchJson<T>(url, attempt + 1);
  }
  if (res.status === 429) {
    const retryAfter = Number.parseInt(res.headers.get("Retry-After") ?? "10", 10) * 1000;
    console.warn(`HTTP 429. Waiting ${formatDuration(retryAfter)} ...`);
    await sleep(retryAfter);
    return githubFetchJson<T>(url, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${text}`);
  }

  const data = (await res.json()) as T;
  return { data, headers: res.headers };
}

async function fetchRepo(fullName: string): Promise<GitHubRepo> {
  const { data } = await githubFetchJson<GitHubRepo>(`https://api.github.com/repos/${fullName}`);
  return data;
}

async function fetchFileContent(owner: string, repo: string, path: string, sha: string): Promise<GitHubFileContent> {
  // Try with SHA first, fallback to default branch
  try {
    const { data } = await githubFetchJson<GitHubFileContent>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${sha}`
    );
    return data;
  } catch (err) {
    // If SHA fails, try with default branch
    const { data } = await githubFetchJson<GitHubFileContent>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
    );
    return data;
  }
}

// Search functions
async function fetchSearchCount(query: string): Promise<number> {
  const countUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=1`;
  const { data } = await githubFetchJson<GitHubCodeSearchResponse>(countUrl);
  return data.total_count;
}

async function fetchSearchPage(query: string, page: number): Promise<GitHubCodeSearchItem[]> {
  const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100&page=${page}&sort=indexed&order=desc`;
  const { data } = await githubFetchJson<GitHubCodeSearchResponse>(searchUrl);
  return data.items ?? [];
}

// Plugin parsing functions
function parsePluginInfo(content: string): { name: string; author: string } | null {
  const decoded = Buffer.from(content, 'base64').toString('utf8');
  
  // Try [Info("Name","Author",...)] pattern
  const infoMatch = decoded.match(/\[Info\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
  if (infoMatch && infoMatch[1] && infoMatch[2]) {
    return { name: infoMatch[1], author: infoMatch[2] };
  }
  
  // Try class Name : RustPlugin pattern
  const classMatch = decoded.match(/class\s+(\w+)\s*:\s*(RustPlugin|CovalencePlugin)/);
  if (classMatch && classMatch[1]) {
    return { name: classMatch[1], author: "" }; // Will be filled with repo owner
  }
  
  return null;
}

async function mapItemToIndexedPlugin(item: GitHubCodeSearchItem, repoCache: Record<string, GitHubRepo>): Promise<IndexedPlugin> {
  const fullName = item.repository.full_name;
  const [owner, repo] = fullName.split("/");
  
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${fullName}`);
  }
  
  // Get or cache repo data
  let repoData = repoCache[fullName];
  if (!repoData) {
    repoData = await fetchRepo(fullName);
    repoCache[fullName] = repoData;
  }
  
  // Try to get file content for parsing
  let pluginName = path.basename(item.path).replace(/\.[^.]+$/, "");
  let pluginAuthor = repoData.owner.login;
  
  try {
    const fileContent = await fetchFileContent(owner, repo, item.path, item.sha);
    const parsed = parsePluginInfo(fileContent.content);
    if (parsed) {
      pluginName = parsed.name;
      pluginAuthor = parsed.author || repoData.owner.login;
    }
  } catch (err) {
    console.warn(`Failed to parse ${fullName}/${item.path}: ${(err as Error).message}`);
  }
  
  const rawUrl = `https://raw.githubusercontent.com/${fullName}/${repoData.default_branch}/${item.path}`;
  
  return {
    plugin_name: pluginName,
    plugin_author: pluginAuthor,
    language: "C#",
    file: {
      path: item.path,
      html_url: item.html_url,
      raw_url: rawUrl,
      sha: item.sha,
      size: item.size
    },
    repository: {
      full_name: repoData.full_name,
      name: repoData.name,
      html_url: repoData.html_url,
      description: repoData.description,
      owner_login: repoData.owner.login,
      owner_url: repoData.owner.html_url,
      default_branch: repoData.default_branch,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      open_issues_count: repoData.open_issues_count,
      created_at: repoData.created_at
    },
    indexed_at: new Date().toISOString()
  };
}

// State management
function loadState(): IndexerState | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw) as IndexerState;
  } catch {
    return null;
  }
}

function saveState(state: IndexerState): void {
  atomicWrite(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadExistingOutput(): Map<string, IndexedPlugin> {
  try {
    if (!fs.existsSync(OUT_FILE)) return new Map();
    const raw = fs.readFileSync(OUT_FILE, "utf8");
    const json = JSON.parse(raw) as { items?: IndexedPlugin[] };
    const map = new Map<string, IndexedPlugin>();
    for (const it of json.items ?? []) map.set(indexedKey(it), it);
    return map;
  } catch {
    return new Map();
  }
}

function writeUnifiedOutput(existingMap: Map<string, IndexedPlugin>, query: string): void {
  const allItems = Array.from(existingMap.values());
  allItems.sort((a, b) => {
    const aTs = new Date(a.indexed_at).getTime();
    const bTs = new Date(b.indexed_at).getTime();
    if (aTs !== bTs) return bTs - aTs;
    if (a.repository.full_name === b.repository.full_name) {
      return a.file.path.localeCompare(b.file.path);
    }
    return a.repository.full_name.localeCompare(b.repository.full_name);
  });
  const payload = {
    generated_at: new Date().toISOString(),
    query,
    count: allItems.length,
    items: allItems
  };
  atomicWrite(OUT_FILE, JSON.stringify(payload, null, 2));
}

// Main processing functions
async function runOnce(): Promise<void> {
  ensureDir(OUT_DIR);
  
  console.log(`Starting Oxide plugins indexer with query: ${SEARCH_QUERY}`);
  
  // Load or initialize state
  let state = loadState();
  if (!state || state.version !== "1.0") {
    state = {
      version: "1.0",
      currentVariant: 0,
      currentPage: 1,
      seenKeys: {},
      repoCache: {},
      lastFullScanAt: null,
      query: SEARCH_QUERY
    };
    saveState(state);
  }
  
  // Load existing output
  const existingMap = loadExistingOutput();
  console.log(`Loaded ${existingMap.size} existing entries`);
  
  let processedCount = 0;
  let newEntries = 0;
  let lastFlushedNewEntries = 0;
  
  // Process all search variants
  const variants = buildSearchVariants();
  
  for (let variantIndex = state.currentVariant; variantIndex < variants.length; variantIndex++) {
    const variant = variants[variantIndex];
    
    if (!variant) {
      console.error(`Variant at index ${variantIndex} is undefined`);
      continue;
    }
    
    if (variantIndex !== state.currentVariant) {
      state.currentVariant = variantIndex;
      state.currentPage = 1;
      saveState(state);
    }
    
    console.log(`Processing variant: ${variant.name}`);
    console.log(`  Query: ${variant.query}`);
    
    while (state.currentPage <= 10) { // GitHub limit: 10 pages
      console.log(`  Page ${state.currentPage}/10...`);
      
      try {
        // Check total count first
        const totalCount = await fetchSearchCount(variant.query);
        console.log(`  Total count: ${totalCount}`);
        
        if (totalCount === 0) {
          console.log(`  No results for ${variant.name}, moving to next variant`);
          break;
        }
        
        // Fetch the page
        const items = await fetchSearchPage(variant.query, state.currentPage);
        console.log(`  Found ${items.length} items`);
        
        if (items.length === 0) {
          console.log(`  No more items for ${variant.name}, moving to next variant`);
          break;
        }
        
        // Process items
        for (const item of items) {
          const key = itemKey(item);
          if (state.seenKeys[key]) {
            continue; // Already processed
          }
          
          try {
            const indexed = await mapItemToIndexedPlugin(item, state.repoCache);
            const indexedKeyStr = `${indexed.repository.full_name}#${indexed.file.path}#${indexed.file.sha}`;
            
            if (!existingMap.has(indexedKeyStr)) {
              existingMap.set(indexedKeyStr, indexed);
              newEntries++;
            }
            
            state.seenKeys[key] = true;
            processedCount++;
            
            // Periodic save only if there are new entries since last flush
            if (processedCount % 50 === 0 && newEntries > lastFlushedNewEntries) {
              writeUnifiedOutput(existingMap, SEARCH_QUERY);
              saveState(state);
              lastFlushedNewEntries = newEntries;
              console.log(`Saved progress (${newEntries} new so far)`);
            }
            
          } catch (err) {
            console.warn(`Failed to process ${item.repository.full_name}/${item.path}: ${(err as Error).message}`);
          }
          
          await sleep(200); // Gentle pacing
        }
        
        // Move to next page
        state.currentPage++;
        saveState(state);
        
        // If we got less than 100 items, we've reached the end
        if (items.length < 100) {
          console.log(`  Reached end of results for ${variant.name}`);
          break;
        }
        
        await sleep(1000); // Delay between pages
        
      } catch (err) {
        console.error(`Error processing ${variant.name} page ${state.currentPage}: ${(err as Error).message}`);
        // Put back in queue for retry
        break;
      }
    }
  }
  
  // Final save only if there are new entries in this run
  if (newEntries > lastFlushedNewEntries) {
    writeUnifiedOutput(existingMap, SEARCH_QUERY);
  }
  state.lastFullScanAt = new Date().toISOString();
  state.currentVariant = 0;
  state.currentPage = 1;
  state.seenKeys = {}; // Reset seen keys
  saveState(state);
  
  console.log(`Completed scan. Total: ${existingMap.size} entries, New: ${newEntries}`);
}

async function run(): Promise<void> {
  console.log("🚀 Starting Oxide Rust Plugins Indexer");
  
  // Initialize GitHub authentication
  try {
    GITHUB_TOKEN = await githubAppAuth.getAuthToken();
    const rateLimitInfo = githubAppAuth.getRateLimitInfo();
    console.log(`🔑 Authentication: ${rateLimitInfo.type} (${rateLimitInfo.limit} requests/hour)`);
  } catch (error) {
    console.error("❌ GitHub authentication failed:", error);
    process.exit(1);
  }
  
  console.log(`Query: ${SEARCH_QUERY}`);
  console.log(`Continuous mode: ${CONTINUOUS}`);
  if (CONTINUOUS) {
    console.log(`Cycle delay: ${formatDuration(CYCLE_DELAY_MS)}`);
  }
  console.log("");

  if (!CONTINUOUS) {
    await runOnce();
    return;
  }
  
  let cycle = 0;
  while (true) {
    cycle += 1;
    console.log(`\n=== Continuous cycle ${cycle} ===`);
    try {
      await runOnce();
    } catch (err) {
      console.error("Cycle error:", err);
    }
    console.log(`Sleeping ${formatDuration(CYCLE_DELAY_MS)} before next cycle...`);
    await sleep(CYCLE_DELAY_MS);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


