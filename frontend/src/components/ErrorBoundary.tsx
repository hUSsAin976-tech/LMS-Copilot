import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mb-4 shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500 max-w-md mt-1">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please reload or return to the dashboard.'}
          </p>
          <div className="flex items-center space-x-3 mt-6">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Reload Page
            </button>
            <Link
              to="/dashboard"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
            >
              <Home className="h-3.5 w-3.5 mr-2" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
