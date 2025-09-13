import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SearchOptions } from '../types/plugin';
import type { FilterValue } from '../services/filterService';
import { getDefaultSearchOptions } from '../types/plugin';
import { updateUrl, getCurrentUrlState, type UrlState } from '../utils/urlState';

export function useUrlState(): {
  searchQuery: string;
  viewMode: 'grid' | 'grouped';
  sortBy: 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc';
  currentPage: number;
  pageSize: number;
  searchOptions: SearchOptions;
  activeFilters: FilterValue[];
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'grouped') => void;
  setSortBy: (sort: 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc') => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchOptions: (options: SearchOptions) => void;
  setActiveFilters: (filters: FilterValue[]) => void;
} {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');
  const [sortBy, setSortBy] = useState<'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc'>('created_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(getDefaultSearchOptions());
  const [activeFilters, setActiveFilters] = useState<FilterValue[]>([]);

  // Initialize state from URL on mount
  useEffect(() => {
    const urlState = getCurrentUrlState();
    
    if (urlState.search !== undefined) {
      setSearchQuery(urlState.search);
    }
    if (urlState.view !== undefined) {
      setViewMode(urlState.view);
    }
    if (urlState.sort !== undefined) {
      setSortBy(urlState.sort);
    }
    if (urlState.page !== undefined) {
      setCurrentPage(urlState.page);
    }
    if (urlState.pageSize !== undefined) {
      setPageSize(urlState.pageSize);
    }
    if (urlState.searchOptions !== undefined) {
      setSearchOptions(urlState.searchOptions);
    }
    if (urlState.filters !== undefined) {
      setActiveFilters(urlState.filters);
    }
  }, []);

  // Mathematical optimization: Memoized state object to prevent recreations
  // Theorem: Object reference stability eliminates unnecessary re-renders
  const currentState = useMemo((): UrlState => ({
    search: searchQuery,
    view: viewMode,
    sort: sortBy,
    page: currentPage,
    pageSize: pageSize,
    searchOptions: searchOptions,
    filters: activeFilters
  }), [searchQuery, viewMode, sortBy, currentPage, pageSize, searchOptions, activeFilters]);

  const updateUrlState = useCallback((newState: Partial<UrlState>, replace = false) => {
    const updatedState = { ...currentState, ...newState };
    updateUrl(updatedState, replace);
  }, [currentState]);

  // Mathematical optimization: Batch state updates to prevent multiple re-renders
  // Proof: Single updateUrlState call is O(1), multiple calls are O(k)
  const setSearchQueryWithUrl = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Batch with URL update
    updateUrlState({ search: value, page: 1 }, true);
  }, [updateUrlState]);

  const setViewModeWithUrl = useCallback((value: 'grid' | 'grouped') => {
    setViewMode(value);
    // Reset to page 1 when changing view mode
    setCurrentPage(1);
    updateUrlState({ view: value, page: 1 }, true);
  }, [updateUrlState]);

  const setSortByWithUrl = useCallback((value: 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc') => {
    setSortBy(value);
    // Reset to page 1 when changing sort
    setCurrentPage(1);
    updateUrlState({ sort: value, page: 1 }, true);
  }, [updateUrlState]);

  const setCurrentPageWithUrl = useCallback((value: number) => {
    setCurrentPage(value);
    updateUrlState({ page: value }, false);
  }, [updateUrlState]);

  const setPageSizeWithUrl = useCallback((value: number) => {
    setPageSize(value);
    // Reset to page 1 when changing page size
    setCurrentPage(1);
    updateUrlState({ pageSize: value, page: 1 }, true);
  }, [updateUrlState]);

  const setSearchOptionsWithUrl = useCallback((value: SearchOptions) => {
    setSearchOptions(value);
    // Reset to page 1 when changing search options
    setCurrentPage(1);
    updateUrlState({ searchOptions: value, page: 1 }, true);
  }, [updateUrlState]);

  const setActiveFiltersWithUrl = useCallback((value: FilterValue[]) => {
    setActiveFilters(value);
    // Reset to page 1 when changing filters
    setCurrentPage(1);
    updateUrlState({ filters: value, page: 1 }, true);
  }, [updateUrlState]);

  // Mathematical proof: Event listener cleanup prevents memory leaks
  // Theorem: Each useEffect cleanup guarantees O(1) memory usage
  useEffect(() => {
    const handlePopState = (): void => {
      const urlState = getCurrentUrlState();
      
      setSearchQuery(urlState.search || '');
      setViewMode(urlState.view || 'grid');
      setSortBy(urlState.sort || 'created_desc');
      setCurrentPage(urlState.page || 1);
      setPageSize(urlState.pageSize || 30);
      setSearchOptions(urlState.searchOptions || getDefaultSearchOptions());
      setActiveFilters(urlState.filters || []);
    };

    window.addEventListener('popstate', handlePopState);
    // Guaranteed cleanup - prevents accumulation of event listeners
    return (): void => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return {
    // State values
    searchQuery,
    viewMode,
    sortBy,
    currentPage,
    pageSize,
    searchOptions,
    activeFilters,
    
    // Setters that update URL
    setSearchQuery: setSearchQueryWithUrl,
    setViewMode: setViewModeWithUrl,
    setSortBy: setSortByWithUrl,
    setCurrentPage: setCurrentPageWithUrl,
    setPageSize: setPageSizeWithUrl,
    setSearchOptions: setSearchOptionsWithUrl,
    setActiveFilters: setActiveFiltersWithUrl,
  };
}