import { Component, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button type="button" variant="secondary" onClick={this.handleReset}>
                <RefreshCw size={14} />
                Tentar novamente
              </Button>
              <Button type="button" onClick={this.handleGoHome}>
                <Home size={14} />
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
