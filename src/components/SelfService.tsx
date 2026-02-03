import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, CartItem, Neighborhood, Tag, Addon, OrderType, PaymentMethod } from '../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { CartSidebar } from './CartSidebar';
import { ShoppingCart, ChefHat, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSuccess, playError } from '../utils/audio';
import { motion, AnimatePresence } from 'framer-motion';

export const SelfService: React.FC = () => {
    // Dados Estáticos
    const [products, setProducts] = useState<Product[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);

    // UI Stats
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [pRes, tRes, aRes] = await Promise.all([
            supabase.from('products').select('*').eq('is_available', true).order('menu_number', { ascending: true }),
            supabase.from('tags').select('*'),
            supabase.from('addons').select('*').eq('is_available', true)
        ]);

        if (pRes.data) {
            // Normalização de Categorias (Igual ao POS)
            const normalizedProducts = pRes.data.map(p => {
                let normalizedCategory = p.category;
                const nameLower = p.name.toLowerCase();

                if (p.category === 'porcoes' || nameLower.includes('porcao') || nameLower.includes('porção')) {
                    normalizedCategory = 'porcoes';
                } else if (nameLower.includes('xis')) {
                    normalizedCategory = 'xis';
                } else if (nameLower.includes('dog') || nameLower.includes('cachorro')) {
                    normalizedCategory = 'hotdog';
                } else if (p.category === 'Bebidas' || p.category === 'bebidas') {
                    normalizedCategory = 'bebida';
                }

                return { ...p, category: normalizedCategory };
            });
            setProducts(normalizedProducts);
        }
        if (tRes.data) setTags(tRes.data);
        if (aRes.data) setAddons(aRes.data);
    };

    // Cart Logic
    const addToCart = (item: CartItem) => {
        setCart([...cart, item]);
        setIsSidebarOpen(true); // Auto-open sidebar on add
        toast.success('Adicionado ao pedido!');
    };

    const removeFromCart = (tempId: string) => {
        setCart(cart.filter(item => item.tempId !== tempId));
    };

    const handleCheckout = async (
        name: string,
        type: OrderType, // Ignored mostly, always 'local' for self-service usually
        paymentMethod: PaymentMethod, // Ignored, pay at cashier
        neighborhood: Neighborhood | null, // Ignored
        discount?: any
    ) => {
        if (!name.trim()) {
            toast.error('Por favor, informe seu nome para identificação.');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // 1. Calculate Total (approximate, final calc at cashier)
            const subtotal = cart.reduce((acc, item) => {
                const addonsTotal = item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                return acc + ((item.product.price + addonsTotal) * item.quantity);
            }, 0);

            // 2. Create Order with status 'pre_venda'
            // Note: daily_number is NULL because it's not in production yet
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_name: name,
                    type: 'local', // Autoatendimento is usually local
                    payment_method: 'cash', // Placeholder, confirmed at cashier
                    total: subtotal,
                    status: 'pre_venda', // <--- KEY DIFFERENCE
                    // No shift_id needed strictly here, but better if we grab open shift? 
                    // Actually, let's leave shift_id null or fetch it. 
                    // If we leave it null, we need to make sure the cashier can see it.
                    // Better logic: fetch current shift ID backend side or allow null shift_id for pre-sales?
                    // Let's check schema. shift_id references shifts.
                    // We likely need a shift. But maybe the customer doesn't know the shift.
                    // Let's try to fetch the open shift first.
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 3. Create Items
            const itemsPayload = cart.map(item => {
                const addonsTotal = item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                const finalUnitPrice = item.product.price + addonsTotal;
                const addonsNote = item.addons?.map(a => `+ ${a.name}`).join(', ');
                const finalNotes = [item.notes, addonsNote].filter(Boolean).join(' | ');

                return {
                    order_id: orderData.id,
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: finalUnitPrice,
                    notes: finalNotes,
                    addons_detail: item.addons || []
                };
            });

            const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            // Success!
            playSuccess();
            setCart([]);
            setCustomerName('');
            setShowSuccessModal(true);

        } catch (error: any) {
            console.error('Erro no autoatendimento:', error);
            playError();
            toast.error('Erro ao enviar pedido. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter Products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Header Mobile Only (Simple) */}
            <div className="md:hidden bg-[#1a1a1a] p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
                <div className="flex items-center gap-2">
                    <ChefHat className="text-[#FFCC00]" />
                    <span className="text-white font-bold text-lg">Autoatendimento</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="relative p-2 text-white"
                >
                    <ShoppingCart />
                    {cart.length > 0 && (
                        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {cart.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Main Content: Product Grid */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto h-screen">
                {/* Categories for Self Service - Big Buttons/Pills */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'xis', label: 'Xis Tradicional' },
                        { id: 'hotdog', label: 'Hot Dogs' },
                        { id: 'porcoes', label: 'Porções' },
                        { id: 'bebida', label: 'Bebidas' }
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-6 py-3 rounded-full whitespace-nowrap font-medium transition-colors ${selectedCategory === cat.id
                                    ? 'bg-[#FFCC00] text-black shadow-lg'
                                    : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-0">
                    {filteredProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onClick={() => {
                                setSelectedProduct(product);
                                setIsModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Sidebar (Cart) */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 z-40 
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
                <div className="h-full flex flex-col">
                    <div className="p-4 bg-gray-100 border-b flex justify-between items-center md:hidden">
                        <span className="font-bold text-lg">Seu Pedido</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500">Fechar</button>
                    </div>

                    <CartSidebar
                        cart={cart}
                        onRemoveFromCart={removeFromCart}
                        onCheckout={handleCheckout}
                        customerName={customerName}
                        setCustomerName={setCustomerName}
                        total={cart.reduce((acc, item) => {
                            const addonsTotal = item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                            return acc + ((item.product.price + addonsTotal) * item.quantity);
                        }, 0)}
                        // Override props for Self-Service specific behavior
                        isSelfService={true}
                    />
                </div>
            </div>

            {/* Product Modal */}
            {selectedProduct && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    product={selectedProduct}
                    onAddToCart={addToCart}
                    tags={tags}
                    addons={addons}
                />
            )}

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    >
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-6">
                            <div className="flex justify-center">
                                <CheckCircle className="w-24 h-24 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">Pedido Enviado!</h2>
                            <p className="text-gray-600 text-lg">
                                Informe seu nome <strong>{customerName || 'no Caixa'}</strong> para realizar o pagamento.
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ O pedido só entra em produção após o pagamento no caixa.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800"
                            >
                                Fazer Novo Pedido
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
