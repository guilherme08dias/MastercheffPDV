import React, { useState } from 'react';
import { Home, Grid, ShoppingBag, LogOut, LayoutDashboard, Package, DollarSign, Users, AlertTriangle, BarChart3, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MobileTabBarProps {
    currentView: string;
    onNavigate: (view: 'admin' | 'pos') => void;
    onLogout: () => void;
    onNavigateToSection?: (section: string) => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentView, onNavigate, onLogout, onNavigateToSection }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleKillSwitch = async () => {
        if (!window.confirm("⚠️ ZERAR FILA DE IMPRESSÃO?\n\nUse isso apenas se a impressora estiver travada ou imprimindo sem parar.\n\nIsso marcará TODOS os pedidos pendentes como 'Impressos'.")) return;

        try {
            const { error } = await supabase.rpc('clear_print_queue');
            if (error) throw error;
            toast.success("Fila de impressão zerada!");
            setIsMenuOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao zerar fila.");
        }
    };

    const handleManagementClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleSubMenuClick = (section: string) => {
        if (onNavigateToSection) {
            onNavigateToSection(section);
            onNavigate('admin'); // Ensure we are on the admin view
        }
        setIsMenuOpen(false);
    };

    // Configuração dos itens do menu principal
    const tabs = [
        {
            id: 'admin',
            label: 'Gestão',
            icon: Grid,
            onClick: handleManagementClick,
            isActive: currentView === 'admin'
        },
        {
            id: 'pos',
            label: 'PDV',
            icon: ShoppingBag,
            onClick: () => onNavigate('pos'),
            isActive: currentView === 'pos'
        },
        {
            id: 'cardapio',
            label: 'Cardápio',
            icon: Home,
            onClick: () => window.open('/pedido-online', '_blank'),
            isActive: false
        },
        {
            id: 'logout',
            label: 'Sair',
            icon: LogOut,
            onClick: onLogout,
            isActive: false
        }
    ];

    const managementItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
        { id: 'stock', label: 'Estoque', icon: Package, color: 'text-purple-400' },
        { id: 'expenses', label: 'Financeiro', icon: DollarSign, color: 'text-green-400' },
        { id: 'reports', label: 'Analytics', icon: BarChart3, color: 'text-pink-400' },
        { id: 'users', label: 'Usuários', icon: Users, color: 'text-orange-400' },
        { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-gray-400' },
    ];

    return (
        <>
            {/* Backdrop for Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMenuOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Submenu Popover */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.9 }}
                        className="fixed bottom-24 left-4 right-4 bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 md:hidden"
                    >
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {managementItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSubMenuClick(item.id)}
                                    className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors gap-2"
                                >
                                    <item.icon size={24} className={item.color} />
                                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Kill Switch in Menu */}
                        <button
                            onClick={handleKillSwitch}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors font-bold text-sm"
                        >
                            <AlertTriangle size={18} />
                            ZERAR FILA DE IMPRESSÃO
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Tab Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-50 md:hidden">
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full h-16 shadow-2xl flex items-center justify-around px-2 relative overflow-hidden">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isMenuTrigger = tab.id === 'admin';
                        const showHighlight = tab.isActive || (isMenuTrigger && isMenuOpen);

                        return (
                            <button
                                key={tab.id}
                                onClick={tab.onClick}
                                className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full z-10"
                            >
                                {showHighlight && (
                                    <motion.div
                                        layoutId="pillHighlight"
                                        className="absolute inset-0 bg-[#FFCC00] rounded-full -z-10 mx-2 my-2"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                <Icon
                                    size={20}
                                    strokeWidth={2.5}
                                    className={`transition-colors duration-200 ${showHighlight ? 'text-black' : 'text-white/60'}`}
                                />

                                <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${showHighlight ? 'text-black' : 'text-white/40'}`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
