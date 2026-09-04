import { Component, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-brand-danger" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Algo deu errado
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ocorreu um erro inesperado. Tente novamente ou volte para a
                página inicial.
              </p>
            </div>

            {isDev && this.state.error && (
              <div className="p-4 rounded-xl bg-surface-2 border border-border text-left overflow-auto max-h-48">
                <p className="text-xs font-mono text-brand-danger mb-2 font-bold">
                  {this.state.error.message}
                </p>
                <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap break-all">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="min-h-11 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-foreground text-sm font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <RefreshCw size={14} />
                Tentar novamente
              </button>
              <button
                onClick={this.handleGoHome}
                className="min-h-11 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:opacity-90 transition-opacity text-black text-sm font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Home size={14} />
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
