import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
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
                <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center p-4">
                    <div className="bg-black border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado.</h1>
                        <p className="text-gray-400 mb-6 text-sm">
                            O sistema encontrou um erro inesperado. Não se preocupe, seus dados de venda estão seguros.
                        </p>

                        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 mb-6 overflow-hidden">
                            <code className="text-xs text-red-400 font-mono break-all">
                                {this.state.error?.message || 'Erro desconhecido'}
                            </code>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-[#FFCC00] hover:bg-[#E5B800] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            <RefreshCw size={20} />
                            Recarregar Sistema
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
