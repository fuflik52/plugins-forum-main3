import type { SearchOptions } from '../types/plugin';
import type { FilterValue } from '../services/filterService';
import { getDefaultSearchOptions } from '../types/plugin';

export interface UrlState {
  search?: string;
  view?: 'grid' | 'grouped';
  sort?: 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc';
  page?: number;
  pageSize?: number;
  searchOptions?: SearchOptions;
  filters?: FilterValue[];
}

// Convert URL search params to state object
export function parseUrlState(searchParams: URLSearchParams): UrlState {
  const state: UrlState = {};

  // Search query
  const search = searchParams.get('search');
  if (search) {
    state.search = search;
  }

  // View mode
  const view = searchParams.get('view');
  if (view === 'grid' || view === 'grouped') {
    state.view = view;
  }

  // Sort
  const sort = searchParams.get('sort');
  if (sort && ['updated_desc', 'updated_asc', 'created_desc', 'created_asc', 'indexed_desc', 'indexed_asc'].includes(sort)) {
    state.sort = sort as 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'indexed_desc' | 'indexed_asc';
  }

  // Page
  const page = searchParams.get('page');
  if (page) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      state.page = pageNum;
    }
  }

  // Page size
  const pageSize = searchParams.get('pageSize');
  if (pageSize) {
    const pageSizeNum = parseInt(pageSize, 10);
    if (!isNaN(pageSizeNum) && [12, 24, 30, 48, 60, 96].includes(pageSizeNum)) {
      state.pageSize = pageSizeNum;
    }
  }

  // Search options
  const searchOptions: Partial<SearchOptions> = {};
  
  // Search fields
  const fields = searchParams.get('fields');
  if (fields) {
    const fieldArray = fields.split(',').filter(f => 
      ['plugin_name', 'plugin_author', 'repo_name', 'repo_full_name', 'repo_description', 'repo_owner', 'file_path'].includes(f)
    );
    if (fieldArray.length > 0) {
      searchOptions.fields = fieldArray as ('plugin_name' | 'plugin_author' | 'plugin_description' | 'plugin_version' | 'repo_name' | 'repo_full_name' | 'repo_description' | 'repo_owner' | 'file_path')[];
    }
  }

  // Match mode
  const matchMode = searchParams.get('matchMode');
  if (matchMode && ['contains', 'startsWith', 'exact', 'regex'].includes(matchMode)) {
    searchOptions.matchMode = matchMode as 'contains' | 'startsWith' | 'exact' | 'regex';
  }

  // Logic
  const logic = searchParams.get('logic');
  if (logic && ['any', 'all'].includes(logic)) {
    searchOptions.logic = logic as 'any' | 'all';
  }

  // Case sensitive
  const caseSensitive = searchParams.get('caseSensitive');
  if (caseSensitive !== null) {
    searchOptions.caseSensitive = caseSensitive === 'true';
  }

  // Only set search options if we have any custom values
  if (Object.keys(searchOptions).length > 0) {
    state.searchOptions = { ...getDefaultSearchOptions(), ...searchOptions };
  }

  // Filters
  const filters: FilterValue[] = [];
  
  // Authors filter
  const authors = searchParams.get('authors');
  if (authors) {
    authors.split(',').forEach(author => {
      if (author.trim()) {
        filters.push({ field: 'plugin_author', value: author.trim() });
      }
    });
  }
  
  // Versions filter
  const versions = searchParams.get('versions');
  if (versions) {
    versions.split(',').forEach(version => {
      if (version.trim()) {
        filters.push({ field: 'plugin_version', value: version.trim() });
      }
    });
  }
  
  // Repository owners filter
  const owners = searchParams.get('owners');
  if (owners) {
    owners.split(',').forEach(owner => {
      if (owner.trim()) {
        filters.push({ field: 'repo_owner', value: owner.trim() });
      }
    });
  }
  
  if (filters.length > 0) {
    state.filters = filters;
  }

  return state;
}

// Convert state object to URL search params
export function stateToUrlParams(state: UrlState): URLSearchParams {
  const params = new URLSearchParams();
  const defaults = getDefaultSearchOptions();

  if (state.search && state.search.trim()) {
    params.set('search', state.search.trim());
  }

  if (state.view && state.view !== 'grid') {
    params.set('view', state.view);
  }

  if (state.sort && state.sort !== 'created_desc') {
    params.set('sort', state.sort);
  }

  if (state.page && state.page !== 1) {
    params.set('page', state.page.toString());
  }

  if (state.pageSize && state.pageSize !== 30) {
    params.set('pageSize', state.pageSize.toString());
  }

  // Search options - only add if different from defaults
  if (state.searchOptions) {
    const opts = state.searchOptions;
    
    if (JSON.stringify(opts.fields) !== JSON.stringify(defaults.fields)) {
      params.set('fields', opts.fields.join(','));
    }
    
    if (opts.matchMode !== defaults.matchMode) {
      params.set('matchMode', opts.matchMode);
    }
    
    if (opts.logic !== defaults.logic) {
      params.set('logic', opts.logic);
    }
    
    if (opts.caseSensitive !== defaults.caseSensitive) {
      params.set('caseSensitive', opts.caseSensitive.toString());
    }
  }

  // Filters
  if (state.filters && state.filters.length > 0) {
    const authorFilters = state.filters.filter(f => f.field === 'plugin_author').map(f => f.value);
    const versionFilters = state.filters.filter(f => f.field === 'plugin_version').map(f => f.value);
    const ownerFilters = state.filters.filter(f => f.field === 'repo_owner').map(f => f.value);
    
    if (authorFilters.length > 0) {
      params.set('authors', authorFilters.join(','));
    }
    if (versionFilters.length > 0) {
      params.set('versions', versionFilters.join(','));
    }
    if (ownerFilters.length > 0) {
      params.set('owners', ownerFilters.join(','));
    }
  }

  return params;
}

// Update browser URL without page reload
export function updateUrl(state: UrlState, replace = false): void {
  const params = stateToUrlParams(state);
  const url = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

// Get current state from URL
export function getCurrentUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  return parseUrlState(params);
}