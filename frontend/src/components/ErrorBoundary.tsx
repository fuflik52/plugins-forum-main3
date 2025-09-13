import React, { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-lg shadow-md border border-red-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center text-red-600 mb-2">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Something went wrong</span>
            </div>
            <p className="text-gray-600 text-sm">
              {this.state.error ? this.state.error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
