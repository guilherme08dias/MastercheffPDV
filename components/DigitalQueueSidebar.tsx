import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem } from '../types';
import { X, Clock, Play, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DigitalQueueProps {
    isOpen: boolean;
    onClose: () => void;
    onImportOrder: (order: Order, items: OrderItem[]) => void;
}

// Night Premium Redesign Forced Update V2
export const DigitalQueueSidebar: React.FC<DigitalQueueProps> = ({
    isOpen,
    onClose,
    onImportOrder
}) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchOrders(); // Initial fetch
            subscribeToOrders(); // Realtime
        }
    }, [isOpen]);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'pre_venda')
            .order('created_at', { ascending: true }); // Fila: FIFO

        if (data) setOrders(data);
        setLoading(false);
    };

    const subscribeToOrders = () => {
        const channel = supabase
            .channel('digital_queue')
            .on('postgres_changes', {
                event: '*', // Listen to everything related to pre_venda
                schema: 'public',
                table: 'orders',
                filter: 'status=eq.pre_venda'
            }, () => {
                fetchOrders(); // Refresh list on change
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVBxr');
                    audio.play().catch(() => { });
                } catch (e) { }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleImportClick = async (order: Order) => {
        // Fetch items
        const toastId = toast.loading('Carregando itens...');
        try {
            const { data: items, error } = await supabase
                .from('order_items')
                .select('*, product:products(*)') // Verify join
                .eq('order_id', order.id);

            if (error) throw error;

            if (!items || items.length === 0) {
                toast.error('Pedido vazio ou erro ao buscar itens.', { id: toastId });
                return;
            }

            onImportOrder(order, items as any); // Cast because of join
            toast.success('Pedido carregado no caixa!', { id: toastId });
            onClose();

        } catch (err) {
            console.error(err);
            toast.error('Erro ao importar pedido.', { id: toastId });
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-[#1C1C1E] shadow-2xl border-l border-zinc-800 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full text-white">
                    {/* Header */}
                    <div className="p-5 bg-[#1C1C1E] border-b border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Clock className="text-[#FFCC00]" size={20} />
                            <h2 className="font-bold text-lg">Fila Digital</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#1C1C1E]">
                        {loading ? (
                            <div className="text-center p-8 text-gray-400">Carregando...</div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-60 pb-20">
                                <Clock size={40} className="mb-3 opacity-20" />
                                <p>Nenhum pedido na fila.</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="bg-[#2C2C2E] p-4 rounded-2xl border border-zinc-800 hover:border-white/10 transition-all group shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-white leading-tight">{order.customer_name || 'Cliente'}</h3>
                                        <span className="text-xs font-medium bg-white/5 px-2 py-1 rounded-lg text-gray-400 border border-zinc-800 font-mono">
                                            {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4">
                                        <span className="text-[#10B981] font-black text-lg tracking-tight">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                        </span>
                                        <button
                                            onClick={() => handleImportClick(order)}
                                            className="bg-[#FFCC00] hover:brightness-110 text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-black/20 transition-all active:scale-95"
                                        >
                                            <Play size={14} fill="currentColor" />
                                            Atender
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-[#1C1C1E] border-t border-zinc-800 text-xs text-zinc-500 text-center">
                        <AlertCircle className="inline-block w-3 h-3 mb-0.5 mr-1" />
                        Pedidos nesta lista ainda não são "Oficiais".
                    </div>
                </div>
            </div>
        </>
    );
};
