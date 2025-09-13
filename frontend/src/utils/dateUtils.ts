import type { IndexedPlugin } from '../types/plugin';

/**
 * Safely extracts timestamp from plugin based on mode
 */
export function getPluginTimestamp(plugin: IndexedPlugin, mode: 'updated' | 'created' | 'indexed'): number {
  try {
    let dateStr: string | undefined;
    
    if (mode === 'updated') {
      const commits = plugin.commits;
      if (commits && commits.latest) {
        dateStr = commits.latest.committed_at;
      } else {
        dateStr = plugin.indexed_at ?? plugin.repository.created_at ?? undefined;
      }
    } else if (mode === 'created') {
      // For 'created' mode, prioritize repository creation date, then first commit, then indexed date
      dateStr = plugin.repository.created_at ?? undefined;
      if (!dateStr) {
        const commits = plugin.commits;
        if (commits && commits.created) {
          dateStr = commits.created.committed_at;
        } else {
          dateStr = plugin.indexed_at ?? undefined;
        }
      }
    } else {
      // indexed
      dateStr = plugin.indexed_at ?? undefined;
      if (!dateStr) {
        const commits = plugin.commits;
        if (commits && commits.latest) {
          dateStr = commits.latest.committed_at;
        } else {
          dateStr = plugin.repository.created_at ?? undefined;
        }
      }
    }
    
    return dateStr ? new Date(dateStr).getTime() : 0;
  } catch {
    return 0;
  }
}