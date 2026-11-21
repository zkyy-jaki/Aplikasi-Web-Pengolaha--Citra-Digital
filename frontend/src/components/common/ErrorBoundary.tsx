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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-canvas p-6">
          <div className="bg-panel border border-panelBorder p-6 rounded-lg max-w-md w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-base font-bold text-white">Terjadi Kesalahan Aplikasi</h1>
            <p className="text-xs text-mutedText font-mono bg-subtleBg p-3 rounded text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accentHover text-white text-xs font-semibold rounded transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
