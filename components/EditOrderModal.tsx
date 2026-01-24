import React, { useState, useEffect } from 'react';
import { Order, OrderItem, Product, CartItem, Tag } from '../types';
import { X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';

interface EditOrderModalProps {
    order: Order | null;
    existingItems: OrderItem[];
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
    order,
    existingItems,
    isOpen,
    onClose,
    onSave
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [newItems, setNewItems] = useState<CartItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadProducts();
            loadTags();
            setNewItems([]);
        }
    }, [isOpen]);

    const loadProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)
            .order('name');
        if (data) setProducts(data);
    };

    const loadTags = async () => {
        const { data } = await supabase.from('tags').select('*');
        if (data) setTags(data);
    };

    const handleAddToCart = (item: CartItem) => {
        setNewItems([...newItems, item]);
        setSelectedProduct(null);
    };

    const handleRemoveNewItem = (tempId: string) => {
        setNewItems(newItems.filter(item => item.tempId !== tempId));
    };

    const calculateNewTotal = () => {
        const existingTotal = existingItems.reduce((acc, item) =>
            acc + (item.unit_price * item.quantity), 0);
        const newTotal = newItems.reduce((acc, item) =>
            acc + (item.product.price * item.quantity), 0);
        return existingTotal + newTotal + (order?.delivery_fee_snapshot || 0);
    };

    const handleSave = async () => {
        if (!order || newItems.length === 0) return;

        setLoading(true);
        try {
            // Inserir novos itens
            const itemsPayload = newItems.map(item => ({
                order_id: order.id,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;

            // Atualizar total do pedido
            const newTotal = calculateNewTotal();
            const { error: orderError } = await supabase
                .from('orders')
                .update({ total: newTotal })
                .eq('id', order.id);

            if (orderError) throw orderError;

            alert('Itens adicionados com sucesso!');
            onSave();
            onClose();
        } catch (error: any) {
            alert(`Erro ao adicionar itens: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Editar Pedido #{order.id}</h2>
                        <p className="text-sm text-gray-500 mt-1">Cliente: {order.customer_name || 'Balcão'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Itens Existentes */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Itens Atuais</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            {existingItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700">
                                        {item.quantity}x {item.product_name}
                                        {item.notes && <span className="text-gray-500 italic ml-2">({item.notes})</span>}
                                    </span>
                                    <span className="font-semibold">R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Novos Itens */}
                    {newItems.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Novos Itens</h3>
                            <div className="bg-green-50 rounded-lg p-4 space-y-2">
                                {newItems.map((item) => (
                                    <div key={item.tempId} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 flex-1">
                                            {item.quantity}x {item.product.name}
                                            {item.notes && <span className="text-gray-500 italic ml-2">({item.notes})</span>}
                                        </span>
                                        <span className="font-semibold mr-3">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                        <button
                                            onClick={() => handleRemoveNewItem(item.tempId)}
                                            className="text-yellow-500 hover:text-yellow-700"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seletor de Produtos */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Plus size={20} />
                            Adicionar Produtos
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {products.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onClick={() => setSelectedProduct(product)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-gray-600">
                            <p>Total Anterior: R$ {order.total.toFixed(2)}</p>
                            {newItems.length > 0 && (
                                <p className="text-green-600 font-semibold">
                                    Novo Total: R$ {calculateNewTotal().toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || newItems.length === 0}
                            className="flex-1 py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvando...' : `Adicionar ${newItems.length} ${newItems.length === 1 ? 'Item' : 'Itens'}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAddToCart={handleAddToCart}
                availableTags={tags}
            />
        </div>
    );
};
