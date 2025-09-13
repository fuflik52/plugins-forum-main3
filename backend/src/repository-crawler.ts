import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

type OxidePluginData = {
  generated_at: string;
  query: string;
  count: number;
  items: {
    plugin_name: string;
    language: string;
    file: {
      path: string;
      html_url: string;
      raw_url: string;
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
    };
  }[];
};

type FoundPlugin = {
  plugin_name: string;
  plugin_author: string;
  plugin_version: string | null;
  plugin_description: string | null;
  plugin_resource_id: string | null;
  language: string;
  file: {
    path: string;
    html_url: string;
    raw_url: string;
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
  };
};

type RepositoryCrawlResult = {
  repository: string;
  clone_url: string;
  plugins_found: FoundPlugin[];
  scanned_at: string;
  errors: string[];
};

type CrawlerState = {
  last_updated: string;
  total_repositories_processed: number;
  successful_crawls: number;
  failed_crawls: number;
  processed_repositories: {
    [repoName: string]: {
      last_crawled: string;
      plugins_count: number;
      success: boolean;
      errors: string[];
    };
  };
  latest_session_statistics?: CrawlStatistics;
};

type CrawlStatistics = {
  crawl_session: {
    started_at: string;
    completed_at: string;
    duration_ms: number;
  };
  repositories: {
    total_found: number;
    already_processed: number;
    newly_processed: number;
    successful: number;
    failed: number;
  };
  plugins: {
    total_found: number;
    new_plugins: number;
  };
};

