import React from 'react';
import { Search, Filter, Package } from 'lucide-react';

interface EmptyStateProps {
  type: 'search' | 'filter' | 'general';
  title: string;
  description: string;
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  onReset
}) => {
  const getIcon = (): React.ReactElement => {
    switch (type) {
      case 'search':
        return <Search className="h-16 w-16 text-gray-400" />;
      case 'filter':
        return <Filter className="h-16 w-16 text-gray-400" />;
      default:
        return <Package className="h-16 w-16 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>
        
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          {title}
        </h3>
        
        <p className="text-gray-600 max-w-md mx-auto leading-relaxed mb-8">
          {description}
        </p>

        {onReset && (
          <button
            onClick={onReset}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium 
                     rounded-lg transition-colors focus:outline-none focus:ring-2 
                     focus:ring-blue-500 focus:ring-offset-2"
          >
            Clear filters and search
          </button>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <div className="space-y-2">
            <p>Try adjusting your search terms or filters</p>
            <p>• Use broader keywords</p>
            <p>• Remove some filters</p>
            <p>• Check spelling</p>
          </div>
        </div>
      </div>
    </div>
  );
};