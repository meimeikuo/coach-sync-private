import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-red-100">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">發生了一些錯誤</h1>
            <p className="text-slate-500 mb-6">
              抱歉，系統目前遇到一些問題。請嘗試重新整理頁面，或聯繫管理員。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all"
            >
              重新整理
            </button>
            {error && (
              <pre className="mt-6 p-4 bg-slate-100 rounded-lg text-left text-xs overflow-auto max-h-40 text-red-600">
                {error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
