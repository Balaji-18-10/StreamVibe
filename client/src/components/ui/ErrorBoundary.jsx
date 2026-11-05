import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button.jsx';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled StreamVibe UI Exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-6 text-white animate-fade-in">
          <div className="max-w-md w-full bg-[#17171D] border border-[#23232C] rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#FF3038]/10 border border-[#FF3038]/20 flex items-center justify-center text-[#FF3038]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                An unexpected interface error occurred. You can reload this view or return to the home feed.
              </p>
            </div>

            {this.state.error && process.env.NODE_ENV !== 'production' && (
              <pre className="w-full max-h-32 overflow-y-auto p-3 rounded-xl bg-black/50 border border-white/5 text-[11px] text-red-400 text-left font-mono whitespace-pre-wrap">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <div className="flex items-center gap-3 w-full pt-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Home}
                onClick={this.handleGoHome}
                className="flex-1 rounded-xl font-semibold"
              >
                Go Home
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={RefreshCw}
                onClick={this.handleReset}
                className="flex-1 rounded-xl font-bold"
              >
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
