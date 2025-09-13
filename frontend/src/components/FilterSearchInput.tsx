import React from 'react';
import { Search } from 'lucide-react';

interface FilterSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filterKey: string; // Unique key to prevent re-creation
}

export const FilterSearchInput: React.FC<FilterSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  filterKey
}) => {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3" style={{ color: 'var(--text-muted)' }} />
      <input
        key={filterKey}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)'
        }}
        autoComplete="off"
        spellCheck={false}
      />
      </div>
    );
};