import React from 'react';
import { LayoutDashboard, ShoppingBag, Users, BarChart3, Settings, LogOut, UtensilsCrossed, DollarSign, ChevronLeft, ChevronRight, Package, MapPin } from 'lucide-react';

interface SidebarProps {
    currentView: string;
    onChangeView: (view: any) => void;
    onLogout: () => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
    userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, isCollapsed, toggleSidebar, userRole }) => {
    let menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'pos', label: 'PDV (Vendas)', icon: ShoppingBag },
        { id: 'products', label: 'Cardápio', icon: UtensilsCrossed },
        { id: 'stock', label: 'Estoque', icon: Package },
        { id: 'expenses', label: 'Despesas', icon: DollarSign },
        { id: 'reports', label: 'Analytics', icon: BarChart3 },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'settings', label: 'Taxas de Entrega', icon: MapPin },
    ];

    // Security Filter: Standard users only see POS
    if (userRole !== 'admin') {
        menuItems = [
            { id: 'pos', label: 'Fazer Pedido', icon: ShoppingBag }
        ];
    }

    return (
        <div
            className={`${isCollapsed ? 'w-16 md:w-20' : 'w-16 md:w-64'} backdrop-blur-xl bg-black/60 h-screen fixed left-0 top-0 border-r border-white/10 flex flex-col z-20 transition-all duration-300`}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-9 bg-[#1C1C1E] border border-white/10 rounded-full p-1 shadow-sm hover:bg-[#2C2C2E] text-gray-400 hover:text-white transition-colors z-30"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Logo */}
            <div className="p-6 flex items-center gap-3 justify-center md:justify-start">
                <div className="w-10 h-10 relative flex-shrink-0">
                    <img src="/card_logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="hidden md:block font-bold text-xl text-white tracking-tight whitespace-nowrap overflow-hidden">MasterPedidos</h1>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
                            className={`w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-200 group
                                ${isActive
                                    ? 'bg-[#FFCC00] text-black font-semibold'
                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                } ${isCollapsed ? 'justify-center' : ''}`}
                            title={item.label}
                        >
                            <Icon size={22} className={`flex-shrink-0 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-white'}`} />
                            <span className="hidden md:inline whitespace-nowrap overflow-hidden">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center md:justify-start gap-4 px-3 py-3 rounded-2xl text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                    title="Sair"
                >
                    <LogOut size={22} />
                    <span className="hidden md:inline">Sair</span>
                </button>
                <p className="hidden md:block text-xs text-center text-gray-500 mt-4">v1.0.0</p>
            </div>
        </div>
    );
};
