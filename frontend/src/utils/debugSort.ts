import type { IndexedPlugin } from '../types/plugin';
import { getPluginTimestamp } from './dateUtils';

export function debugSortOrder(plugins: IndexedPlugin[]): void {
  console.log('=== DEBUG SORT ORDER ===');
  
  plugins.slice(0, 10).forEach((plugin, index) => {
    const createdTimestamp = getPluginTimestamp(plugin, 'created');
    const createdDate = new Date(createdTimestamp);
    
    console.log(`${index + 1}. ${plugin.plugin_name || 'Unnamed'}`);
    console.log(`   Repository: ${plugin.repository.full_name}`);
    console.log(`   Created: ${createdDate.toISOString()} (${createdTimestamp})`);
    console.log(`   Repo created_at: ${plugin.repository.created_at}`);
    console.log(`   Indexed_at: ${plugin.indexed_at}`);
    // console.log(`   Commits.created: ${plugin.commits?.created?.committed_at || 'N/A'}`);
    console.log('---');
  });
}