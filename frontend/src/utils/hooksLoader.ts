interface HookData {
  HookSignature: string;
  MethodSignature: string;
  MethodSourseCode: string;
  ClassName: string;
  HookLineInvoke: number;
}

class HooksLoader {
  private static hooksCache: HookData[] | null = null;
  private static readonly HOOKS_URL = 'https://raw.githubusercontent.com/publicrust/rust-template/refs/heads/main/.rust-analyzer/hooks.json';
  
  static async loadHooks(): Promise<HookData[]> {
    if (this.hooksCache) {
      return this.hooksCache;
    }
    
    try {
      const response = await fetch(this.HOOKS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch hooks: ${response.status}`);
      }
      
      const hooks = await response.json() as HookData[];
      this.hooksCache = hooks;
      return hooks;
    } catch (error) {
      console.error('Error loading hooks from GitHub:', error);
      // Fallback to empty array if GitHub is not accessible
      return [];
    }
  }
  
  static async getHookNames(): Promise<string[]> {
    const hooks = await this.loadHooks();
    return hooks.map(hook => {
      const match = hook.HookSignature.match(/^(\w+)\(/);
      return match ? match[1] : hook.HookSignature;
    });
  }
  
  static async getHookByName(name: string): Promise<HookData | undefined> {
    const hooks = await this.loadHooks();
    return hooks.find(hook => {
      const match = hook.HookSignature.match(/^(\w+)\(/);
      const hookName = match ? match[1] : hook.HookSignature;
      return hookName === name;
    });
  }
  
  static async getAllHooks(): Promise<HookData[]> {
    return this.loadHooks();
  }
  
  static async searchHooks(query: string): Promise<HookData[]> {
    const hooks = await this.loadHooks();
    const lowerQuery = query.toLowerCase();
    return hooks.filter(hook => {
      const hookName = hook.HookSignature.match(/^(\w+)\(/)?.[1] || hook.HookSignature;
      return hookName.toLowerCase().includes(lowerQuery) ||
             hook.MethodSignature.toLowerCase().includes(lowerQuery) ||
             hook.ClassName.toLowerCase().includes(lowerQuery);
    });
  }
  
  // Clear cache to force reload (useful for testing or manual refresh)
  static clearCache(): void {
    this.hooksCache = null;
  }
}

export default HooksLoader;
export type { HookData };