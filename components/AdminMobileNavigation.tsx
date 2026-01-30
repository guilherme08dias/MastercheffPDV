import React, { useState } from 'react';
import { Home, Package, DollarSign, Menu, Users, ShoppingBag, LogOut, ExternalLink, X, BarChart3, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminMobileNavigationProps {
    activeView: string;
    onChangeView: (view: string) => void;
    onLogout: () => void;
    onNavigateToPos: () => void;
}

export const AdminMobileNavigation: React.FC<AdminMobileNavigationProps> = ({
    activeView,
    onChangeView,
    onLogout,
    onNavigateToPos
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Início', icon: Home },
        { id: 'stock', label: 'Estoque', icon: Package },
        { id: 'expenses', label: 'Financeiro', icon: DollarSign },
    ];

    const handleMoreClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuAction = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    return (
        <>
            {/* Bottom Sheet Menu (More) */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                        />
                        {/* Sheet */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#1C1C1E] rounded-t-3xl z-[100] border-t border-white/10 p-6 pb-24 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white">Gestão Rápida</h3>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-2 bg-[#2C2C2E] rounded-full text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => handleMenuAction(() => onChangeView('products'))}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${activeView === 'products' ? 'bg-[#FFCC00] border-[#FFCC00] text-black' : 'bg-[#2C2C2E] border-white/5 text-gray-300'}`}
                                >
                                    <ShoppingBag size={24} className="mb-2" />
                                    <span className="font-bold text-xs">Cardápio</span>
                                </button>

                                <button
                                    onClick={() => handleMenuAction(() => onChangeView('reports'))}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${activeView === 'reports' ? 'bg-[#FFCC00] border-[#FFCC00] text-black' : 'bg-[#2C2C2E] border-white/5 text-gray-300'}`}
                                >
                                    <BarChart3 size={24} className="mb-2" />
                                    <span className="font-bold text-xs">Relatórios</span>
                                </button>

                                <button
                                    onClick={() => handleMenuAction(() => onChangeView('users'))}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${activeView === 'users' ? 'bg-[#FFCC00] border-[#FFCC00] text-black' : 'bg-[#2C2C2E] border-white/5 text-gray-300'}`}
                                >
                                    <Users size={24} className="mb-2" />
                                    <span className="font-bold text-xs">Usuários</span>
                                </button>

                                <button
                                    onClick={() => handleMenuAction(() => onChangeView('settings'))}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${activeView === 'settings' ? 'bg-[#FFCC00] border-[#FFCC00] text-black' : 'bg-[#2C2C2E] border-white/5 text-gray-300'}`}
                                >
                                    <MapPin size={24} className="mb-2" />
                                    <span className="font-bold text-xs text-center">Taxas de Entrega</span>
                                </button>

                                <button
                                    onClick={() => handleMenuAction(onNavigateToPos)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#2C2C2E] border border-white/5 text-gray-300 active:bg-white/10"
                                >
                                    <ExternalLink size={24} className="mb-2" />
                                    <span className="font-bold text-xs">Ir ao PDV</span>
                                </button>

                                <button
                                    onClick={() => handleMenuAction(onLogout)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 active:bg-red-500/20"
                                >
                                    <LogOut size={24} className="mb-2" />
                                    <span className="font-bold text-xs">Sair</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Pill Hub */}
            <motion.div
                initial={{ y: 100, x: "-50%", opacity: 0 }}
                animate={{ y: 0, x: "-50%", opacity: 1 }}
                className="fixed bottom-6 left-1/2 z-[80] w-[90%] max-w-sm"
            >
                <div className="bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-1.5 flex items-center justify-between relative">

                    {navItems.map((item) => {
                        const isActive = activeView === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onChangeView(item.id);
                                    if (isMenuOpen) setIsMenuOpen(false);
                                }}
                                className={`relative flex items-center justify-center h-12 px-2 rounded-full transition-all duration-300 ${isActive ? 'flex-[1.5] bg-[#FFCC00] text-black shadow-lg mx-1' : 'flex-1 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={`relative z-10 ${isActive ? 'mr-1.5' : ''}`} strokeWidth={2.5} />
                                {isActive && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        className="text-[10px] font-bold whitespace-nowrap overflow-hidden relative z-10"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </button>
                        );
                    })}

                    {/* Gestão Button (More) */}
                    <button
                        onClick={handleMoreClick}
                        className={`relative flex items-center justify-center h-12 px-2 rounded-full transition-all duration-300 ${isMenuOpen ? 'flex-1 bg-white/20 text-white mx-1' : 'flex-1 text-gray-400 hover:text-white'}`}
                    >
                        <Menu size={20} strokeWidth={2.5} className={isMenuOpen ? 'mr-1.5' : ''} />
                        {isMenuOpen && (
                            <span className="text-[10px] font-bold whitespace-nowrap overflow-hidden relative z-10">
                                Gestão
                            </span>
                        )}
                    </button>

                </div>
            </motion.div>
        </>
    );
};
