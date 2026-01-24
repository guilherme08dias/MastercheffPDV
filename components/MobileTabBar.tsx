import React from 'react';
import { Home, Grid, ShoppingBag, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileTabBarProps {
    currentView: string;
    onNavigate: (view: 'admin' | 'pos') => void;
    onLogout: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentView, onNavigate, onLogout }) => {

    // Configuração dos itens do menu
    const tabs = [
        {
            id: 'admin',
            label: 'Gestão',
            icon: Grid,
            onClick: () => onNavigate('admin')
        },
        {
            id: 'pos',
            label: 'PDV', // Ponto de Venda
            icon: ShoppingBag,
            onClick: () => onNavigate('pos')
        },
        {
            id: 'cardapio',
            label: 'Cardápio',
            icon: Home,
            onClick: () => window.open('/pedido-online', '_blank')
        },
        {
            id: 'logout',
            label: 'Sair',
            icon: LogOut,
            onClick: onLogout
        }
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-50 md:hidden">
            <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full h-16 shadow-2xl flex items-center justify-around px-2 relative overflow-hidden">

                {tabs.map((tab) => {
                    const isActive = currentView === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={tab.onClick}
                            className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full z-10"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="pillHighlight"
                                    className="absolute inset-0 bg-[#FFCC00] rounded-full -z-10 mx-2 my-2"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <Icon
                                size={20}
                                strokeWidth={2.5}
                                className={`transition-colors duration-200 ${isActive ? 'text-black' : 'text-white/60'
                                    }`}
                            />

                            {/* Label opcional - Ocultar se ativo para look mais limpo ou manter sempre? 
                                No Cardapio.tsx, o ativo oculta a label "CATEGORIAS". 
                                Aqui vamos manter simples: Texto muda de cor.
                            */}
                            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${isActive ? 'text-black' : 'text-white/40'
                                }`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
