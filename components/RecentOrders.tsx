import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const RecentOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) setOrders(data);
        } catch (error) {
            console.error('Error fetching recent orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'canceled': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-orange-600 bg-orange-50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={16} />;
            case 'canceled': return <XCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-900">Pedidos Recentes</h3>
                <button className="text-sm text-brand-600 font-medium hover:text-brand-700">Ver Todos</button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-400">Carregando...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Nenhum pedido recente.</div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${getStatusColor(order.status)}`}>
                                    {getStatusIcon(order.status)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">
                                        {order.customer_name || 'Cliente Balcão'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        #{order.daily_number || order.id} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">R$ {order.total.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 capitalize">{order.type}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
