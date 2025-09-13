import HooksLoader from './hooksLoader';

export interface PluginAnalysis {
  commands: {
    chatCommands: string[];
    consoleCommands: string[];
  };
  permissions: {
    registered: string[];
    constants: string[];
    checks: string[];
  };
  hooks: {
    oxideHooks: string[];
    customHooks: string[];
  };
  dependencies: {
    pluginReferences: string[];
    dynamicLoads: string[];
  };
  config: {
    configKeys: string[];
    hasDefaultConfig: boolean;
  };
  info: {
    pluginInfo?: {
      name?: string;
      author?: string;
      version?: string;
      resourceId?: string;
    };
    description?: string;
  };
}

export class PluginAnalyzer {
  static async analyzePlugin(code: string): Promise<PluginAnalysis> {
    const analysis: PluginAnalysis = {
      commands: {
        chatCommands: [],
        consoleCommands: [],
      },
      permissions: {
        registered: [],
        constants: [],
        checks: [],
      },
      hooks: {
        oxideHooks: [],
        customHooks: [],
      },
      dependencies: {
        pluginReferences: [],
        dynamicLoads: [],
      },
      config: {
        configKeys: [],
        hasDefaultConfig: false,
      },
      info: {},
    };

    // Analyze chat commands
    const chatCommandRegex = /\[ChatCommand\("([^"]+)"\)\]/g;
    let match;
    while ((match = chatCommandRegex.exec(code)) !== null) {
      analysis.commands.chatCommands.push(match[1]);
    }

    // Analyze console commands
    const consoleCommandRegex = /\[ConsoleCommand\("([^"]+)"\)\]/g;
    while ((match = consoleCommandRegex.exec(code)) !== null) {
      analysis.commands.consoleCommands.push(match[1]);
    }

    // Analyze permission registrations
    const permissionRegisterRegex =
      /permission\.RegisterPermission\("([^"]+)"/g;
    while ((match = permissionRegisterRegex.exec(code)) !== null) {
      analysis.permissions.registered.push(match[1]);
    }

    // Analyze permission constants
    const permissionConstRegex =
      /(?:const|static)\s+string\s+\w*[Pp]ermission\w*\s*=\s*"([^"]+)"/g;
    while ((match = permissionConstRegex.exec(code)) !== null) {
      analysis.permissions.constants.push(match[1]);
    }

    // Analyze permission checks
    const permissionCheckRegex =
      /permission\.UserHasPermission\([^,]+,\s*"([^"]+)"/g;
    while ((match = permissionCheckRegex.exec(code)) !== null) {
      if (!analysis.permissions.checks.includes(match[1])) {
        analysis.permissions.checks.push(match[1]);
      }
    }

    // Analyze Oxide hooks using hooks from JSON
    try {
      const allHooks = await HooksLoader.getHookNames();

      allHooks.forEach((hook) => {
        const hookRegex = new RegExp(`\\b${hook}\\s*\\(`, "g");
        if (hookRegex.test(code) && !analysis.hooks.oxideHooks.includes(hook)) {
          analysis.hooks.oxideHooks.push(hook);
        }
      });
    } catch (error) {
      console.warn('Could not load hooks from GitHub, using fallback detection');
      // Fallback to basic hook detection if GitHub is not accessible
    }

    // Analyze plugin references
    const pluginRefRegex = /\[PluginReference\]\s*(?:Plugin\s+)?(\w+)/g;
    while ((match = pluginRefRegex.exec(code)) !== null) {
      analysis.dependencies.pluginReferences.push(match[1]);
    }

    // Analyze plugin references with string names
    const pluginRefStringRegex = /\[PluginReference\("([^"]+)"\)\]/g;
    while ((match = pluginRefStringRegex.exec(code)) !== null) {
      analysis.dependencies.pluginReferences.push(match[1]);
    }

    // Analyze dynamic plugin loading
    const dynamicLoadRegex = /plugins\.Find\("([^"]+)"\)/g;
    while ((match = dynamicLoadRegex.exec(code)) !== null) {
      analysis.dependencies.dynamicLoads.push(match[1]);
    }

    // Analyze config keys
    const configKeyRegex = /Config\["([^"]+)"\]/g;
    while ((match = configKeyRegex.exec(code)) !== null) {
      if (!analysis.config.configKeys.includes(match[1])) {
        analysis.config.configKeys.push(match[1]);
      }
    }

    // Check for default config
    analysis.config.hasDefaultConfig =
      /LoadDefaultConfig|CreateDefaultConfig/.test(code);

    // Analyze plugin info attribute
    const infoRegex =
      /\[Info\("([^"]*)",\s*"([^"]*)",\s*"([^"]*)"(?:,\s*ResourceId\s*=\s*(\d+))?\)\]/;
    const infoMatch = infoRegex.exec(code);
    if (infoMatch) {
      analysis.info.pluginInfo = {
        name: infoMatch[1],
        author: infoMatch[2],
        version: infoMatch[3],
        resourceId: infoMatch[4] || undefined,
      };
    }

    // Try to extract description from comments
    const descriptionRegex = /\/\/\s*(.{20,200})/;
    const descMatch = descriptionRegex.exec(code);
    if (
      descMatch &&
      !descMatch[1].includes("TODO") &&
      !descMatch[1].includes("FIXME")
    ) {
      analysis.info.description = descMatch[1].trim();
    }

    return analysis;
  }

  static getAnalysisStats(analysis: PluginAnalysis): {
    totalCommands: number;
    totalPermissions: number;
    totalHooks: number;
    totalDependencies: number;
    hasConfig: boolean;
  } {
    return {
      totalCommands:
        analysis.commands.chatCommands.length +
        analysis.commands.consoleCommands.length,
      totalPermissions: analysis.permissions.registered.length,
      totalHooks: analysis.hooks.oxideHooks.length,
      totalDependencies:
        analysis.dependencies.pluginReferences.length +
        analysis.dependencies.dynamicLoads.length,
      hasConfig:
        analysis.config.hasDefaultConfig ||
        analysis.config.configKeys.length > 0,
    };
  }
}
