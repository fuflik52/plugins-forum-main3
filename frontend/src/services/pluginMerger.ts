import type { PluginIndex, IndexedPlugin } from '../types/plugin';

export class PluginMerger {
  static mergePluginSources(oxidePlugins: PluginIndex, crawledPlugins: PluginIndex): PluginIndex {
    const mergedPluginsMap = new Map<string, IndexedPlugin>();
    
    // First, add all oxide plugins to the map using raw_url as key
    oxidePlugins.items.forEach(plugin => {
      const key = plugin.file.raw_url;
      mergedPluginsMap.set(key, plugin);
    });
    
    // Then, merge or add crawled plugins
    crawledPlugins.items.forEach(crawledPlugin => {
      const key = crawledPlugin.file.raw_url;
      const existingPlugin = mergedPluginsMap.get(key);
      
      if (existingPlugin) {
        // Merge: add additional metadata from crawled plugin to existing one
        const mergedPlugin: IndexedPlugin = {
          ...existingPlugin,
          // Preserve crawler metadata if it provides more information
          plugin_author: crawledPlugin.plugin_author || existingPlugin.plugin_author,
          plugin_version: crawledPlugin.plugin_version || existingPlugin.plugin_version,
          plugin_description: crawledPlugin.plugin_description || existingPlugin.plugin_description,
          plugin_resource_id: crawledPlugin.plugin_resource_id || existingPlugin.plugin_resource_id,
          // Use the most recent data source for other fields if available
          plugin_name: crawledPlugin.plugin_name || existingPlugin.plugin_name,
        };
        mergedPluginsMap.set(key, mergedPlugin);
      } else {
        // Add new plugin from crawled source
        mergedPluginsMap.set(key, crawledPlugin);
      }
    });
    
    const mergedItems = Array.from(mergedPluginsMap.values());
    
    return {
      generated_at: new Date().toISOString(),
      query: `Merged from oxide_plugins.json (${oxidePlugins.count}) and crawled_plugins.json (${crawledPlugins.count})`,
      count: mergedItems.length,
      items: mergedItems
    };
  }
  
  static removeDuplicatesByUrl(plugins: IndexedPlugin[]): IndexedPlugin[] {
    const seenUrls = new Set<string>();
    const uniquePlugins: IndexedPlugin[] = [];
    
    plugins.forEach(plugin => {
      const url = plugin.file.raw_url;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        uniquePlugins.push(plugin);
      }
    });
    
    return uniquePlugins;
  }
}