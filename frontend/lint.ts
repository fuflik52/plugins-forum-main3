#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

//
// Configuration interfaces
//
interface PriorityLevel {
  level: number;        // number, the smaller the higher priority
  name: string;         // level name, for example "Critical"
  rules: string[];      // list of ruleId, falling into this level
}

interface LinterConfig {
  priorityLevels: PriorityLevel[];
}

interface ESLintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  source: 'eslint';
}

interface TypeScriptMessage {
  code: string;
  severity: number;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  source: 'typescript';
  filePath: string;
}

type LintMessage = ESLintMessage | TypeScriptMessage;

//
// Parse command line arguments
//
const args = process.argv.slice(2);
const targetPath = args[0] || "."; // default to current directory

//
// Load configuration
//
const configPath = path.resolve(process.cwd(), "./linter.config.json");
const config: LinterConfig = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf8")) as LinterConfig
  : { priorityLevels: [] };

//
// Auto-fix ESLint issues
//
async function runESLintFix(targetPath: string): Promise<void> {
  console.log(`🔧 Running ESLint auto-fix on: ${targetPath}`);
  try {
    const { stdout } = await execAsync(`npx eslint "${targetPath}" --ext .ts,.tsx --fix`);
    console.log(`✅ ESLint auto-fix completed`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      console.log(`✅ ESLint auto-fix completed with warnings`);
    } else {
      console.error(`❌ ESLint auto-fix failed:`, error);
    }
  }
}

//
// TypeScript diagnostics runner
//
async function getTypeScriptDiagnostics(targetPath: string): Promise<TypeScriptMessage[]> {
  try {
    // Always use project-wide compilation to respect tsconfig.json settings
    const command = `npx tsc --noEmit --pretty false`;
    await execAsync(command);
    return []; // No errors if tsc succeeds
  } catch (error: unknown) {
    const messages: TypeScriptMessage[] = [];
    
    // TypeScript outputs errors to stdout, not stderr
    if (error && typeof error === 'object' && 'stdout' in error) {
      const stdout = (error as { stdout: string }).stdout;
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        // Parse TypeScript error format: "file.ts(line,col): error TS2554: message"
        const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)$/);
        if (match) {
          const [, filePath, lineStr, colStr, code, message] = match;
          messages.push({
            code: `TS${code}`,
            severity: 2, // TypeScript errors are always severity 2
            message: message,
            line: parseInt(lineStr),
            column: parseInt(colStr),
            source: 'typescript',
            filePath: filePath
          });
        }
      }
    }
    
    // Filter messages based on target path
    return filterMessagesByPath(messages, targetPath);
  }
}

//
// Filter messages by target path
//
function filterMessagesByPath(messages: TypeScriptMessage[], targetPath: string): TypeScriptMessage[] {
  // If targetPath is current directory, show all messages
  if (targetPath === ".") {
    return messages;
  }
  
  // If targetPath is a specific file, show only messages from that file
  if (targetPath.endsWith('.ts') || targetPath.endsWith('.tsx')) {
    const resolvedTarget = path.resolve(targetPath);
    return messages.filter(msg => {
      const resolvedFile = path.resolve(msg.filePath);
      return resolvedFile === resolvedTarget;
    });
  }
  
  // If targetPath is a directory, show only messages from files in that directory
  const resolvedTarget = path.resolve(targetPath);
  return messages.filter(msg => {
    const resolvedFile = path.resolve(msg.filePath);
    return resolvedFile.startsWith(resolvedTarget + path.sep) || resolvedFile.startsWith(resolvedTarget + '/');
  });
}

