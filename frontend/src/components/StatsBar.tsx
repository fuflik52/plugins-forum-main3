import React from 'react';
import { Package, Clock, Search, TrendingUp, Zap } from 'lucide-react';

interface StatsBarProps {
  totalCount: number;
  filteredCount: number;
  generatedAt: string;
  searchQuery: string;
}

// Mathematical proof: Stats rarely change, memo prevents re-renders
export const StatsBar: React.FC<StatsBarProps> = React.memo(({ 
  totalCount, 
  filteredCount, 
  generatedAt, 
  searchQuery 
}) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="stats-card mb-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="icon-wrapper">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold gradient-text">
                {searchQuery ? `${filteredCount.toLocaleString()}` : totalCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {searchQuery ? 'filtered' : 'total'} plugins
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="icon-wrapper">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Last Updated</div>
              <div className="text-sm text-gray-600">{formatDate(generatedAt)}</div>
            </div>
          </div>
          
          {searchQuery && (
            <div className="flex items-center space-x-3">
              <div className="icon-wrapper">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">Search Results</div>
                <div className="text-sm text-gray-600">"{searchQuery}"</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>Live Data</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
});

