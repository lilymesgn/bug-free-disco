// ============================================================
// Fit Tracker PRO — Error Boundary
// Wraps lazy-loaded routes so a chunk-load failure (e.g.
// bad network, TF.js OOM) shows a friendly retry screen
// instead of a blank white page.
// ============================================================
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error message, e.g. "AI Form Analyzer" */
  pageName?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    // Non-fatal — just log; don't re-throw
    console.warn('[PageErrorBoundary]', err.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError =
      this.state.message.includes('Loading chunk') ||
      this.state.message.includes('Failed to fetch') ||
      this.state.message.includes('dynamically imported module');

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>

        <h2 className="text-white text-lg mb-2" style={{ fontWeight: 700 }}>
          {this.props.pageName ? `Couldn't load ${this.props.pageName}` : 'Something went wrong'}
        </h2>

        <p className="text-gray-400 text-sm mb-1 max-w-xs">
          {isChunkError
            ? 'This page failed to load — usually a network issue.'
            : 'An unexpected error occurred on this page.'}
        </p>

        {!isChunkError && (
          <p className="text-gray-600 text-xs mb-5 max-w-xs font-mono break-all">
            {this.state.message.slice(0, 120)}
          </p>
        )}

        <button
          onClick={this.handleRetry}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-4"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}
