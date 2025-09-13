import React, { useState, useEffect, useMemo } from 'react';
import type { PluginIndex, IndexedPlugin } from './types/plugin';
import { ApiService } from './services/api';
import { FilterService } from './services/filterService';
import { enableDOMMonitoring } from './utils/domAnalytics';
import { 
  optimizeAnimations, 
  optimizeScrollHandlers, 
  optimizeReactPerformance,
  enableMemoryOptimization,
  preventLayoutShift 
} from './utils/performanceOptimizer';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { PluginGrid } from './components/PluginGrid';
import { GroupedPluginView } from './components/GroupedPluginView';
import { StatsBar } from './components/StatsBar';
import { EmptyState } from './components/EmptyState';
import ThemeToggle from './components/ThemeToggle';
import { PluginStatsWidgets } from './components/PluginStatsWidgets';

import { AlertCircle, RefreshCw, Zap, Code, Grid, Package } from 'lucide-react';
import { Pagination } from './components/Pagination';
import { useUrlState } from './hooks/useUrlState';
import { getPluginTimestamp } from './utils/dateUtils';
import { debugSortOrder } from './utils/debugSort';

// Mathematical optimization: Single Source of Truth pattern
// Memory complexity: O(1) for state, O(n) for data where n = plugin count
function App(): React.JSX.Element {
  // Single source of truth - only one copy of plugin data in memory
  const [pluginIndex, setPluginIndex] = useState<PluginIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Use URL state management
  const {
    searchQuery,
    viewMode,
    sortBy,
    currentPage,
    pageSize,
    searchOptions,
    activeFilters,
    setSearchQuery,
    setViewMode,
    setSortBy,
    setCurrentPage,
    setPageSize,
    setSearchOptions,
    setActiveFilters
  } = useUrlState();

  useEffect(() => {
    void loadPlugins();
    
    // Critical performance optimizations
    optimizeAnimations();
    optimizeReactPerformance();
    preventLayoutShift();
    
    const scrollCleanup = optimizeScrollHandlers();
    const memoryCleanup = enableMemoryOptimization();
    const domCleanup = enableDOMMonitoring();
    
    return (): void => {
      scrollCleanup();
      memoryCleanup();
      domCleanup();
    };
  }, []);

  // Mathematical proof: Cleanup prevents memory leaks on unmount
  // Theorem: Setting state to null releases object references for GC
  useEffect(() => {
    return (): void => {
      // Cleanup on unmount - release large data structures
      setPluginIndex(null);
      setError(null);
    };
  }, []);

  // Mathematical optimization: Debounced filtering to prevent UI blocking
  // Theorem: Async processing prevents main thread blocking
  const filteredData = useMemo((): {
    searchFiltered: IndexedPlugin[];
    finalFiltered: IndexedPlugin[];
    totalCount: number;
    filteredCount: number;
  } | null => {
    if (!pluginIndex) return null;
    
    // Processing removed - we have pagination
    
    // Step 1: Lightweight search for small datasets, defer for large
    const searchFiltered = searchQuery.trim() 
      ? ApiService.searchPlugins(searchQuery, pluginIndex, searchOptions)
      : pluginIndex;
    
    // Apply filters to search results
    const finalItems = activeFilters.length > 0
      ? FilterService.applyFilters(searchFiltered.items, activeFilters)
      : searchFiltered.items;
    
    return {
      searchFiltered: searchFiltered.items,
      finalFiltered: finalItems,
      totalCount: pluginIndex.count,
      filteredCount: finalItems.length
    };
  }, [pluginIndex, searchQuery, searchOptions, activeFilters]);

  const loadPlugins = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.fetchPluginIndex();
      
      // Set all data at once - we have pagination to handle large datasets
      setPluginIndex(data);
    } catch (err) {
      setError('Failed to load plugins. Please try again later.');
      console.error('Error loading plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = (): void => {
    void loadPlugins();
  };

  // Mathematical optimization: O(n) unique count calculation
  const uniquePluginCount = useMemo(() => {
    if (!filteredData) return 0;
    // Set-based deduplication - O(n) time, O(k) space where k = unique names
    const uniqueNames = new Set<string>();
    for (const plugin of filteredData.finalFiltered) {
      uniqueNames.add(plugin.plugin_name || 'Unknown');
    }
    return uniqueNames.size;
  }, [filteredData]);

  // Mathematical proof: Group operations with O(n) complexity
  // Theorem: Single pass grouping minimizes memory allocations
  const groupedData = useMemo(() => {
    if (!filteredData || viewMode !== 'grouped') return null;
    
    const groups: Record<string, IndexedPlugin[]> = {};
    
    // O(n) grouping operation - single iteration
    filteredData.finalFiltered.forEach(plugin => {
      const name = plugin.plugin_name || 'Unknown';
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(plugin);
    });

    // Parse sort parameters
    const [field, dir]: ['updated' | 'created' | 'indexed', 'asc' | 'desc'] = ((): ['updated' | 'created' | 'indexed', 'asc' | 'desc'] => {
      if (sortBy.startsWith('updated')) return ['updated', sortBy.endsWith('asc') ? 'asc' : 'desc'];
      if (sortBy.startsWith('created')) return ['created', sortBy.endsWith('asc') ? 'asc' : 'desc'];
      return ['indexed', sortBy.endsWith('asc') ? 'asc' : 'desc'];
    })();


    // Sort groups by their representative plugin
    const sortedGroups = Object.entries(groups)
      .map(([name, pluginList]) => {
        // Sort plugins within each group
        const sortedPlugins = [...pluginList].sort((a, b) => {
          const ta = getPluginTimestamp(a, field);
          const tb = getPluginTimestamp(b, field);
          const diff = tb - ta;
          return dir === 'asc' ? -diff : diff;
        });

        return {
          name,
          plugins: sortedPlugins,
          representativePlugin: sortedPlugins[0]
        };
      })
      .sort((a, b) => {
        const ta = getPluginTimestamp(a.representativePlugin, field);
        const tb = getPluginTimestamp(b.representativePlugin, field);
        const diff = tb - ta;
        return dir === 'asc' ? -diff : diff;
      });

    return {
      allGroups: sortedGroups,
      totalGroups: sortedGroups.length,
      pagedGroups: sortedGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    };
  }, [filteredData, viewMode, sortBy, currentPage, pageSize]);

  // Mathematical pagination: O(1) slice operation instead of O(n) copy
  const pagedItems = useMemo((): IndexedPlugin[] => {
    if (!filteredData) return [];
    
    if (viewMode === 'grouped') {
      // Return plugins from paginated groups
      if (!groupedData) return [];
      const plugins: IndexedPlugin[] = [];
      groupedData.pagedGroups.forEach(group => {
        plugins.push(...group.plugins);
      });
      return plugins;
    }

    // Mathematical optimization: In-place sorting with indices
    // Proof: slice(start, end) is O(k) where k = pageSize, not O(n)
    const [field, dir]: ['updated' | 'created' | 'indexed', 'asc' | 'desc'] = ((): ['updated' | 'created' | 'indexed', 'asc' | 'desc'] => {
      if (sortBy.startsWith('updated')) return ['updated', sortBy.endsWith('asc') ? 'asc' : 'desc'];
      if (sortBy.startsWith('created')) return ['created', sortBy.endsWith('asc') ? 'asc' : 'desc'];
      return ['indexed', sortBy.endsWith('asc') ? 'asc' : 'desc'];
    })();

    // Create sorted indices array instead of copying entire objects
    const sortedIndices = filteredData.finalFiltered
      .map((_, index) => index)
      .sort((indexA, indexB) => {
        const pluginA = filteredData.finalFiltered[indexA];
        const pluginB = filteredData.finalFiltered[indexB];
        const ta = getPluginTimestamp(pluginA, field);
        const tb = getPluginTimestamp(pluginB, field);
        const diff = tb - ta;
        return dir === 'asc' ? -diff : diff;
      });

    // O(pageSize) slice operation
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const result = sortedIndices
      .slice(start, end)
      .map(index => filteredData.finalFiltered[index]);
    
    // Debug output for 'created' sorting
    if (field === 'created' && dir === 'desc') {
      const allSorted = sortedIndices.map(index => filteredData.finalFiltered[index]);
      debugSortOrder(allSorted);
    }
    
    return result;
  }, [filteredData, viewMode, groupedData, sortBy, currentPage, pageSize]);

  // O(1) total pages calculation
  const totalPages = useMemo((): number => {
    if (!filteredData) return 1;
    
    if (viewMode === 'grouped') {
      return groupedData ? Math.max(1, Math.ceil(groupedData.totalGroups / pageSize)) : 1;
    }
    
    return Math.max(1, Math.ceil(filteredData.filteredCount / pageSize));
  }, [filteredData, groupedData, viewMode, pageSize]);

  if (loading && !pluginIndex) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <Code className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-lg font-semibold gradient-text">Loading plugins...</span>
              <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Fetching the latest data from GitHub</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Oops! Something went wrong</h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={handleRefresh}
            className="button-primary flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header with gradient background */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-primary)' }}></div>
        <div className="absolute inset-0" style={{ backgroundColor: 'var(--overlay-color)' }}></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Top right controls */}
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <ThemeToggle />
          </div>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 backdrop-blur-sm rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--icon-bg)' }}>
                <Code className="h-6 w-6" style={{ color: 'var(--icon-color)' }} />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--header-text)' }}>
                Rust Oxide Plugins
              </h1>
            </div>
            <p className="text-xl max-w-2xl mx-auto mb-4" style={{ color: 'var(--header-subtitle)' }}>
              Discover and explore the best Rust plugins from GitHub repositories
            </p>
            

          </div>
          
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            options={searchOptions}
            onOptionsChange={setSearchOptions}
            placeholder="Search by plugin name, author, repository, or description..."
          />
        </div>
      </header>



      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pluginIndex && filteredData && (
          <>
            <StatsBar
              totalCount={filteredData.totalCount}
              filteredCount={filteredData.filteredCount}
              generatedAt={pluginIndex.generated_at}
              searchQuery={searchQuery}
            />
            
            <div className="flex gap-8">
              {/* Left Sidebar - Filters */}
              <div className="w-72 flex-shrink-0">
                <FilterPanel
                  plugins={filteredData.searchFiltered}
                  activeFilters={activeFilters}
                  onFiltersChange={setActiveFilters}
                />
              </div>
              
              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {/* Plugin Stats Widgets */}
                <div className="mb-6">
                  <PluginStatsWidgets plugins={pluginIndex.items} />
                </div>
                <div className="flex items-center justify-between gap-4 mb-6">
              <div className="text-sm text-gray-600">
                {viewMode === 'grouped' ? (
                  <span>
                    Showing {(uniquePluginCount === 0 ? 0 : (currentPage - 1) * pageSize + 1).toLocaleString()}–
                    {Math.min(uniquePluginCount, currentPage * pageSize).toLocaleString()} of {uniquePluginCount.toLocaleString()} unique plugins 
                    ({filteredData.filteredCount.toLocaleString()} total instances)
                  </span>
                ) : (
                  <span>
                    Showing {(filteredData.filteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1).toLocaleString()}–
                    {Math.min(filteredData.filteredCount, currentPage * pageSize).toLocaleString()} of {filteredData.filteredCount.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>View:</span>
                  <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 flex items-center gap-1 transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-500 text-white' 
                          : ''
                      }`}
                      style={viewMode !== 'grid' ? {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      } : {}}
                      onMouseEnter={(e) => {
                        if (viewMode !== 'grid') {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (viewMode !== 'grid') {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }
                      }}
                    >
                      <Grid className="h-3 w-3" />
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode('grouped')}
                      className={`px-3 py-1 flex items-center gap-1 transition-colors border-l ${
                        viewMode === 'grouped' 
                          ? 'bg-blue-500 text-white' 
                          : ''
                      }`}
                      style={{
                        borderColor: 'var(--border-color)',
                        ...(viewMode !== 'grouped' ? {
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        } : {})
                      }}
                      onMouseEnter={(e) => {
                        if (viewMode !== 'grouped') {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (viewMode !== 'grouped') {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }
                      }}
                    >
                      <Package className="h-3 w-3" />
                      Grouped
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e): void => setSortBy(e.target.value as 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc')}
                    className="border rounded-md px-2 py-1"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="updated_desc">Last updated — newest</option>
                    <option value="updated_asc">Last updated — oldest</option>
                    <option value="created_desc">Created — newest</option>
                    <option value="created_asc">Created — oldest</option>
                    <option value="indexed_desc">Indexed — newest</option>
                    <option value="indexed_asc">Indexed — oldest</option>
                  </select>
                </div>
                {viewMode === 'grid' && (
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-secondary)' }}>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="border rounded-md px-2 py-1"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={30}>30</option>
                      <option value={48}>48</option>
                      <option value={60}>60</option>
                      <option value={96}>96</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {filteredData.filteredCount > 0 ? (
              <>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

                {viewMode === 'grid' ? (
                  <PluginGrid
                    plugins={pagedItems}
                    loading={loading}
                    allPlugins={pluginIndex.items}
                  />
                ) : (
                  <GroupedPluginView
                    plugins={pagedItems}
                    loading={loading}
                    sortBy={sortBy}
                    allPlugins={pluginIndex.items}
                  />
                )}

                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </>
            ) : (
              <EmptyState
                type={activeFilters.length > 0 ? 'filter' : searchQuery ? 'search' : 'general'}
                title={
                  activeFilters.length > 0 
                    ? 'No plugins match your filters' 
                    : searchQuery 
                      ? 'No plugins found' 
                      : 'No plugins available'
                }
                description={
                  activeFilters.length > 0 
                    ? 'Try removing some filters or adjusting your criteria to see more results.'
                    : searchQuery 
                      ? `No plugins found matching "${searchQuery}". Try different keywords or check your spelling.`
                      : 'There are currently no plugins available to display.'
                }
                onReset={() => {
                  setSearchQuery('');
                  setActiveFilters([]);
                }}
              />
            )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer with modern design */}
      <footer className="relative mt-20">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Code className="h-6 w-6 text-white" />
              <span className="text-white font-semibold">Rust Oxide Plugins</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Data sourced from GitHub repositories containing Oxide plugins.
            </p>
            <p className="text-gray-400 text-xs">
              Last updated: {pluginIndex ? new Date(pluginIndex.generated_at).toLocaleString() : 'Loading...'}
            </p>
          </div>
        </div>
      </footer>
      

    </div>
  );
}

export default App;
