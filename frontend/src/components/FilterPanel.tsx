import React, { useState, useMemo, useEffect } from 'react';
import type { IndexedPlugin } from '../types/plugin';
import type { FilterValue } from '../services/filterService';
import { FilterService } from '../services/filterService';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterSearchInput } from './FilterSearchInput';

interface FilterPanelProps {
  plugins: IndexedPlugin[];
  activeFilters: FilterValue[];
  onFiltersChange: (filters: FilterValue[]) => void;
}

// Separate search state component to prevent re-renders
const FilterSection = React.memo(({ 
  title, 
  field, 
  allOptions, 
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  isExpanded,
  onToggleExpanded,
  maxVisible = 8,
  maxAbsolute = 20, // Mathematical limit: never render more than 20 DOM elements
  getPluginCount
}: {
  title: string;
  field: FilterValue['field'];
  allOptions: string[];
  activeFilters: FilterValue[];
  onAddFilter: (field: FilterValue['field'], value: string) => void;
  onRemoveFilter: (field: FilterValue['field'], value: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  maxVisible?: number;
  getPluginCount: (field: FilterValue['field'], value: string) => number;
  maxAbsolute?: number;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isToggling, setIsToggling] = useState(false);

  // Mathematical optimization: Strict DOM element limits
  // Theorem: O(1) memory usage regardless of data size
  const processedData = useMemo(() => {
    const filtered = searchTerm 
      ? allOptions.filter(option => 
          option.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allOptions;
    
    // Hard limit: never exceed maxAbsolute elements in DOM
    const absoluteMax = maxAbsolute || 20;
    const tooManyItems = filtered.length > absoluteMax;
    
    if (tooManyItems && !searchTerm) {
      // If too many items without search, show expand/collapse buttons
      return {
        items: filtered.slice(0, absoluteMax),
        totalCount: filtered.length,
        hasMore: filtered.length > maxVisible,
        needsSearch: filtered.length > absoluteMax, // Show search hint only if > 15
        visible: isExpanded ? Math.min(absoluteMax, filtered.length) : Math.min(maxVisible, filtered.length)
      };
    }
    
    if (tooManyItems && searchTerm) {
      // Even with search, limit DOM elements
      return {
        items: filtered.slice(0, absoluteMax),
        totalCount: filtered.length,
        hasMore: filtered.length > absoluteMax,
        needsSearch: false,
        visible: Math.min(absoluteMax, filtered.length)
      };
    }
    
    // Normal case: manageable number of items
    return {
      items: filtered,
      totalCount: filtered.length,
      hasMore: filtered.length > maxVisible,
      needsSearch: false,
      visible: isExpanded ? filtered.length : Math.min(maxVisible, filtered.length)
    };
  }, [allOptions, searchTerm, isExpanded, maxVisible, maxAbsolute]);
  
  const showSearch = allOptions.length > 5;

  const isFilterActive = (value: string): boolean => {
    return activeFilters.some(f => f.field === field && f.value === value);
  };

  if (allOptions.length === 0) return null;

  return (
    <div className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0" style={{ borderColor: 'var(--border-color)' }}>
      {/* Header with search */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{allOptions.length}</span>
        </div>
        
        {/* Inline search input */}
        {showSearch && (
          <FilterSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={`Search ${title.toLowerCase()}...`}
            filterKey={`${field}-search`}
          />
        )}
      </div>

      {/* No results message */}
      {searchTerm && processedData.totalCount === 0 && (
        <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
          <p className="text-xs mb-2">No results found for "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs"
            style={{ color: 'var(--accent-color)' }}
          >
            Clear search
          </button>
        </div>
      )}
      
      {/* Search result count */}
      {searchTerm && processedData.hasMore && (
        <div className="border rounded-md p-2 mb-3" 
             style={{ 
               backgroundColor: 'var(--bg-tertiary)', 
               borderColor: 'var(--border-color)' 
             }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Showing {processedData.items.length} of {processedData.totalCount} matches. 
            Refine search for more specific results.
          </p>
        </div>
      )}

      {/* Filter options - mathematically limited DOM elements */}
      {processedData.items.length > 0 && (
        <div className={`space-y-1 ${isExpanded && processedData.visible > 8 ? 'max-h-64 overflow-y-auto custom-scrollbar' : ''}`}>
          {processedData.items.slice(0, processedData.visible).map(option => {
            const count = getPluginCount(field, option);
            const isActive = isFilterActive(option);
            
            return (
              <button
                key={`${field}-${option}-${isActive ? 'active' : 'inactive'}`}
                onClick={() => isActive ? onRemoveFilter(field, option) : onAddFilter(field, option)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-all border"
                style={{
                  backgroundColor: isActive ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: isActive ? 'white' : 'var(--text-primary)',
                  borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)'
                }}
              >
                <span className="font-medium truncate pr-2">{option}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-tertiary)',
                        color: isActive ? 'white' : 'var(--text-secondary)'
                      }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Expand/Collapse button */}
      {processedData.hasMore && (
        <button
          onClick={() => {
            if (isToggling) return; // Prevent double clicks
            setIsToggling(true);
            onToggleExpanded();
            setTimeout(() => setIsToggling(false), 100); // Reset after 100ms
          }}
          disabled={isToggling}
          className="w-full mt-2 py-1.5 text-xs transition-colors flex items-center justify-center disabled:opacity-50"
          style={{ color: 'var(--accent-color)' }}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {Math.min(processedData.totalCount - processedData.visible, processedData.items.length - processedData.visible)} more
            </>
          )}
        </button>
      )}

      {/* Too many items warning - show below expand button when expanded and showing maximum */}
      {processedData.needsSearch && isExpanded && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mt-2">
          <p className="text-xs text-yellow-700 text-center">
            Showing first {processedData.visible} of {processedData.totalCount} total. Use search above to narrow down results.
          </p>
        </div>
      )}
    </div>
  );
});

export const FilterPanel: React.FC<FilterPanelProps> = ({
  plugins,
  activeFilters,
  onFiltersChange
}) => {
  const [expandedSections, setExpandedSections] = useState({
    authors: false,
    versions: false,
    owners: false,
  });

  const [initializedSections, setInitializedSections] = useState(false);

  // Mathematical optimization: Dynamic filter options based on current selection
  // Theorem: Filter options update based on cross-filter dependencies
  const baseFilterOptions = useMemo(() => {
    // Calculate what plugins remain after applying OTHER filters
    const getAvailablePluginsForField = (excludeField: string): IndexedPlugin[] => {
      const otherFilters = activeFilters.filter(f => f.field !== excludeField);
      return otherFilters.length > 0 
        ? FilterService.applyFilters(plugins, otherFilters)
        : plugins;
    };

    // Calculate options for each filter type based on remaining plugins  
    const authorPlugins = getAvailablePluginsForField('plugin_author');
    const versionPlugins = getAvailablePluginsForField('plugin_version');
    const ownerPlugins = getAvailablePluginsForField('repo_owner');

    const options = {
      plugin_author: new Set<string>(),
      plugin_version: new Set<string>(),
      repo_owner: new Set<string>(),
      // Count maps for O(1) lookups
      authorCounts: new Map<string, number>(),
      versionCounts: new Map<string, number>(),
      ownerCounts: new Map<string, number>(),
    };

    // Extract authors from available plugins
    authorPlugins.forEach(plugin => {
      if (plugin.plugin_author) {
        options.plugin_author.add(plugin.plugin_author);
        options.authorCounts.set(
          plugin.plugin_author,
          (options.authorCounts.get(plugin.plugin_author) || 0) + 1
        );
      }
    });

    // Extract versions from available plugins  
    versionPlugins.forEach(plugin => {
      if (plugin.plugin_version) {
        options.plugin_version.add(plugin.plugin_version);
        options.versionCounts.set(
          plugin.plugin_version,
          (options.versionCounts.get(plugin.plugin_version) || 0) + 1
        );
      }
    });

    // Extract owners from available plugins
    ownerPlugins.forEach(plugin => {
      if (plugin.repository?.owner_login) {
        options.repo_owner.add(plugin.repository.owner_login);
        options.ownerCounts.set(
          plugin.repository.owner_login,
          (options.ownerCounts.get(plugin.repository.owner_login) || 0) + 1
        );
      }
    });

    // Sort versions properly (semantic version sorting)
    const sortedVersions = Array.from(options.plugin_version).sort((a, b) => {
      const parseVersion = (v: string): number[] => {
        const parts = v.split('.').map(p => parseInt(p, 10) || 0);
        return parts;
      };
      
      const vA = parseVersion(a);
      const vB = parseVersion(b);
      
      for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
        const partA = vA[i] || 0;
        const partB = vB[i] || 0;
        if (partA !== partB) {
          return partB - partA;
        }
      }
      return 0;
    });

    return {
      plugin_author: Array.from(options.plugin_author).sort(),
      plugin_version: sortedVersions,
      repo_owner: Array.from(options.repo_owner).sort(),
      // O(1) count lookup maps
      counts: {
        plugin_author: options.authorCounts,
        plugin_version: options.versionCounts,
        repo_owner: options.ownerCounts,
      },
    };
  }, [plugins, activeFilters]);

  // Initialize expanded sections only once
  useEffect(() => {
    if (!initializedSections && plugins.length > 0) {
      const totalAuthors = baseFilterOptions.plugin_author.length;
      const totalVersions = baseFilterOptions.plugin_version.length;
      const totalOwners = baseFilterOptions.repo_owner.length;

      setExpandedSections({
        authors: totalAuthors <= 5,
        versions: totalVersions <= 5, 
        owners: totalOwners <= 5,
      });
      setInitializedSections(true);
    }
  }, [plugins, initializedSections, baseFilterOptions]);

  const addFilter = (field: FilterValue['field'], value: string): void => {
    const exists = activeFilters.some(f => f.field === field && f.value === value);
    if (!exists) {
      onFiltersChange([...activeFilters, { field, value }]);
    }
  };

  const removeFilter = (field: FilterValue['field'], value: string): void => {
    onFiltersChange(activeFilters.filter(f => !(f.field === field && f.value === value)));
  };

  const clearAllFilters = (): void => {
    onFiltersChange([]);
  };

  // Mathematical proof: O(1) count lookup instead of O(n) filtering
  // Theorem: Map.get() is O(1), eliminates need for array traversal
  const getPluginCount = (field: FilterValue['field'], value: string): number => {
    const countMap = baseFilterOptions.counts[field as keyof typeof baseFilterOptions.counts];
    return countMap?.get(value) || 0;
  };

  const toggleSection = (section: keyof typeof expandedSections): void => {
    // Prevent rapid clicking that could cause DOM issues
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="rounded-lg border sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" style={{ color: 'var(--accent-color)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</h2>
          {hasActiveFilters && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}>
              {activeFilters.length}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--error-color)' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="px-4 py-3 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter, index) => (
              <div
                key={index}
                className="flex items-center space-x-1 px-2 py-1 rounded-md border text-xs"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
              >
                <span className="font-medium truncate" style={{ color: 'var(--accent-color)' }}>
                  {filter.value}
                </span>
                <button
                  onClick={() => removeFilter(filter.field, filter.value)}
                  className="transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent-color)' }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Sections */}
      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
        <FilterSection
          title="Authors"
          field="plugin_author"
          allOptions={baseFilterOptions.plugin_author}
          activeFilters={activeFilters}
          onAddFilter={addFilter}
          onRemoveFilter={removeFilter}
          isExpanded={expandedSections.authors}
          onToggleExpanded={() => toggleSection('authors')}
          maxVisible={5}
          maxAbsolute={15}
          getPluginCount={getPluginCount}
        />
        
        <FilterSection
          title="Versions"
          field="plugin_version"
          allOptions={baseFilterOptions.plugin_version}
          activeFilters={activeFilters}
          onAddFilter={addFilter}
          onRemoveFilter={removeFilter}
          isExpanded={expandedSections.versions}
          onToggleExpanded={() => toggleSection('versions')}
          maxVisible={5}
          maxAbsolute={15}
          getPluginCount={getPluginCount}
        />
        
        
        <FilterSection
          title="Repository Owners"
          field="repo_owner"
          allOptions={baseFilterOptions.repo_owner}
          activeFilters={activeFilters}
          onAddFilter={addFilter}
          onRemoveFilter={removeFilter}
          isExpanded={expandedSections.owners}
          onToggleExpanded={() => toggleSection('owners')}
          maxVisible={5}
          maxAbsolute={15}
          getPluginCount={getPluginCount}
        />
      </div>
    </div>
  );
};