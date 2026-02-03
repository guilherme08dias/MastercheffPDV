import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, CartItem, Neighborhood, Tag, Addon, OrderType, PaymentMethod } from '../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { CartSidebar } from './CartSidebar';
import { ShoppingCart, ChefHat, CheckCircle, Utensils, ShoppingBag, ClipboardList, Search, Grid, X, ChevronDown, Plus } from 'lucide-react';
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

    // UI Navigation States (Copied from Cardapio.tsx)
    const [showSearchExpanded, setShowSearchExpanded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

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
        type: OrderType, // Ignored mostly
        paymentMethod: PaymentMethod, // Ignored
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
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_name: name,
                    type: 'local',
                    payment_method: 'cash', // Placeholder
                    total: subtotal,
                    status: 'pre_venda',
                    // shift_id is left null intentionally or could be fetched. 
                    // RLS update in phase 4 might be needed if anonymous users can't insert.
                    // But currently public insert is allowed for orders.
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
        <div className="min-h-screen bg-[#1C1C1E] flex flex-col md:flex-row text-white font-sans selection:bg-[#FFCC00] selection:text-black">
            {/* HEADER IDENTICAL TO CARDAPIO.TSX */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 md:hidden">
                <div className="container mx-auto px-4 pt-8 pb-2 flex flex-col items-center justify-center gap-1 relative">
                    <img
                        src="/card_logo.png"
                        alt="Mastercheff"
                        className="w-16 h-16 object-contain"
                    />
                    <h1 className="font-bold tracking-wide uppercase text-sm text-center">
                        <span className="text-white">AUTO</span>
                        <span className="text-[#FFCC00]">ATENDIMENTO</span>
                    </h1>
                    {/* Status Dot */}
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_limegreen]`} />
                </div>
            </header>

            {/* SPACER FOR HEADER */}
            <div className="h-32 md:hidden"></div>

            {/* Main Content: Product Grid */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto h-screen custom-scrollbar bg-black">
                {/* Desktop Categories (Hidden on Mobile) */}
                <div className="hidden md:flex gap-3 overflow-x-auto pb-6 mb-2 scrollbar-hide">
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
                            className={`px-6 py-2.5 rounded-full whitespace-nowrap font-bold text-sm tracking-wide transition-all ${selectedCategory === cat.id
                                ? 'bg-[#FFCC00] text-black shadow-[0_0_15px_rgba(255,204,0,0.4)] transform scale-105'
                                : 'bg-[#2C2C2E] text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-32 md:pb-0">
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

            {/* NAVIGATION PILL PREMIUM V2 (Exact copy from Cardapio.tsx) */}
            <motion.div
                initial={{ y: 100, x: "-50%", opacity: 0 }}
                animate={{ y: 0, x: "-50%", opacity: 1 }}
                className="fixed bottom-8 left-1/2 z-50 w-[90%] max-w-md md:hidden"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <div className="rounded-full bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/50 flex items-center justify-between px-2 py-4 relative overflow-hidden">
                    {/* Search Button / Expanded Input */}
                    {!showSearchExpanded ? (
                        <motion.button
                            onClick={() => setShowSearchExpanded(true)}
                            className="relative flex-1 flex flex-col items-center justify-center gap-y-1.5 h-full z-10"
                            whileTap={{ scale: 0.9, color: "#ffffff" }}
                        >
                            <Search size={22} className="text-white/70 transition-colors" strokeWidth={2.5} />
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 whitespace-nowrap">BUSCAR</span>
                        </motion.button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex items-center gap-3 px-4 w-full h-full"
                        >
                            <Search size={22} className="text-white/50" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar..."
                                autoFocus
                                className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-base"
                            />
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowSearchExpanded(false);
                                }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} className="text-white/50" />
                            </button>
                        </motion.div>
                    )}

                    {/* Category Menu Button (Center) */}
                    {!showSearchExpanded && (
                        <motion.button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="relative flex-1 flex flex-col items-center justify-center gap-y-1.5 h-full z-10"
                            whileTap={{ scale: 0.9, color: "#ffffff" }}
                        >
                            {/* Use Grid or LayoutGrid */}
                            <Grid
                                size={22}
                                className="text-white/70 transition-colors"
                                strokeWidth={2.5}
                            />
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 whitespace-nowrap">
                                CATEGORIAS
                            </span>
                        </motion.button>
                    )}

                    {/* Cart Button */}
                    {!showSearchExpanded && (
                        <motion.button
                            onClick={() => setIsSidebarOpen(true)}
                            className="relative flex-1 flex flex-col items-center justify-center gap-y-1.5 h-full z-10"
                            whileTap={{ scale: 0.9 }}
                        >
                            <div className="relative">
                                <ShoppingCart size={22} className="text-white/70 transition-colors" strokeWidth={2.5} />
                                {cart.length > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FFCC00] rounded-full flex items-center justify-center border border-black/60 shadow-sm"
                                    >
                                        <span className="text-[9px] font-bold text-black leading-none">{cart.length}</span>
                                    </motion.div>
                                )}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 whitespace-nowrap">CARRINHO</span>
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* RADIAL ARC MENU (Exact copy from Cardapio.tsx) */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <motion.div
                            className="fixed bottom-[110px] left-1/2 -translate-x-1/2 w-[80vw] max-w-md flex items-end justify-center h-0"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={{
                                open: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                                closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {[
                                { id: 'xis', label: 'Xis', targetX: '-33vw', targetY: 0, path: <span className="text-3xl leading-none filter drop-shadow-md">🍔</span> },
                                { id: 'hotdog', label: 'Hot Dog', targetX: '-11vw', targetY: -50, path: <span className="text-3xl leading-none filter drop-shadow-md">🌭</span> },
                                { id: 'porcoes', label: 'Porções', targetX: '11vw', targetY: -50, path: <span className="text-3xl leading-none filter drop-shadow-md">🍟</span> },
                                { id: 'bebida', label: 'Bebidas', targetX: '33vw', targetY: 0, path: <span className="text-3xl leading-none filter drop-shadow-md">🥤</span> }
                            ].map((item) => {
                                const isActive = selectedCategory === item.id;
                                return (
                                    <motion.button
                                        key={item.id}
                                        variants={{
                                            open: { x: item.targetX, y: item.targetY, scale: 1, opacity: 1 },
                                            closed: { x: 0, y: 80, scale: 0, opacity: 0 }
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            setSelectedCategory(item.id);
                                            setTimeout(() => setIsMenuOpen(false), 100);
                                        }}
                                        className={`absolute left-1/2 -ml-8 h-16 w-16 rounded-full backdrop-blur-2xl border flex flex-col items-center justify-center shadow-2xl
                                            ${isActive ? 'bg-[#FFCC00] border-[#FFCC00]/50 text-black' : 'bg-black/80 border-white/10 text-white'}`}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">{item.label}</span>
                                        </div>
                                        {item.path}
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>

            {/* Sidebar (Cart) */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#1C1C1E] shadow-2xl transform transition-transform duration-300 z-50 border-l border-white/10
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
                <div className="h-full flex flex-col">
                    <div className="p-4 bg-[#1C1C1E] border-b border-white/10 flex justify-between items-center md:hidden">
                        <span className="font-bold text-lg text-white">Seu Pedido</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white p-2">Fechar</button>
                    </div>

                    <div className="flex-1 bg-[#1C1C1E] relative">
                        <CartSidebar
                            cart={cart}
                            onRemoveItem={removeFromCart /* Check prop name in CartSidebar definition */}
                            onCheckout={handleCheckout}
                            isOpen={true} /* Always open in desktop sidebar container */
                            onClose={() => setIsSidebarOpen(false)}
                            customerName={customerName}
                            setCustomerName={setCustomerName}
                            neighborhoods={[]} /* FIX: Pass empty array */
                            // Override props for Self-Service specific behavior
                            isSelfService={true}
                            isLoading={isSubmitting}
                        />
                    </div>
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
                        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
                            <div className="flex justify-center">
                                <div className="bg-green-500/20 p-4 rounded-full">
                                    <CheckCircle className="w-16 h-16 text-green-500" strokeWidth={3} />
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Pedido Enviado!</h2>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                Informe seu nome <strong className="text-[#FFCC00] text-xl block mt-1">{customerName || 'no Caixa'}</strong> para realizar o pagamento.
                            </p>
                            <div className="bg-[#FFCC00]/10 border border-[#FFCC00]/20 p-4 rounded-xl">
                                <p className="text-sm font-bold text-[#FFCC00]">
                                    ⚠️ O pedido só entra em produção após o pagamento no caixa.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full bg-[#FFCC00] text-black py-4 rounded-xl font-black text-lg hover:bg-[#E5B800] transition-colors shadow-lg shadow-[#FFCC00]/10"
                            >
                                FAZER NOVO PEDIDO
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