class RepositoryCrawler {
  private tempDir: string;
  private outputDir: string;
  private stateFile: string;
  private state!: CrawlerState;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp_repos");
    this.outputDir = path.join(process.cwd(), "output");
    this.stateFile = path.join(this.outputDir, "crawler_state.json");
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    this.loadState();
  }

  private loadState(): void {
    if (fs.existsSync(this.stateFile)) {
      try {
        this.state = JSON.parse(fs.readFileSync(this.stateFile, "utf-8"));
        console.log(`Loaded state: ${Object.keys(this.state.processed_repositories).length} repositories already processed`);
      } catch (error) {
        console.warn("Failed to load state file, starting fresh:", error);
        this.initializeState();
      }
    } else {
      this.initializeState();
    }
  }

  private initializeState(): void {
    this.state = {
      last_updated: new Date().toISOString(),
      total_repositories_processed: 0,
      successful_crawls: 0,
      failed_crawls: 0,
      processed_repositories: {}
    };
  }

  private saveState(): void {
    this.state.last_updated = new Date().toISOString();
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  private updateGlobalState(successful: number, failed: number): void {
    this.state.total_repositories_processed = Object.keys(this.state.processed_repositories).length;
    this.state.successful_crawls = Object.values(this.state.processed_repositories).filter(r => r.success).length;
    this.state.failed_crawls = Object.values(this.state.processed_repositories).filter(r => !r.success).length;
  }

  private loadExistingOxideData(): { items: FoundPlugin[] } {
    const outputPath = path.join(this.outputDir, "crawled_plugins.json");
    if (fs.existsSync(outputPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
        return {
          items: existing.items || []
        };
      } catch (error) {
        console.warn("Failed to load existing oxide data:", error);
        return { items: [] };
      }
    }
    return { items: [] };
  }

  private printFinalStatistics(statistics: CrawlStatistics, duration: number): void {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 CRAWL COMPLETED!");
    console.log("=".repeat(60));
    console.log(`⏱️  Duration: ${this.formatDuration(duration)}`);
    console.log(`📁 Total repositories in source: ${statistics.repositories.total_found}`);
    console.log(`✅ Already processed: ${statistics.repositories.already_processed}`);
    console.log(`🆕 Newly processed: ${statistics.repositories.newly_processed}`);
    console.log(`   ├─ Successful: ${statistics.repositories.successful}`);
    console.log(`   └─ Failed: ${statistics.repositories.failed}`);
    console.log(`🔌 Total plugins found: ${statistics.plugins.total_found}`);
    
    if (statistics.repositories.newly_processed > 0) {
      const avgPluginsPerRepo = (statistics.plugins.total_found / statistics.repositories.successful || 0).toFixed(1);
      console.log(`📊 Average plugins per successful repo: ${avgPluginsPerRepo}`);
    }
    
    console.log(`\n📂 Results saved to: crawled_plugins.json`);
    console.log(`📊 Statistics saved to: crawler_state.json`);
    console.log("=".repeat(60));
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private saveIntermediateResults(currentResults: RepositoryCrawlResult[], sessionStarted: string): void {
    try {
      // Collect all plugins found so far
      const allFoundPlugins = currentResults.flatMap(r => r.plugins_found);
      
      // Load existing oxide-format data
      const outputPath = path.join(this.outputDir, "crawled_plugins.json");
      const existingOxideData = this.loadExistingOxideData();
      
      // Combine with existing plugins (avoid duplicates by checking file path + repo)
      const existingPluginKeys = new Set(
        existingOxideData.items.map(p => `${p.repository.full_name}#${p.file.path}`)
      );
      
      const newPlugins = allFoundPlugins.filter(p => 
        !existingPluginKeys.has(`${p.repository.full_name}#${p.file.path}`)
      );
      
      const allPlugins = [...existingOxideData.items, ...newPlugins];
      
      // Create statistics and save to state instead
      const statistics: CrawlStatistics = {
        crawl_session: {
          started_at: sessionStarted,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(sessionStarted).getTime()
        },
        repositories: {
          total_found: 0, // Will be updated at the end
          already_processed: Object.keys(this.state.processed_repositories).length - currentResults.length,
          newly_processed: currentResults.length,
          successful: currentResults.filter(r => r.plugins_found.length > 0 || r.errors.length === 0).length,
          failed: currentResults.filter(r => r.plugins_found.length === 0 && r.errors.length > 0).length
        },
        plugins: {
          total_found: allFoundPlugins.length,
          new_plugins: newPlugins.length
        }
      };
      
      // Update state with statistics
      this.state.latest_session_statistics = statistics;
      
      // Save in pure oxide_plugins.json format (no extra fields)
      const oxideFormatData = {
        generated_at: new Date().toISOString(),
        query: "Repository crawl - namespace Oxide.Plugins files found locally",
        count: allPlugins.length,
        items: allPlugins
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(oxideFormatData, null, 2));
    } catch (error) {
      console.warn(`Failed to save intermediate results: ${error}`);
    }
  }

  async crawlRepositories(): Promise<void> {
    const startTime = Date.now();
    const sessionStarted = new Date().toISOString();
    
    console.log("Starting repository crawl...");
    console.log(`Session started at: ${sessionStarted}`);
    
    const oxidePluginsPath = path.join(this.outputDir, "oxide_plugins.json");
    const manualReposPath = path.join(process.cwd(), "input", "manual-repositories.json");
    
    let uniqueRepositories: string[] = [];
    
    // Load repositories from oxide_plugins.json
    if (fs.existsSync(oxidePluginsPath)) {
      const oxideData: OxidePluginData = JSON.parse(
        fs.readFileSync(oxidePluginsPath, "utf-8")
      );
      uniqueRepositories = this.extractUniqueRepositories(oxideData);
      console.log(`Found ${uniqueRepositories.length} unique repositories in oxide_plugins.json`);
    } else {
      console.log("oxide_plugins.json not found, continuing without it");
    }
    
    // Load manual repositories
    if (fs.existsSync(manualReposPath)) {
      try {
        const manualRepos: string[] = JSON.parse(fs.readFileSync(manualReposPath, "utf-8"));
        const manualRepoNames = manualRepos.map(url => {
          const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
          return match ? match[1] : null;
        }).filter(Boolean) as string[];
        
        uniqueRepositories = [...uniqueRepositories, ...manualRepoNames];
        console.log(`Found ${manualRepoNames.length} manual repositories`);
      } catch (error) {
        console.warn("Failed to load manual repositories:", error);
      }
    }
    
    if (uniqueRepositories.length === 0) {
      console.error("No repositories found in oxide_plugins.json or manual-repositories.json!");
      return;
    }
    
    // Remove duplicates
    uniqueRepositories = [...new Set(uniqueRepositories)];
    console.log(`Total unique repositories: ${uniqueRepositories.length}`);

    // Filter out already processed repositories
    const newRepositories = uniqueRepositories.filter(repo => !this.state.processed_repositories[repo]);
    const alreadyProcessed = uniqueRepositories.length - newRepositories.length;
    
    console.log(`Already processed: ${alreadyProcessed} repositories`);
    console.log(`New repositories to process: ${newRepositories.length}`);

    if (newRepositories.length === 0) {
      console.log("All repositories have already been processed!");
      return;
    }

    const results: RepositoryCrawlResult[] = [];
    let successful = 0;
    let failed = 0;
    let totalPluginsFound = 0;
    
    for (let i = 0; i < newRepositories.length; i++) {
      const repo = newRepositories[i];
      
      if (!repo) {
        console.error(`Repository at index ${i} is undefined`);
        continue;
      }
      
      const progress = `[${i + 1}/${newRepositories.length}]`;
      console.log(`\n${progress} Processing: ${repo}`);
      
      // Mark repository as "in progress" immediately to prevent re-processing
      this.state.processed_repositories[repo] = {
        last_crawled: new Date().toISOString(),
        plugins_count: 0,
        success: false,
        errors: ["Processing in progress..."]
      };
      this.updateGlobalState(successful, failed);
      this.saveState();
      
      try {
        const result = await this.crawlSingleRepository(repo);
        results.push(result);
        successful++;
        totalPluginsFound += result.plugins_found.length;
        
        // Update state
        this.state.processed_repositories[repo] = {
          last_crawled: result.scanned_at,
          plugins_count: result.plugins_found.length,
          success: true,
          errors: result.errors
        };
        
        console.log(`  ✅ Success! Found ${result.plugins_found.length} plugins`);
        if (result.errors.length > 0) {
          console.log(`  ⚠️  Warnings: ${result.errors.length}`);
        }
      } catch (error) {
        failed++;
        const errorResult: RepositoryCrawlResult = {
          repository: repo,
          clone_url: `https://github.com/${repo}.git`,
          plugins_found: [],
          scanned_at: new Date().toISOString(),
          errors: [`Failed to crawl: ${error}`]
        };
        results.push(errorResult);
        
        // Update state
        this.state.processed_repositories[repo] = {
          last_crawled: errorResult.scanned_at,
          plugins_count: 0,
          success: false,
          errors: errorResult.errors
        };
        
        console.error(`  ❌ Failed: ${error}`);
      }
      
      // Clean up after each repo and save both state and results
      this.cleanupRepository(repo);
      this.updateGlobalState(successful, failed);
      this.saveState();
      
      // Save results after each repository to keep them synced with state
      this.saveIntermediateResults(results.slice(0), sessionStarted);
      
      // Progress update every 10 repos
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${newRepositories.length} (${Math.round(((i + 1)/newRepositories.length)*100)}%)`);
        console.log(`   Success: ${successful}, Failed: ${failed}, Plugins found: ${totalPluginsFound}`);
        console.log(`   💾 Results and state synced (${results.length} repositories processed)`);
      }
    }

    const endTime = Date.now();
    const sessionCompleted = new Date().toISOString();
    const duration = endTime - startTime;

    // Create statistics
    const statistics: CrawlStatistics = {
      crawl_session: {
        started_at: sessionStarted,
        completed_at: sessionCompleted,
        duration_ms: duration
      },
      repositories: {
        total_found: uniqueRepositories.length,
        already_processed: alreadyProcessed,
        newly_processed: newRepositories.length,
        successful: successful,
        failed: failed
      },
      plugins: {
        total_found: totalPluginsFound,
        new_plugins: totalPluginsFound
      }
    };

    // Final save is already handled by saveIntermediateResults
    // Just update state with final statistics
    this.state.latest_session_statistics = statistics;

    this.printFinalStatistics(statistics, duration);
  }

  private extractUniqueRepositories(oxideData: OxidePluginData): string[] {
    const repositorySet = new Set<string>();
    
    oxideData.items.forEach(item => {
      repositorySet.add(item.repository.full_name);
    });

    return Array.from(repositorySet);
  }

  private getRepositoryInfo(repoFullName: string): any {
    try {
      const oxidePluginsPath = path.join(this.outputDir, "oxide_plugins.json");
      const oxideData: OxidePluginData = JSON.parse(fs.readFileSync(oxidePluginsPath, "utf-8"));
      
      const repoItem = oxideData.items.find(item => item.repository.full_name === repoFullName);
      if (repoItem) {
        return repoItem.repository;
      }
      
      // Fallback if not found
      const [owner, name] = repoFullName.split('/');
      return {
        full_name: repoFullName,
        name: name,
        html_url: `https://github.com/${repoFullName}`,
        description: null,
        owner_login: owner,
        owner_url: `https://github.com/${owner}`,
        default_branch: "main",
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0
      };
    } catch (error) {
      // Fallback repository info
      const [owner, name] = repoFullName.split('/');
      return {
        full_name: repoFullName,
        name: name,
        html_url: `https://github.com/${repoFullName}`,
        description: null,
        owner_login: owner,
        owner_url: `https://github.com/${owner}`,
        default_branch: "main",
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0
      };
    }
  }

  private async crawlSingleRepository(repoFullName: string): Promise<RepositoryCrawlResult> {
    const cloneUrl = `https://github.com/${repoFullName}.git`;
    const repoDir = path.join(this.tempDir, repoFullName.replace("/", "_"));
    const errors: string[] = [];

    try {
      // Clone repository
      console.log(`  Cloning ${repoFullName}...`);
      execSync(`git clone --depth 1 "${cloneUrl}" "${repoDir}"`, {
        stdio: "pipe"
      });
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }

    // Get repository info from original oxide_plugins.json
    const repoInfo = this.getRepositoryInfo(repoFullName);

    // Find all .cs files with Oxide.Plugins namespace
    const plugins = this.findOxidePlugins(repoDir, repoFullName, repoInfo, errors);

    return {
      repository: repoFullName,
      clone_url: cloneUrl,
      plugins_found: plugins,
      scanned_at: new Date().toISOString(),
      errors
    };
  }

  private findOxidePlugins(repoDir: string, repoFullName: string, repoInfo: any, errors: string[]): FoundPlugin[] {
    const plugins: FoundPlugin[] = [];
    
    try {
      this.scanDirectory(repoDir, repoDir, repoFullName, repoInfo, plugins, errors);
    } catch (error) {
      errors.push(`Error scanning directory: ${error}`);
    }

    return plugins;
  }

  private scanDirectory(
    currentDir: string,
    repoRoot: string,
    repoFullName: string,
    repoInfo: any,
    plugins: FoundPlugin[],
    errors: string[]
  ): void {
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);

        if (item.isDirectory()) {
          // Skip common directories that won't contain plugins
          if (this.shouldSkipDirectory(item.name)) {
            continue;
          }
          
          // Recursively scan subdirectories
          this.scanDirectory(fullPath, repoRoot, repoFullName, repoInfo, plugins, errors);
        } else if (item.isFile() && item.name.endsWith(".cs")) {
          // Scan C# files
          try {
            const plugin = this.analyzeCSFile(fullPath, repoRoot, repoFullName, repoInfo);
            if (plugin) {
              plugins.push(plugin);
            }
          } catch (error) {
            errors.push(`Error analyzing ${fullPath}: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Error reading directory ${currentDir}: ${error}`);
    }
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      ".git", ".vs", ".vscode", "bin", "obj", "packages", 
      "node_modules", ".nuget", "TestResults", ".idea"
    ];
    return skipDirs.includes(dirName) || dirName.startsWith(".");
  }

  private parsePluginMetadata(content: string): {
    name: string | null;
    author: string | null;
    version: string | null;
    resourceId: string | null;
    description: string | null;
    className: string | null;
  } {
    let name: string | null = null;
    let author: string | null = null;
    let version: string | null = null;
    let resourceId: string | null = null;

    // Method 1: Try to parse named parameters format
    // [Info(Title: "Name", Author: "Author", Version: "1.0.0", ResourceId = 123)]
    const namedParamsMatch = content.match(/\[Info\s*\([^)]*\)\]/i);
    if (namedParamsMatch) {
      const infoContent = namedParamsMatch[0];
      
      // Extract named parameters
      name = this.extractNamedParam(infoContent, ['Title', 'Name']);
      author = this.extractNamedParam(infoContent, ['Author']);
      version = this.extractNamedParam(infoContent, ['Version']);
      resourceId = this.extractNamedParam(infoContent, ['ResourceId', 'Resource']);
    }
    
    // Method 2: Try positional parameters if named parsing didn't work
    if (!name) {
      // Flexible regex for positional parameters with quotes or without
      const positionalRegex = /\[Info\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^,\s)]+))\s*(?:,\s*(?:"([^"]*)"|'([^']*)'|([^,\s)]+)))?\s*(?:,\s*(?:"([^"]*)"|'([^']*)'|([^,\s)]+)))?\s*(?:,\s*(?:"([^"]*)"|'([^']*)'|([^,\s)]+)))?\s*\)/i;
      const positionalMatch = content.match(positionalRegex);
      
      if (positionalMatch) {
        name = positionalMatch[1] || positionalMatch[2] || positionalMatch[3] || null;
        author = positionalMatch[4] || positionalMatch[5] || positionalMatch[6] || null;
        version = positionalMatch[7] || positionalMatch[8] || positionalMatch[9] || null;
        resourceId = positionalMatch[10] || positionalMatch[11] || positionalMatch[12] || null;
      }
    }

    // Try to parse [Description("...")] attribute (multiline support)
    const descriptionMatch = content.match(/\[Description\s*\(\s*(?:"([^"]*)"|'([^']*)')\s*\)\]/s);
    const description = descriptionMatch?.[1] || descriptionMatch?.[2] || null;
    
    // Try to find class name (support inheritance and partial classes)
    const classMatch = content.match(/public\s+(?:partial\s+)?class\s+(\w+)(?:\s*:\s*[\w\s,]+)?/);
    const className = classMatch?.[1] || null;
    
    // Additional patterns for plugin info in comments
    const commentInfoMatch = content.match(/\/\*\*?\s*Plugin:\s*([^,\n]+)(?:,\s*Author:\s*([^,\n]+))?(?:,\s*Version:\s*([^,\n]+))?(?:,\s*Resource:\s*([^\n]+))?\s*\*\*?\//);
    
    // Use comment info as fallback
    if (!name) name = commentInfoMatch?.[1] || null;
    if (!author) author = commentInfoMatch?.[2] || null;
    if (!version) version = commentInfoMatch?.[3] || null;
    if (!resourceId) resourceId = commentInfoMatch?.[4] || null;
    
    // Clean and validate all extracted values
    return {
      name: this.cleanString(name),
      author: this.cleanString(author),
      version: this.cleanString(version),
      resourceId: this.cleanString(resourceId),
      description: this.cleanString(description),
      className: className
    };
  }

  private extractNamedParam(infoContent: string, paramNames: string[]): string | null {
    for (const paramName of paramNames) {
      // Try different formats: ParamName: "value", ParamName = "value", ParamName="value"
      const patterns = [
        new RegExp(`${paramName}\\s*:\\s*(?:"([^"]*)"|'([^']*)'|([^,\\s)]+))`, 'i'),
        new RegExp(`${paramName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^,\\s)]+))`, 'i'),
        new RegExp(`${paramName}\\s*(?::|=)\\s*(?:"([^"]*)"|'([^']*)'|([^,\\s)]+))`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = infoContent.match(pattern);
        if (match) {
          return match[1] || match[2] || match[3] || null;
        }
      }
    }
    return null;
  }

  private cleanString(value: string | null): string | null {
    if (!value) return null;
    
    const cleaned = value.trim();
    
    // Handle empty strings, common junk values
    if (cleaned === '' || 
        cleaned === '0' || 
        cleaned === 'null' || 
        cleaned === 'undefined' ||
        cleaned === ')' ||
        cleaned === '(' ||
        cleaned.length === 0) {
      return null;
    }
    
    return cleaned;
  }

  private analyzeCSFile(filePath: string, repoRoot: string, repoFullName: string, repoInfo: any): FoundPlugin | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      
      // Check if file contains Oxide.Plugins namespace
      if (!content.includes("namespace Oxide.Plugins")) {
        return null;
      }

      // Parse plugin metadata using new function
      const metadata = this.parsePluginMetadata(content);
      
      const relativePath = path.relative(repoRoot, filePath);
      const fileName = path.basename(filePath, ".cs");
      
      // Determine plugin name (priority: Info attribute, class name, file name)
      let pluginName = metadata.name || metadata.className || fileName;
      
      // Determine author (priority: Info attribute, repository owner)
      let pluginAuthor = metadata.author || repoInfo.owner_login;

      // Create plugin in enhanced format
      return {
        plugin_name: pluginName,
        plugin_author: pluginAuthor,
        plugin_version: metadata.version,
        plugin_description: metadata.description,
        plugin_resource_id: metadata.resourceId,
        language: "C#",
        file: {
          path: relativePath.replace(/\\/g, "/"), // Normalize path separators
          html_url: `${repoInfo.html_url}/blob/${repoInfo.default_branch}/${relativePath.replace(/\\/g, "/")}`,
          raw_url: `https://raw.githubusercontent.com/${repoFullName}/${repoInfo.default_branch}/${relativePath.replace(/\\/g, "/")}`
        },
        repository: {
          full_name: repoInfo.full_name,
          name: repoInfo.name,
          html_url: repoInfo.html_url,
          description: repoInfo.description,
          owner_login: repoInfo.owner_login,
          owner_url: repoInfo.owner_url,
          default_branch: repoInfo.default_branch,
          stargazers_count: repoInfo.stargazers_count,
          forks_count: repoInfo.forks_count,
          open_issues_count: repoInfo.open_issues_count
        }
      };
    } catch (error) {
      throw new Error(`Failed to read or analyze file: ${error}`);
    }
  }

  private cleanupRepository(repoFullName: string): void {
    const repoDir = path.join(this.tempDir, repoFullName.replace("/", "_"));
    
    try {
      if (fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Failed to cleanup ${repoDir}:`, error);
    }
  }

  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn("Failed to cleanup temp directory:", error);
    }
  }
}

// Main execution
async function main() {
  const crawler = new RepositoryCrawler();
  
  // Handle cleanup on exit
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT, cleaning up...");
    crawler.cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM, cleaning up...");
    crawler.cleanup();
    process.exit(0);
  });

  try {
    await crawler.crawlRepositories();
  } catch (error) {
    console.error("Crawl failed:", error);
  } finally {
    crawler.cleanup();
  }
}

// ES module entry point check
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module being executed
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RepositoryCrawler, type FoundPlugin, type RepositoryCrawlResult };