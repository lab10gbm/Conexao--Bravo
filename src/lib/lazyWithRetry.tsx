import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * Resilient dynamic import wrapper with automatic retries, exponential backoff,
 * and robust export handling to prevent "Failed to fetch dynamically imported module" errors.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  retries = 3,
  interval = 500
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let currentRetries = retries;
    let delay = interval;

    while (true) {
      try {
        const module = await factory();
        if (module && module.default) {
          return module;
        }
        if (module && typeof module === 'object') {
          for (const key of Object.keys(module)) {
            if (typeof module[key] === 'function') {
              return { default: module[key] };
            }
          }
        }
        return { default: module };
      } catch (error: any) {
        if (currentRetries <= 0) {
          console.error('[lazyWithRetry] Falha final ao carregar módulo após tentativas:', error?.message || error);
          throw error;
        }
        currentRetries--;
        console.warn(
          `[lazyWithRetry] Tentativa falhou (${error?.message || error}). Tentando novamente em ${delay}ms... (${currentRetries} restantes)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 2500);
      }
    }
  });
}

interface SubModuleErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
  onBack?: () => void;
}

interface SubModuleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Graceful error boundary for sub-modules that catches dynamic import and chunk-loading errors
 * without taking down the entire dashboard or triggering full-screen crash boundaries.
 */
export class SubModuleErrorBoundary extends Component<SubModuleErrorBoundaryProps, SubModuleErrorBoundaryState> {
  constructor(props: SubModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SubModuleErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SubModuleErrorBoundary] Erro capturado ao carregar submódulo:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 sm:p-12 shadow-sm text-center flex flex-col items-center justify-center gap-4 my-4 max-w-xl mx-auto">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              Instabilidade ao carregar {this.props.moduleName || 'módulo'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              O módulo não pôde ser carregado no momento. Isso geralmente ocorre durante atualizações do servidor ou instabilidade passageira da conexão.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
            {this.props.onBack && (
              <button
                type="button"
                onClick={this.props.onBack}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
