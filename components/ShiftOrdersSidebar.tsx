import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Edit2, Trash2, RefreshCw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShiftOrdersSidebarProps {
    shiftId: string;
    onEditOrder: (order: any) => void;
    onClose?: () => void; // New optional prop
}

export const ShiftOrdersSidebar: React.FC<ShiftOrdersSidebarProps> = ({ shiftId, onEditOrder, onClose }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ... (rest of state/refs)

    // ... (fetchOrders function)
    // (omitted for brevity, keep existing code)

    // ... (useEffect and handlers)
    // (omitted for brevity, keep existing code)
    const lastPrintTimeRef = useRef<Map<string, number>>(new Map());

    const fetchOrders = async () => {
        try {
            // 24-hour fallback: if no shiftId, get last 24h orders
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            let query = supabase
                .from('orders')
                .select('*, order_items(*)')
                .order('created_at', { ascending: false });

            if (shiftId) {
                query = query.eq('shift_id', shiftId);
            } else {
                query = query.gte('created_at', twentyFourHoursAgo);
            }

            const { data, error } = await query;

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Erro ao carregar pedidos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Real-time subscription
        const subscription = supabase
            .channel('shift-orders')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [shiftId]);

    const handleManualRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const handleCancel = async (orderId: string) => {
        if (!window.confirm('Cancelar este pedido? Isso removerá o valor do caixa.')) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'canceled' })
                .eq('id', orderId);

            if (error) throw error;
            toast.success('Pedido cancelado');
        } catch (e) {
            toast.error('Erro ao cancelar');
            console.error(e);
        }
    };

    const handleReprint = async (order: any) => {
        const orderId = order.id.toString();
        const now = Date.now();
        const lastPrintTime = lastPrintTimeRef.current.get(orderId) || 0;
        const COOLDOWN_MS = 3000; // 3 seconds cooldown

        // PRINT LOCK: Check cooldown
        if (now - lastPrintTime < COOLDOWN_MS) {
            console.log('🔒 Reimpressão em cooldown, aguarde...', orderId);
            toast.error('Aguarde 3 segundos antes de reimprimir');
            return;
        }

        // RECORD PRINT TIME
        lastPrintTimeRef.current.set(orderId, now);
        console.log('🖨️ Solicitando reimpressão no servidor:', orderId);

        try {
            // RESET PRINT STATUS TO FALSE
            const { error } = await supabase
                .from('orders')
                .update({
                    printed: false,
                    print_attempts: 0
                })
                .eq('id', orderId);

            if (error) throw error;

            toast.success(`Pedido #${order.daily_number || order.id} enviado para a fila de impressão!`);

        } catch (e) {
            toast.error('Erro ao solicitar reimpressão');
            console.error(e);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-400';
            case 'completed':
                return 'bg-green-500/10 text-green-400';
            case 'canceled':
                return 'bg-red-500/10 text-red-400';
            default:
                return 'bg-gray-500/10 text-gray-400';
        }
    };

    return (
        <div className="w-full bg-[#1C1C1E] border-r border-white/5 flex flex-col h-full">
            <div className="p-4 border-b border-white/5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between sticky top-0 bg-[#1C1C1E] z-10">
                <h2 className="text-white font-bold flex items-center gap-2 text-lg">
                    <Clock size={18} className="text-[#FFCC00]" />
                    {shiftId ? 'Pedidos do Turno' : 'Últimas 24h'}
                </h2>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full h-8 flex items-center">
                        {orders.length}
                    </span>

                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#FFCC00] bg-white/5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                        title="Atualizar"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            title="Fechar"
                        >
                            <span className="sr-only">Fechar</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-4"><span className="animate-spin text-[#FFCC00]">⌛</span></div>
                ) : orders.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm mt-4">Nenhum pedido encontrado</p>
                ) : (
                    orders.map(order => (
                        <div
                            key={order.id}
                            className={`bg-[#2C2C2E] p-3 rounded-xl border transition-all group ${order.status === 'canceled'
                                ? 'border-red-500/20 opacity-60'
                                : 'border-white/5 hover:border-white/10'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-[#FFCC00] font-bold text-lg">
                                        #{order.daily_number || order.id}
                                    </span>
                                    <p className="text-white font-medium text-sm truncate w-32" title={order.customer_name}>
                                        {order.customer_name || 'Consumidor'}
                                    </p>
                                </div>
                                <span className={`text-white font-bold ${order.status === 'canceled' ? 'line-through text-red-400' : ''}`}>
                                    R$ {(order.total || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${order.type === 'delivery' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                                        }`}>
                                        {order.type}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${getStatusBadge(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleReprint(order)}
                                        className="p-1.5 text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Reimprimir"
                                    >
                                        <Printer size={14} />
                                    </button>
                                    {order.status !== 'canceled' && (
                                        <>
                                            <button
                                                onClick={() => onEditOrder(order)}
                                                className="p-1.5 text-white/60 hover:text-[#FFCC00] hover:bg-white/5 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleCancel(order.id)}
                                                className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Cancelar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
