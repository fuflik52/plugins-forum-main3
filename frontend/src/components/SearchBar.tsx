import React, { useState, useCallback, useMemo } from 'react';
import { Search, Settings, RotateCcw, ChevronDown } from 'lucide-react';
import type { SearchOptions, SearchFieldKey } from '../types/plugin';
import { getDefaultSearchOptions } from '../types/plugin';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchOptions;
  onOptionsChange: (opts: SearchOptions) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange,
  options,
  onOptionsChange,
  placeholder = "Search plugins by name, author, description..." 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Mathematical proof: useCallback prevents function recreation on each render
  // Theorem: Stable references eliminate child component re-renders
  const toggleField = useCallback((field: SearchFieldKey): void => {
    const has = options.fields.includes(field);
    const next = has ? options.fields.filter((f) => f !== field) : [...options.fields, field];
    onOptionsChange({ ...options, fields: next });
  }, [options, onOptionsChange]);
  
  const resetOptions = useCallback((): void => {
    onOptionsChange(getDefaultSearchOptions());
  }, [onOptionsChange]);

  // Mathematical optimization: Static object prevents recreation
  const fieldLabels: Record<SearchFieldKey, string> = useMemo(() => ({
    plugin_name: 'Plugin Name',
    plugin_author: 'Author',
    plugin_description: 'Description',
    plugin_version: 'Version',
    repo_name: 'Repository Name',
    repo_full_name: 'Full Repository Name',
    repo_description: 'Repository Description',
    repo_owner: 'Repository Owner',
    file_path: 'File Path',
  }), []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 transition-colors" 
                  style={{ color: 'var(--text-muted)' }} />
        </div>
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-16 py-4 text-lg backdrop-blur-sm border rounded-2xl 
                   shadow-lg focus:outline-none focus:ring-2 transition-all duration-300"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            ['--tw-ring-color' as any]: 'var(--accent-color)',
            ['--tw-ring-opacity' as any]: '0.3'
          } as React.CSSProperties}
          placeholder={placeholder}
        />
        
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium 
                     rounded-lg transition-colors border backdrop-blur-sm shadow-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Options</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-xl"
             style={{ background: 'var(--gradient-primary)', opacity: '0.2' }}></div>
      </div>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div className="mt-4 backdrop-blur-sm rounded-2xl shadow-xl border overflow-hidden"
             style={{
               backgroundColor: 'var(--bg-secondary)',
               borderColor: 'var(--border-color)'
             }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b"
               style={{
                 backgroundColor: 'var(--bg-tertiary)',
                 borderColor: 'var(--border-color)'
               }}>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Search Options</h3>
            </div>
            <button
              onClick={resetOptions}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm 
                       rounded-lg transition-colors"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent'
              }}
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
          
          {/* Options Grid */}
          <div className="p-6 space-y-6">
            {/* Match & Logic Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Match Mode</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  value={options.matchMode}
                  onChange={(e) => onOptionsChange({ ...options, matchMode: e.target.value as SearchOptions['matchMode'] })}
                >
                  <option value="contains">Contains text</option>
                  <option value="startsWith">Starts with</option>
                  <option value="exact">Exact match</option>
                  <option value="regex">Regular expression</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Search Logic</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  value={options.logic}
                  onChange={(e) => onOptionsChange({ ...options, logic: e.target.value as SearchOptions['logic'] })}
                >
                  <option value="any">Match any field</option>
                  <option value="all">Match all fields</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Case Sensitivity</label>
                <button
                  onClick={() => onOptionsChange({ ...options, caseSensitive: !options.caseSensitive })}
                  className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none 
                            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            options.caseSensitive ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                >
                  <span
                    className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform shadow-lg ${
                      options.caseSensitive ? 'translate-x-11' : 'translate-x-1'
                    }`}
                  />
                  <span className="sr-only">Toggle case sensitivity</span>
                </button>
              </div>
            </div>

            {/* Search Fields */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Search in these fields:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {(Object.entries(fieldLabels) as [SearchFieldKey, string][]).map(([key, label]) => {
                  const active = options.fields.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleField(key)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium 
                                transition-all border"
                      style={{
                        backgroundColor: active ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                        color: active ? 'white' : 'var(--text-primary)',
                        borderColor: active ? 'var(--accent-color)' : 'var(--border-color)'
                      }}
                    >
                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                           style={{
                             borderColor: active ? 'white' : 'var(--border-color)',
                             backgroundColor: active ? 'white' : 'transparent'
                           }}>
                        {active && (
                          <svg className="w-2 h-2" fill="var(--accent-color)" viewBox="0 0 8 8">
                            <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                          </svg>
                        )}
                      </div>
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Info */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: 'var(--accent-color)' }}>
                    <span className="text-xs font-bold text-white">i</span>
                  </div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-medium mb-1">Search Tips:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Use quotation marks for exact phrases: "rust plugin"</li>
                    <li>• Try different match modes for better results</li>
                    <li>• Combine search with filters below for precise results</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};