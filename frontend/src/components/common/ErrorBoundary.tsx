import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-canvas dot-grid-bg p-6">
          <div className="bg-panel border border-panelBorder p-6 rounded-sm max-w-md w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-sm bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-base font-bold text-textPrimary">An Unexpected Error Occurred</h1>
            <p className="text-xs text-mutedText font-mono bg-white border border-panelBorder p-3 rounded-sm text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accentHover text-white text-xs font-semibold rounded-sm border border-accent transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
