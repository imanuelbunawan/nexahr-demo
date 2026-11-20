import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('[NexaHR ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      // Clear local storage and reload cleanly
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                NexaHR System Recovery
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                Terjadi Kendala Memuat Tampilan
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Aplikasi mendeteksi error pada status browser atau cache lokal. Anda dapat memuat ulang halaman atau membersihkan cache sesi untuk memulihkan sistem secara instan.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-left">
                <p className="text-[11px] font-mono text-slate-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
              >
                Reset Cache & Pulihkan
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
