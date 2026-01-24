import React from 'react';
import { ShoppingBag, Lock } from 'lucide-react';

export const WelcomePortal: React.FC = () => {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-fade-in relative selection:bg-[#FFCC00] selection:text-black">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1C1C1E] to-black opacity-50 z-0 pointer-events-none" />

            <div className="z-10 w-full max-w-md flex flex-col items-center gap-8">

                {/* Brand */}
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#FFCC00] tracking-tight">
                        MasterCheff
                    </h1>
                    <p className="text-gray-400 text-lg font-medium tracking-wide">
                        O melhor xis da cidade
                    </p>
                </div>

                {/* Main Action */}
                <div className="w-full space-y-4 mt-6">
                    <button
                        onClick={() => window.location.href = '/pedido-online'}
                        className="w-full py-6 bg-[#FFCC00] text-black text-xl font-black rounded-2xl shadow-xl shadow-orange-500/10 hover:bg-[#E5B800] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <ShoppingBag size={28} />
                        FAZER PEDIDO ONLINE
                    </button>
                    <p className="text-gray-500 text-sm">
                        Toque para ver nosso cardápio completo
                    </p>
                </div>

            </div>

            {/* Footer Team Access */}
            <div className="absolute bottom-8 z-10">
                <a
                    href="/gestao"
                    className="text-gray-600 hover:text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
                >
                    <Lock size={12} />
                    Acesso Equipe
                </a>
            </div>

        </div>
    );
};
