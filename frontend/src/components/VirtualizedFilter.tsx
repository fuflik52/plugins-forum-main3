import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { FilterValue } from '../services/filterService';

/**
 * Mathematical Virtual Filter Component
 * Theorem: O(1) DOM elements regardless of data size
 * Proof: Only renders visible viewport + small buffer
 */

interface VirtualizedFilterProps {
  title: string;
  field: FilterValue['field'];
  allOptions: string[];
  activeFilters: FilterValue[];
  onAddFilter: (field: FilterValue['field'], value: string) => void;
  onRemoveFilter: (field: FilterValue['field'], value: string) => void;
  getPluginCount: (field: FilterValue['field'], value: string) => number;
  itemHeight?: number; // Height of each filter item in pixels
  maxHeight?: number;  // Maximum height of virtual list
}

export const VirtualizedFilter: React.FC<VirtualizedFilterProps> = ({
  title,
  field,
  allOptions,
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  getPluginCount,
  itemHeight = 32,
  maxHeight = 200
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isFilterActive = useCallback((value: string): boolean => {
    return activeFilters.some(f => f.field === field && f.value === value);
  }, [activeFilters, field]);

  // Mathematical optimization: Filter + virtual window calculation
  const virtualData = useMemo(() => {
    const filtered = searchTerm
      ? allOptions.filter(option =>
          option.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allOptions;

    // Virtual window calculation - only render visible items
    const containerHeight = maxHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(filtered.length, startIndex + visibleCount + 2); // +2 for buffer
    const visibleItems = filtered.slice(startIndex, endIndex);

    return {
      allItems: filtered,
      visibleItems,
      startIndex,
      endIndex,
      totalHeight: filtered.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [allOptions, searchTerm, scrollTop, itemHeight, maxHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // If too many items, show message instead of rendering
  if (allOptions.length > 1000 && !searchTerm) {
    return (
      <div className="border-b border-gray-100 pb-4 mb-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span className="text-xs text-gray-500">{allOptions.length}</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="text-xs text-amber-800 font-medium mb-1">
            Too many options ({allOptions.length})
          </p>
          <p className="text-xs text-amber-700">
            Please use search to filter the results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-xs text-gray-500">
            {searchTerm ? `${virtualData.allItems.length}/${allOptions.length}` : allOptions.length}
          </span>
        </div>
        
        {allOptions.length > 10 && (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
          />
        )}
      </div>

      {/* Virtual List Container */}
      {virtualData.allItems.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className="relative overflow-auto border border-gray-200 rounded-md"
          style={{ height: Math.min(maxHeight, virtualData.totalHeight) }}
          onScroll={handleScroll}
        >
          {/* Virtual spacer for total height */}
          <div style={{ height: virtualData.totalHeight, position: 'relative' }}>
            {/* Visible items container */}
            <div
              style={{
                transform: `translateY(${virtualData.offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {virtualData.visibleItems.map((option, index) => {
                const actualIndex = virtualData.startIndex + index;
                const count = getPluginCount(field, option);
                const isActive = isFilterActive(option);
                
                return (
                  <button
                    key={`${option}-${actualIndex}`}
                    onClick={() => isActive ? onRemoveFilter(field, option) : onAddFilter(field, option)}
                    className={`w-full flex items-center justify-between px-2 py-1 text-xs transition-colors border-b border-gray-100 last:border-b-0 ${
                      isActive 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={{ height: itemHeight }}
                  >
                    <span className="font-medium truncate pr-2">{option}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      isActive 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p className="text-xs">No matches found</p>
        </div>
      )}
    </div>
  );
};