//
// Main logic
//
(async (): Promise<void> => {
  console.log(`🔍 Linting directory: ${targetPath}`);
  
  // First run ESLint fix
  await runESLintFix(targetPath);
  
  // Then run ESLint and TypeScript in parallel for remaining issues
  const [eslintResults, tsMessages] = await Promise.all([
    getESLintResults(targetPath),
    getTypeScriptDiagnostics(targetPath)
  ]);

  // Combine all messages
  const allMessages: Array<LintMessage & { filePath: string }> = [];
  
  // Add ESLint messages
  for (const result of eslintResults) {
    for (const message of result.messages) {
      allMessages.push({
        ...message,
        filePath: result.filePath,
        source: 'eslint' as const
      });
    }
  }
  
  // Add TypeScript messages
  for (const message of tsMessages) {
    allMessages.push({
      ...message,
      filePath: message.filePath,
      source: 'typescript' as const
    });
  }

  const hasErrors = processResults(allMessages);
  if (hasErrors) {
    process.exit(1);
  }

  async function getESLintResults(targetPath: string): Promise<Array<{
    filePath: string;
    messages: Array<{
      ruleId: string | null;
      severity: number;
      message: string;
      line: number;
      column: number;
      endLine?: number;
      endColumn?: number;
    }>;
  }>> {
    try {
      const { stdout } = await execAsync(`npx eslint "${targetPath}" --ext .ts,.tsx --format json`);
      return JSON.parse(stdout) as Array<{
        filePath: string;
        messages: Array<{
          ruleId: string | null;
          severity: number;
          message: string;
          line: number;
          column: number;
          endLine?: number;
          endColumn?: number;
        }>;
      }>;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;
        return JSON.parse(stdout) as Array<{
          filePath: string;
          messages: Array<{
            ruleId: string | null;
            severity: number;
            message: string;
            line: number;
            column: number;
            endLine?: number;
            endColumn?: number;
          }>;
        }>;
      }
      throw error;
    }
  }

  function processResults(messages: Array<LintMessage & { filePath: string }>): boolean {
    //
    // Prepare priority levels from config
    //
    const levels = config.priorityLevels
      .slice()
      .sort((a, b) => a.level - b.level);

    const getLevel = (message: LintMessage): number => {
      let ruleId: string | null = null;
      if (message.source === 'typescript') {
        ruleId = message.code;
      } else {
        ruleId = message.ruleId;
      }
      
      if (!ruleId) return Infinity;
      const lvl = levels.find(L => L.rules.includes(ruleId));
      return lvl ? lvl.level : Infinity;
    };

    //
    // Sort messages
    //
    messages.sort((a, b) => {
      if (b.severity - a.severity) return b.severity - a.severity;
      const la = getLevel(a), lb = getLevel(b);
      if (la !== lb) return la - lb;
      if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });

    //
    // Print results with highlighting
    //
    const printer = (msgs: Array<LintMessage & { filePath: string }>): void => {
      const cache = new Map<string, string[]>();
      for (const m of msgs.slice(0, 15)) {
        const { filePath, line, column, message, severity, source } = m;
        const sevLabel = severity === 2 ? "[ERROR]" : "[WARN ]";
        const ruleId = source === 'typescript' ? (m as TypeScriptMessage).code : (m as ESLintMessage).ruleId || 'unknown';
        const sourceLabel = source === 'typescript' ? '(TypeScript)' : '(ESLint)';
        
        console.log(`\n${sevLabel} ${filePath}:${line}:${column}  ${ruleId} ${sourceLabel} — ${message}`);

        if (!cache.has(filePath)) {
          try {
            cache.set(filePath, fs.readFileSync(filePath, "utf8").split("\n"));
          } catch {
            console.log("  (Could not read file for context)");
            continue;
          }
        }
        const lines = cache.get(filePath);
        if (!lines) continue;
        const start = Math.max(line - 3, 0);
        const end = Math.min(line + 2, lines.length);

        for (let i = start; i < end; i++) {
          const prefix = i === line - 1 ? ">" : " ";
          const num = String(i + 1).padStart(4);
          const currentLine = lines[i];
          const lineContent = ` ${prefix} ${num} | ${currentLine}`;
          console.log(lineContent);
          
          if (i === line - 1) {
            // Calculate highlighting
            const prefixLength = ` ${prefix} ${num} | `.length;
            const startCol = Math.max(0, column - 1); // column is 1-based
            
            let endCol: number;
            if ('endColumn' in m && m.endColumn) {
              endCol = Math.min(m.endColumn - 1, currentLine.length);
            } else if (source === 'typescript') {
              // For TypeScript errors, show exactly where TS points
              // But try to highlight a meaningful token if possible
              const charAtPos = currentLine[startCol];
              
              // Special case for "Expected X arguments" errors
              if (message.includes('Expected') && message.includes('arguments')) {
                // Try to find the position after the last comma in a function call
                const beforeCursor = currentLine.substring(0, startCol + 15); // Look ahead a bit
                const funcCallMatch = beforeCursor.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*$/);
                if (funcCallMatch) {
                  // Find the position after the last comma or opening parenthesis
                  const lastCommaPos = beforeCursor.lastIndexOf(',');
                  const openParenPos = beforeCursor.lastIndexOf('(');
                  const targetPos = Math.max(lastCommaPos, openParenPos);
                  if (targetPos !== -1) {
                    // Position cursor after the comma/paren and any whitespace
                    let newStartCol = targetPos + 1;
                    while (newStartCol < currentLine.length && /\s/.test(currentLine[newStartCol])) {
                      newStartCol++;
                    }
                    endCol = newStartCol + 1;
                  } else {
                    endCol = startCol + 1;
                  }
                } else {
                  endCol = startCol + 1;
                }
              } else if (charAtPos && /[a-zA-Z_$]/.test(charAtPos)) {
                // If it's the start of an identifier, highlight the whole identifier
                const remainingLine = currentLine.substring(startCol);
                const wordMatch = remainingLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
                if (wordMatch) {
                  endCol = Math.min(startCol + wordMatch[0].length, currentLine.length);
                } else {
                  endCol = startCol + 1;
                }
              } else {
                // For other cases (like missing arguments), show single character
                endCol = startCol + 1;
              }
            } else {
              endCol = startCol + 1;
            }
            
            // Create highlight line
            const beforeHighlight = " ".repeat(prefixLength + startCol);
            const highlightLength = Math.max(1, endCol - startCol);
            const highlight = "^".repeat(highlightLength);
            
            console.log(`${beforeHighlight}${highlight}`);
          }
        }
      }
    };

    // Group and print messages by priority levels
    let printed = false;
    for (const L of levels) {
      const group = messages.filter(m => {
        const ruleId = m.source === 'typescript' 
          ? (m as TypeScriptMessage).code 
          : (m as ESLintMessage).ruleId;
        return ruleId && L.rules.includes(ruleId);
      });
      
      if (group.length) {
        console.log(`\n=== Level ${L.level}: ${L.name} (${group.length} issues) ===`);
        printer(group);
        printed = true;
        break;
      }
    }

    const uncategorized = messages.filter(m => {
      const ruleId = m.source === 'typescript' 
        ? (m as TypeScriptMessage).code 
        : (m as ESLintMessage).ruleId;
      return !levels.some(L => ruleId && L.rules.includes(ruleId));
    });
    if (!printed && uncategorized.length) {
      console.log(`\n=== Critical Compiler Errors (${uncategorized.length} issues) ===`);
      printer(uncategorized);
    }

    const errorCount = messages.filter(m => m.severity === 2).length;
    const warningCount = messages.filter(m => m.severity === 1).length;
    const tsErrorCount = tsMessages.filter(m => m.severity === 2).length;
    const eslintErrorCount = errorCount - tsErrorCount;
    
    console.log(`\n📊 Total: ${errorCount} errors (${tsErrorCount} TypeScript, ${eslintErrorCount} ESLint), ${warningCount} warnings.`);
    
    // Return true if there are errors (severity === 2)
    return errorCount > 0;
  }
})().catch(console.error); 