import type { IndexedPlugin } from '../types/plugin';

/**
 * Find the global index of a plugin in the original array
 * @param plugin - The plugin to find
 * @param allPlugins - The original array of all plugins
 * @returns The global index or -1 if not found
 */
export function findPluginGlobalIndex(plugin: IndexedPlugin, allPlugins: IndexedPlugin[]): number {
  return allPlugins.findIndex(p => 
    p.repository?.full_name === plugin.repository?.full_name && 
    p.file?.path === plugin.file?.path
  );
}

/**
 * Create a map from plugin to its global index for efficient lookups
 * @param allPlugins - The original array of all plugins
 * @returns A Map from plugin key to global index
 */
export function createPluginIndexMap(allPlugins: IndexedPlugin[]): Map<string, number> {
  const indexMap = new Map<string, number>();
  
  allPlugins.forEach((plugin, index) => {
    const key = `${plugin.repository?.full_name || 'unknown'}-${plugin.file?.path || 'unknown'}`;
    indexMap.set(key, index);
  });
  
  return indexMap;
}

/**
 * Get plugin key for lookup
 * @param plugin - The plugin
 * @returns A unique key for the plugin
 */
export function getPluginKey(plugin: IndexedPlugin): string {
  return `${plugin.repository?.full_name || 'unknown'}-${plugin.file?.path || 'unknown'}`;
}
