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
          <Search className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
        </div>
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-16 py-4 text-lg bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl 
                   placeholder-gray-500 text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/30 
                   focus:border-white/40 transition-all duration-300"
          placeholder={placeholder}
        />
        
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 
                     hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white/80 backdrop-blur-sm shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Options</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 
                        opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
      </div>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div className="mt-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-gray-200/50">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Search Options</h3>
            </div>
            <button
              onClick={resetOptions}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 
                       hover:bg-gray-200/50 rounded-lg transition-colors"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Match Mode</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Logic</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={options.logic}
                  onChange={(e) => onOptionsChange({ ...options, logic: e.target.value as SearchOptions['logic'] })}
                >
                  <option value="any">Match any field</option>
                  <option value="all">Match all fields</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Case Sensitivity</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-3">Search in these fields:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {(Object.entries(fieldLabels) as [SearchFieldKey, string][]).map(([key, label]) => {
                  const active = options.fields.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleField(key)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium 
                                transition-all border ${
                        active
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        active ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {active && (
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
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
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">i</span>
                  </div>
                </div>
                <div className="text-sm text-blue-800">
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