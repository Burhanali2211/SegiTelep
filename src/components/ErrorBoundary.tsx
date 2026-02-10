import React, { Component, ReactNode } from 'react';

const LAST_PROJECT_KEY = 'lastVisualProjectId';

function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // #region agent log
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    // fetch('http://127.0.0.1:7242/ingest/784514f5-0201-4165-905e-642cc13d7946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:componentDidCatch',message:'ErrorBoundary caught',data:{errorMsg:msg,componentStack:errorInfo.componentStack?.slice(0,500),isTauri:typeof window!=='undefined'&&'__TAURI__'in window},timestamp:Date.now(),hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
  }

  getSafeErrorMessage(): string {
    try {
      const err = this.state.error;
      if (err == null) return 'An unexpected error occurred';
      if (err instanceof Error) {
        const msg = err.message;
        return typeof msg === 'string' ? msg : 'An unexpected error occurred';
      }
      if (typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string') {
        return (err as Error).message;
      }
      return 'An unexpected error occurred';
    } catch {
      return 'An unexpected error occurred';
    }
  }

  handleResetAndReload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem(LAST_PROJECT_KEY);
    } catch {
      // Ignore storage errors
    }
    try {
      if (isTauriApp()) {
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (isTauriApp()) {
        import('@tauri-apps/plugin-process').then(({ relaunch }) => relaunch()).catch(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center p-8 max-w-lg">
            <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              The application encountered an error. This can happen after reopening the app if a
              project failed to load correctly.
            </p>
            <p className="text-sm text-muted-foreground mb-4 font-mono break-all">
              {this.getSafeErrorMessage()}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Reset & Start Fresh
              </button>
              <button
                type="button"
                onClick={this.handleRefresh}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
