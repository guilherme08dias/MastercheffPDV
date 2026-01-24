import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp } from 'lucide-react';

interface TrendingProduct {
    name: string;
    quantity: number;
    image_url?: string;
}

export const TrendingProducts: React.FC = () => {
    const [products, setProducts] = useState<TrendingProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrending();
    }, []);

    const fetchTrending = async () => {
        try {
            // Simplificação: Buscar itens dos últimos 50 pedidos para calcular trending
            const { data: orders } = await supabase
                .from('orders')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!orders?.length) {
                setLoading(false);
                return;
            }

            const orderIds = orders.map(o => o.id);
            const { data: items, error } = await supabase
                .from('order_items')
                .select('quantity, products(name)')
                .in('order_id', orderIds);

            if (error) {
                console.error("TrendingProducts: Erro ao buscar itens:", error);
            }

            console.log("TrendingProducts: Itens encontrados:", items);

            const productMap = new Map<string, TrendingProduct>();

            items?.forEach((item: any) => {
                const name = item.products?.name;
                if (!name) return;

                const current = productMap.get(name) || {
                    name,
                    quantity: 0
                };
                current.quantity += item.quantity;
                productMap.set(name, current);
            });

            const sorted = Array.from(productMap.values())
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setProducts(sorted);
        } catch (error) {
            console.error('Error fetching trending products:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col transition-colors">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Produtos em Alta</h3>
                <TrendingUp size={20} className="text-orange-500" />
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-8 text-gray-400">Carregando...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Sem dados suficientes.</div>
                ) : (
                    products.map((product, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                        {product.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">#{idx + 1} Mais vendido</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold px-2 py-1 rounded-full">
                                    {product.quantity} un
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
