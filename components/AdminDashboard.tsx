import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Users, ShoppingBag, TrendingUp, Bell, Trash2, Edit2 } from 'lucide-react';
import { removeAccents } from '../utils/stringUtils';
import toast from 'react-hot-toast';
import { Profile } from '../types';
import { Sidebar } from './Sidebar';
import { StatsCard } from './StatsCard';
import { ProductManager } from './ProductManager';
import { SalesReports } from './SalesReports';
import { ExpenseManager } from './ExpenseManager';
import { UserManagement } from './UserManagement';
import { StockManager } from './StockManager';
import { DeliverySettings } from './DeliverySettings';
import { AdminMobileNavigation } from './AdminMobileNavigation';

import { useIsMobile } from '../hooks/useIsMobile';

interface AdminDashboardProps {
  user: Profile;
  onNavigateToPos: () => void;
  onLogout: () => void;
  activeSection?: string; // New prop
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onNavigateToPos, onLogout, activeSection }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with external navigation (Mobile Tab Bar)
  useEffect(() => {
    if (activeSection) {
      setCurrentView(activeSection);
    }
  }, [activeSection]);

  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    netSales: 0,
    grossTotal: 0,
    totalDeliveryFees: 0,
    cashTotal: 0,
    pixTotal: 0,
    creditTotal: 0,
    debitTotal: 0,
    currentShiftName: '',
    currentShiftStatus: 'closed' as 'open' | 'closed',
    isShiftActive: false,
    activeShiftId: null as string | null,
    topFood: [] as { name: string; quantity: number; total: number }[],
    topDrinks: [] as { name: string; quantity: number; total: number }[],
    recentOrders: [] as any[]
  });

  useEffect(() => {
    // Security Guard: Redirect standard users immediately
    if (user.role !== 'admin') {
      toast.error('Acesso restrito ao Administrador');
      onNavigateToPos();
      return;
    }
    fetchDashboardStats();
  }, [user.role]); // Re-run if role changes (unlikely but safe)

  useEffect(() => {
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    const shiftsChannel = supabase
      .channel('shifts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        fetchDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(shiftsChannel);
    };
  }, []);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    console.log("AdminDashboard: fetching stats (v-fix-delivery-snapshot)...");
    try {
      // 1. Fetch latest shift for operational cards
      const { data: latestShift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shiftError) {
        console.error('Error fetching shift:', shiftError);
      }

      if (!latestShift) {
        setStats({
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          netSales: 0,
          grossTotal: 0,
          totalDeliveryFees: 0,
          cashTotal: 0,
          pixTotal: 0,
          creditTotal: 0,
          debitTotal: 0,
          currentShiftName: '',
          currentShiftStatus: 'closed',
          isShiftActive: false,
          activeShiftId: null,
          topFood: [],
          topDrinks: [],
          recentOrders: []
        });
        setIsLoading(false);
        return;
      }

      // 2. Fetch orders for current shift
      const { data: ordersForBreakdown, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, payment_method, delivery_fee_snapshot') // Reverted to snapshot
        .eq('shift_id', latestShift.id)
        .neq('status', 'canceled');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }

      let cashTotal = 0, pixTotal = 0, creditTotal = 0, debitTotal = 0;
      let grossTotal = 0;
      let totalDeliveryFees = 0;
      let totalOrders = ordersForBreakdown?.length || 0;

      ordersForBreakdown?.forEach((order: any) => {
        const amount = order.total || 0;
        // Correctly read fee
        const fee = order.delivery_fee_snapshot || 0;

        grossTotal += amount;
        totalDeliveryFees += fee;

        switch (order.payment_method) {
          case 'cash': cashTotal += amount; break;
          case 'pix': pixTotal += amount; break;
          case 'credit': creditTotal += amount; break;
          case 'debit': debitTotal += amount; break;
        }
      });

      const netSales = grossTotal - totalDeliveryFees;
      const averageTicket = totalOrders > 0 ? grossTotal / totalOrders : 0;

      // 3. Fetch top products (with proper join)
      const orderIds = ordersForBreakdown?.map(o => o.id) || [];
      // Join products to get name. 'product_name' column does not exist on order_items.
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, unit_price, product:products(name, category)')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      }

      const productMap = new Map<string, { quantity: number; total: number; category: string }>();
      orderItems?.forEach((item: any) => {
        // Access nested name safely
        const name = item.product?.name || 'Desconhecido';
        const category = item.product?.category || 'outros';
        const current = productMap.get(name) || { quantity: 0, total: 0, category };
        productMap.set(name, {
          quantity: current.quantity + (item.quantity || 0),
          total: current.total + ((item.quantity || 0) * (item.unit_price || 0)),
          category
        });
      });

      const allTopProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name: removeAccents(name),
          quantity: data.quantity || 0,
          total: data.total || 0,
          category: data.category
        }))
        .sort((a, b) => b.quantity - a.quantity);

      const topFood = allTopProducts.filter(p => !p.category.toLowerCase().includes('bebida')).slice(0, 5);
      const topDrinks = allTopProducts.filter(p => p.category.toLowerCase().includes('bebida')).slice(0, 5); // 4. Fetch recent orders
      const { data: recentOrders, error: recentError } = await supabase
        .from('orders')
        .select('id, daily_number, customer_name, total, type, created_at') // Changed total_amount to total
        .eq('shift_id', latestShift.id)
        .neq('status', 'canceled')
        .order('created_at', { ascending: false })
        .limit(10);


      if (recentError) {
        console.error('Error fetching recent orders:', recentError);
      }

      setStats({
        totalSales: grossTotal || 0,
        totalOrders: totalOrders || 0,
        averageTicket: averageTicket || 0,
        netSales: netSales || 0,
        grossTotal: grossTotal || 0,
        totalDeliveryFees: totalDeliveryFees || 0,
        cashTotal: cashTotal || 0,
        pixTotal: pixTotal || 0,
        creditTotal: creditTotal || 0,
        debitTotal: debitTotal || 0,
        currentShiftName: latestShift.name || '',
        currentShiftStatus: latestShift.status || 'closed',
        isShiftActive: latestShift.status === 'open',
        activeShiftId: latestShift.id,
        topFood: topFood || [],
        topDrinks: topDrinks || [],
        recentOrders: recentOrders || []
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Erro ao carregar dados do dashboard');
      // Set default values on error
      setStats({
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        netSales: 0,
        grossTotal: 0,
        totalDeliveryFees: 0,
        cashTotal: 0,
        pixTotal: 0,
        creditTotal: 0,
        debitTotal: 0,
        currentShiftName: '',
        currentShiftStatus: 'closed',
        isShiftActive: false,
        activeShiftId: null,
        topFood: [],
        topDrinks: [],
        recentOrders: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'pos') {
      // Navigate to fullscreen POS
      onNavigateToPos();
    } else {
      setCurrentView(view);
    }
  };

  const renderDashboardView = () => (
    <div className="space-y-6">
      {/* Shift Status Banner */}
      <div className={`p-6 rounded-2xl border ${stats.isShiftActive ? 'bg-[#1C1C1E] border-green-600/30' : 'bg-[#1C1C1E] border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-lg">
              {stats.isShiftActive ? `Turno Aberto: ${stats.currentShiftName}` : 'Nenhum turno aberto'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {stats.isShiftActive ? 'Caixa em operacao' : 'Abra um turno para comecar as vendas'}
            </p>
          </div>
          <button
            onClick={onNavigateToPos}
            className="px-6 py-3 bg-[#FFCC00] hover:bg-[#E5B800] text-black font-semibold rounded-2xl transition-all active:scale-95"
          >
            {stats.isShiftActive ? 'Ir para PDV' : 'Abrir Caixa'}
          </button>
        </div>
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 items-stretch">
        <StatsCard
          label="Faturamento Liquido"
          value={`R$ ${(stats.netSales || 0).toFixed(2)}`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          label="Taxas Motoboy"
          value={`R$ ${(stats.totalDeliveryFees || 0).toFixed(2)}`}
          icon={Users}
          color="orange"
        />
        <StatsCard
          label="Total em Caixa"
          value={`R$ ${(stats.grossTotal || 0).toFixed(2)}`}
          icon={ShoppingBag}
          color="blue"
        />
        <StatsCard
          label="Ticket Medio"
          value={`R$ ${(stats.averageTicket || 0).toFixed(2)}`}
          icon={TrendingUp}
          color="brand"
        />
      </div>

      {/* Top Products & Recent Orders - Symmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch h-[500px]">
        {/* Top Products Card */}
        <div className="bg-[#1C1C1E] p-6 rounded-3xl border border-white/5 flex flex-col h-full overflow-hidden">
          <h3 className="text-lg font-bold text-white/90 mb-6 shrink-0">Top Produtos</h3>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            {/* Food Section */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Lanches & Porções</h4>
              <div className="space-y-2">
                {stats.topFood?.length > 0 ? (
                  stats.topFood.map((product, index) => (
                    <div key={`food-${index}`} className="flex justify-between items-center p-3 hover:bg-[#2C2C2E] rounded-xl transition-colors border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-white line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.quantity} vendidos</p>
                        </div>
                      </div>
                      <p className="font-semibold text-[#FFCC00] shrink-0">R$ {product.total.toFixed(2)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm py-4 italic px-2">Nenhum lanche vendido</p>
                )}
              </div>
            </div>

            <div className="h-px bg-white/5 my-2"></div>

            {/* Drinks Section */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Bebidas</h4>
              <div className="space-y-2">
                {stats.topDrinks?.length > 0 ? (
                  stats.topDrinks.map((product, index) => (
                    <div key={`drink-${index}`} className="flex justify-between items-center p-3 hover:bg-[#2C2C2E] rounded-xl transition-colors border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-white line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.quantity} vendidos</p>
                        </div>
                      </div>
                      <p className="font-semibold text-[#FFCC00] shrink-0">R$ {product.total.toFixed(2)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm py-4 italic px-2">Nenhuma bebida vendida</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders Card */}
        <div className="bg-[#1C1C1E] p-0 rounded-3xl border border-white/5 flex flex-col h-full overflow-hidden">
          <div className="p-6 pb-4 border-b border-white/5 shrink-0">
            <h3 className="text-lg font-bold text-white/90">Últimos Pedidos</h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {stats.recentOrders?.length > 0 ? (
              <>
                {/* Mobile View: Cards */}
                <div className="md:hidden p-4 space-y-2">
                  {stats.recentOrders.slice(0, 20).map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-[#2C2C2E]/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#3A3A3C] flex items-center justify-center text-white font-bold text-sm shrink-0">
                          #{order.daily_number || order.id}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${order.type === 'delivery' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                              {order.type === 'delivery' ? 'Entrega' : 'Balcão'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 font-medium truncate max-w-[120px]">{removeAccents(order.customer_name || 'Cliente')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#FFCC00]">R$ {(order.total || 0).toFixed(2)}</p>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Cancelar este pedido?')) return;
                            const { error } = await supabase.from('orders').update({ status: 'canceled' }).eq('id', order.id);
                            if (error) toast.error('Erro ao cancelar');
                            else {
                              toast.success('Pedido cancelado');
                              fetchDashboardStats();
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-400 mt-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table */}
                <table className="hidden md:table w-full text-left border-collapse">
                  <thead className="bg-[#1C1C1E] sticky top-0 z-10">
                    <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="py-3 px-6 font-medium">#</th>
                      <th className="py-3 px-6 font-medium">Cliente</th>
                      <th className="py-3 px-6 font-medium text-center">Tipo</th>
                      <th className="py-3 px-6 font-medium text-right">Total</th>
                      <th className="py-3 px-6 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {stats.recentOrders.slice(0, 50).map((order) => (
                      <tr key={order.id} className="hover:bg-[#2C2C2E] transition-colors group">
                        <td className="py-3 px-6 font-bold text-white">#{order.daily_number || order.id}</td>
                        <td className="py-3 px-6 text-gray-300">{removeAccents(order.customer_name || 'Cliente')}</td>
                        <td className="py-3 px-6 text-center">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${order.type === 'delivery' ? 'bg-blue-900/20 text-blue-400 border border-blue-500/20' : 'bg-green-900/20 text-green-400 border border-green-500/20'}`}>
                            {order.type === 'delivery' ? 'Entrega' : 'Balcão'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-[#FFCC00]">R$ {(order.total || 0).toFixed(2)}</td>
                        <td className="py-3 px-6 text-right">
                          <button
                            onClick={async () => {
                              if (!window.confirm('Cancelar este pedido?')) return;
                              const { error } = await supabase.from('orders').update({ status: 'canceled' }).eq('id', order.id);
                              if (error) toast.error('Erro ao cancelar');
                              else {
                                toast.success('Pedido cancelado');
                                fetchDashboardStats();
                              }
                            }}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                            title="Cancelar Pedido"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8 flex items-center justify-center h-full">Nenhum pedido recente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden">
      {!isMobile && (
        <Sidebar
          currentView={currentView}
          onChangeView={handleViewChange}
          onLogout={onLogout}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          userRole={user.role}
        />
      )}

      {/* Main Content Area - Scrollable */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${!isMobile ? 'ml-0' : ''}`}>
        {/* Note: Sidebar is fixed in its component but here we treat layout as flex row. 
            Actually Sidebar component is likely fixed position based on previous code. 
            Let's check Sidebar.tsx later. standard Sidebar pattern usually is static in flex container or fixed. 
            Assuming Sidebar is static for now based on flex container, or if fixed we need margin.
            Line 448 in original was: ml-16 md:ml-64.
            If I change wrapper to flex-1, it implies Sidebar is IN the flex flow or I need to keep margin. 
            Let's keep the margin logic if Sidebar is fixed. 
        */}
        <div className={`flex-1 overflow-y-auto ${!isMobile ? (isSidebarCollapsed ? 'ml-20' : 'ml-64') : 'pb-24'} transition-all duration-300`}>
          <div className="p-4 md:p-8 space-y-6">
            {/* Mobile Admin Navigation Slider (REMOVED - Using Pill Hub) */}
            {/* <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar -mx-4 px-4"> ... </div> */}

            <div className="flex flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl md:text-4xl font-bold tracking-tight text-white">
                    {currentView === 'dashboard' && (isMobile ? 'Visão Geral' : 'Dashboard')}
                    {currentView === 'products' && (isMobile ? 'Gerenciar Cardápio' : 'Cardápio')}
                    {currentView === 'stock' && (isMobile ? 'Estoque' : 'Controle de Estoque')}
                    {currentView === 'expenses' && (isMobile ? 'Despesas' : 'Gerenciar Despesas')}
                    {currentView === 'reports' && (isMobile ? 'Relatórios' : 'Analytics')}
                    {currentView === 'users' && (isMobile ? 'Equipe' : 'Usuários')}
                    {currentView === 'settings' && (isMobile ? 'Logística' : 'Configurações')}
                  </h1>
                  <button className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors relative">
                    <Bell size={18} className="text-[#FFCC00]" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#1C1C1E]"></span>
                  </button>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-base mt-0.5">
                  Bem-vindo, {removeAccents(user?.full_name || user?.email || 'Usuario')}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-4">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative">
                  <Bell size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
              </div>
            ) : (
              <>
                {currentView === 'dashboard' && renderDashboardView()}
                {currentView === 'products' && <ProductManager />}
                {currentView === 'stock' && <StockManager />}
                {currentView === 'expenses' && <ExpenseManager />}
                {currentView === 'reports' && <SalesReports />}
                {currentView === 'users' && <UserManagement />}
                {currentView === 'settings' && <DeliverySettings />}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="lg:hidden">
        <AdminMobileNavigation
          activeView={currentView}
          onChangeView={setCurrentView}
          onLogout={onLogout}
          onNavigateToPos={onNavigateToPos}
        />
      </div>
    </div>
  );
};