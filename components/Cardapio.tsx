
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Addon, CartItem, Tag } from '../types';
import { ProductCard } from './ProductCard';
import { LiteProductModal } from './LiteProductModal';
import { Share2, ShoppingCart, Search, X, Check, Trash2, ArrowRight, LayoutGrid, Clock, MapPin, Send, Phone, Utensils, Wine, ShoppingBag, Pencil, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Cardapio: React.FC = () => {
    // Estado de Dados
    const [products, setProducts] = useState<Product[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado do Carrinho
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    // Estado do Checkout
    const [showCheckout, setShowCheckout] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [orderSent, setOrderSent] = useState(false);
    const [sending, setSending] = useState(false);

    // Estado de Logística
    const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
    const [address, setAddress] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [addressType, setAddressType] = useState<'house' | 'apartment'>('house');
    const [addressComplement, setAddressComplement] = useState(''); // Bloco/Apto

    // Estado de Pagamento
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
    const [changeFor, setChangeFor] = useState('');

    // Estado do Modal
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado de Categoria
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Estado de Pesquisa
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchExpanded, setShowSearchExpanded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Toast de Feedback
    const [showToast, setShowToast] = useState(false);

    const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);

    // Estado do Turno (Shift)
    const [activeShift, setActiveShift] = useState<any>(null);
    const [isStoreOpen, setIsStoreOpen] = useState(false);

    // Estado de Áreas de Entrega
    const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
    const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>('');

    // Estado do Floating Cart e Header (Scroll)
    const [showFloatingCart, setShowFloatingCart] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setShowFloatingCart(scrollY > 100);
            setIsScrolled(scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);




    useEffect(() => {
        fetchData();
        checkStoreStatus();

        // Realtime subscription for Shift Status
        const shiftSubscription = supabase
            .channel('public:shifts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, (payload) => {
                // If any shift changes, re-check status
                checkStoreStatus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(shiftSubscription);
        };
    }, []);

    // ... (rest of useEffects)

    const checkStoreStatus = async () => {
        try {
            const { data: shift, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('status', 'open')
                .maybeSingle();

            if (error) {
                console.error('Error fetching shift:', error);
            }

            if (shift) {
                setActiveShift(shift);
                setIsStoreOpen(true);
            } else {
                setIsStoreOpen(false);
                setActiveShift(null);
            }
        } catch (err) {
            console.error('Error checking store status:', err);
            // Safety: If api fails, don't lock the store if possible? No, safer to lock or retry.
            // Lets retry once if needed or just log.
        }
    };

    const fetchData = async () => {
        try {
            // Using separate promises to isolate failures
            const productsPromise = supabase.from('products').select('*').eq('is_available', true).order('menu_number', { ascending: true });
            const addonsPromise = supabase.from('addons').select('*').eq('is_available', true);
            const tagsPromise = supabase.from('tags').select('*');
            const deliveryAreasPromise = supabase.from('delivery_areas').select('*, delivery_fee:fee').eq('active', true).order('name', { ascending: true });

            const [pRes, aRes, tRes, dRes] = await Promise.all([
                productsPromise,
                addonsPromise,
                tagsPromise,
                deliveryAreasPromise
            ]);

            // Normalização de Categorias (Apenas slugs, sem extração de porções)
            let finalProducts = pRes.data || [];

            finalProducts = finalProducts.map(p => {
                let normalizedCategory = p.category;

                const nameLower = p.name.toLowerCase();

                // Porções: Priority Check
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

            setProducts(finalProducts);
            if (aRes.data) setAddons(aRes.data);
            if (tRes.data) setTags(tRes.data);

            // Defensive check for delivery areas
            if (dRes && dRes.data) {
                setDeliveryAreas(dRes.data);
            } else {
                setDeliveryAreas([]);
                console.warn('Delivery Areas not loaded:', dRes?.error);
            }
        } catch (error) {
            console.error('Critical Error loading menu:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: CartItem) => {
        if (!isStoreOpen) {
            alert('A loja está fechada no momento! Aguarde a abertura do caixa.');
            return;
        }
        if (editingCartItemIndex !== null) {
            // EDIT MODE: Update existing item
            const newCart = [...cart];
            newCart[editingCartItemIndex] = { ...item, tempId: cart[editingCartItemIndex].tempId };
            setCart(newCart);
            setEditingCartItemIndex(null);

            // Re-open checkout/cart if we were there? (Optional, usually we stay where we were)
            // If editing from "Checkout" modal (Review), we probably should reopen Checkout?
            // But Checkout is separate from Product Modal.

            // If editing from "Cart Drawer", ensure drawer stays open (it does by default unless we close it)
        } else {
            // ADD MODE: Push new item
            setCart([...cart, item]);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    const handleEditCartItem = (item: CartItem, index: number) => {
        setSelectedProduct(item.product);
        setEditingCartItemIndex(index);
        setIsModalOpen(true);
        // Note: LiteProductModal will read initialValues based on editingCartItemIndex/logic we add next
    };

    const removeFromCart = (tempId: string) => {
        setCart(cart.filter(item => item.tempId !== tempId));
    };

    // Cálculo do total (INCLUINDO ADICIONAIS)
    const getCartTotal = () => cart.reduce((sum, item) => {
        const addonsTotal = item.addons?.reduce((acc, addon) => acc + addon.price, 0) || 0;
        return sum + ((item.product.price + addonsTotal) * item.quantity);
    }, 0);

    // Calcular taxa de entrega atual (Derived State)
    const currentDeliveryFee = orderType === 'delivery'
        ? (deliveryAreas.find(da => String(da.id) === String(selectedNeighborhoodId))?.fee || 0)
        : 0;

    // Função para remover TODOS os acentos e caracteres especiais
    const removeAccents = (str: string): string => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
            .replace(/ç/g, 'c')
            .replace(/Ç/g, 'C')
            .replace(/ã/g, 'a')
            .replace(/Ã/g, 'A')
            .replace(/õ/g, 'o')
            .replace(/Õ/g, 'O');
    };

    // Função para higienizar texto (sem acentos + maiúsculas)
    const sanitizeText = (str: string, uppercase: boolean = false): string => {
        const clean = removeAccents(str);
        return uppercase ? clean.toUpperCase() : clean;
    };

    const formatPhone = (value: string) => {
        // Remove tudo que não é dígito e limita a 11 caracteres
        const numbers = value.replace(/\D/g, '').slice(0, 11);

        // Retorna vazio se não tiver números
        if (!numbers) return '';

        // Máscara Dinâmica
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;

        // 10 dígitos: (XX) XXXX-XXXX
        if (numbers.length <= 10) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        }

        // 11 dígitos: (XX) XXXXX-XXXX
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Armazena apenas números no estado
        const rawValue = e.target.value.replace(/\D/g, '').slice(0, 11);
        setCustomerPhone(rawValue);
    };





    const submitOrder = async () => {
        // Re-verificar status da loja antes de enviar
        const { data: currentShiftCheck } = await supabase
            .from('shifts')
            .select('*')
            .eq('status', 'open')
            .maybeSingle();

        if (!currentShiftCheck) {
            alert('Desculpe, a loja acabou de fechar o caixa!');
            setIsStoreOpen(false);
            setActiveShift(null);
            return;
        }

        // Validação básica
        if (!customerName.trim() || customerPhone.length < 10) {
            alert('Preencha seu nome e um telefone válido (mínimo 10 dígitos).');
            return;
        }

        // Validação de endereço para entrega
        if (orderType === 'delivery' && (!address.trim() || !addressNumber.trim() || !selectedNeighborhoodId)) {
            alert('Preencha o endereço completo para entrega (Rua, Número e Bairro).');
            return;
        }

        // Validação: Apartamento requer campo de complemento
        if (orderType === 'delivery' && addressType === 'apartment' && !addressComplement.trim()) {
            alert('Por favor, informe o Bloco / Número do Apartamento.');
            return;
        }

        if (cart.length === 0) return;

        setSending(true);
        try {
            // Montar endereço completo (incluindo complemento se apartamento)
            const neighborhoodName = deliveryAreas.find(da => String(da.id) === String(selectedNeighborhoodId))?.name || '';
            const complementText = addressType === 'apartment' && addressComplement.trim() ? ` - ${addressComplement} ` : '';
            const fullAddress = orderType === 'delivery'
                ? `${address}, ${addressNumber}${complementText} - ${neighborhoodName} `
                : '';

            const deliveryFee = orderType === 'delivery'
                ? (deliveryAreas.find(da => String(da.id) === String(selectedNeighborhoodId))?.fee || 0)
                : 0;

            // NEW: Use Secure RPC to create order (Avoids RLS Public Insert issues)
            const payload = {
                p_customer_name: customerName.trim(),
                p_customer_phone: customerPhone,
                p_order_type: orderType === 'delivery' ? 'delivery' : 'takeaway',
                p_neighborhood_id: orderType === 'delivery' ? selectedNeighborhoodId : null,
                p_delivery_fee: deliveryFee,
                p_payment_method: paymentMethod === 'card' ? 'credit' : paymentMethod,
                p_items: cart.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.product.price + (item.addons?.reduce((a, addon) => a + addon.price, 0) || 0),
                    notes: [
                        item.notes,
                        item.addons?.map(a => a.name).join(', '),
                        orderType === 'delivery' ? `📍 ${fullAddress} ` : '🏪 Retirada',
                        paymentMethod === 'cash' && changeFor ? `💵 Troco p/ R$ ${changeFor} ` : ''
                    ].filter(Boolean).join(' | ')
                })),
                p_address_street: orderType === 'delivery' ? address : null,
                p_address_number: orderType === 'delivery' ? addressNumber : null,
                p_address_complement: orderType === 'delivery' && addressType === 'apartment' ? addressComplement : null
            };

            const { data: orderData, error: orderError } = await supabase.rpc('create_web_order', payload);

            if (orderError) throw orderError;

            // RPC returns the full order object or at least ID and Number
            const orderId = orderData.id;
            const orderNumber = orderData.daily_number;

            setOrderSent(true);
            setCart([]);

            // GATILHO WHATSAPP: Mensagem Simplificada (SEM ADICIONAIS)
            const whatsappNeighborhoodName = deliveryAreas.find(da => String(da.id) === String(selectedNeighborhoodId))?.name || '';

            // Formatar itens SEM mostrar adicionais (mas total inclui)
            const itemsDetailed = cart.map(item => {
                const cleanProductName = sanitizeText(item.product.name, true); // MAIÚSCULAS
                let itemText = `${item.quantity}x ${cleanProductName} `;

                // Mostrar apenas observações/remoções (se houver)
                if (item.notes && item.notes.trim()) {
                    const cleanNotes = sanitizeText(item.notes);
                    itemText += `\n - ${cleanNotes} `;
                }

                return itemText;
            }).join('\n');

            const subtotal = getCartTotal(); // Já inclui adicionais
            const totalWithDelivery = subtotal + deliveryFee;
            const cleanNeighborhood = sanitizeText(whatsappNeighborhoodName);
            const cleanCustomerName = sanitizeText(customerName);

            let message = `* PEDIDO ${orderNumber ? `#${orderNumber}` : 'ONLINE'}! *\n\n`;
            message += `* CLIENTE:* ${cleanCustomerName} \n`;
            message += `* TELEFONE:* ${customerPhone} \n`;
            message += `-----------------------------------\n`;
            message += `* ITENS:*\n${itemsDetailed} \n`;
            message += `-----------------------------------\n`;

            if (orderType === 'delivery' && deliveryFee > 0) {
                message += `Taxa de Entrega(${cleanNeighborhood}): R$ ${deliveryFee.toFixed(2)} \n`;
            }

            message += `* TOTAL: R$ ${totalWithDelivery.toFixed(2)}*\n\n`;
            message += `* PAGAMENTO:* ${paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'card' ? 'CARTAO' : 'DINHEIRO'} \n`;

            const cleanAddress = orderType === 'delivery' ? sanitizeText(fullAddress) : 'RETIRADA';
            message += `* TIPO:* ${orderType === 'delivery' ? `ENTREGA - ${cleanAddress}` : 'RETIRADA'} `;

            const whatsappUrl = `https://wa.me/5549999422033?text=${encodeURIComponent(message)}`;

            // Pequeno delay para mostrar o toast/UI de sucesso antes de sair
            setTimeout(() => {
                window.location.href = whatsappUrl;
            }, 1000);
        } catch (error: any) {
            console.error('Erro ao enviar pedido:', error);

            // Tratamento específico para erros de RLS/permissão
            if (error?.code === '42501' || error?.message?.includes('policy')) {
                alert('Erro de permissão. O sistema pode estar em manutenção. Tente novamente em alguns minutos.');
            } else if (error?.code === 'PGRST301') {
                alert('Erro de conexão com o servidor. Verifique sua internet.');
            } else {
                alert('Erro ao enviar pedido. Tente novamente.');
            }
        } finally {
            setSending(false);
        }
    };

    // Simplified navigation config (4 items for floating pill)
    const navItems = [
        { id: 'all', icon: LayoutGrid, label: 'Tudo', action: () => setSelectedCategory('all') },
        { id: 'xis', icon: Utensils, label: 'Lanches', action: () => setSelectedCategory('xis') },
        { id: 'bebida', icon: Wine, label: 'Bebidas', action: () => setSelectedCategory('bebida') },
        { id: 'cart', icon: ShoppingBag, label: 'Sacola', action: () => setShowCheckout(true) }
    ];

    // Filtro inteligente V2: Busca Prioritária
    const filteredProducts = products.filter(p => {
        const query = searchQuery.trim().toLowerCase();

        // 1. Prioridade Global: Busca (ignora categorias)
        if (query.length > 0) {
            return p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query));
        }

        // 2. Prioridade Categoria
        if (selectedCategory === 'all') return true;

        return p.category === selectedCategory;
    });

    // TELA DE SUCESSO
    if (orderSent) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-[#1C1C1E] rounded-3xl p-8 text-center max-w-md w-full border border-white/10 shadow-2xl animate-scale-in">
                    <div className="w-24 h-24 bg-[#FFCC00]/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Check className="w-12 h-12 text-[#FFCC00]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Pedido Recebido! 🎉</h1>
                    <p className="text-gray-400 mb-8 text-lg">
                        🚀 Pedido recebido! Agora é com a gente. Prepare o apetite, seu Mastercheff já está sendo preparado!
                    </p>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#FFCC00] selection:text-black">
            {/* MINIMALIST HEADER */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-4 pt-8 pb-2 flex flex-col items-center justify-center gap-1 relative">
                    <img
                        src="/logo.png"
                        alt="Mastercheff"
                        className="w-16 h-16 md:w-20 md:h-20 object-contain"
                    />
                    <h1 className="font-bold text-white tracking-wide uppercase text-sm text-center">
                        Mastercheff Food Truck
                    </h1>
                    {/* Status Dot (absolute positioned) */}
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${isStoreOpen ? 'bg-green-500 shadow-[0_0_8px_limegreen]' : 'bg-red-500'}`} />
                </div>
            </header>

            {/* Spacer for Header */}
            <div className="h-32"></div>


            {/* Modal de Loja Fechada (Apple Dark) */}
            {
                !isStoreOpen && !loading && (
                    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
                        <div className="text-center space-y-4 max-w-sm">
                            <div className="w-20 h-20 bg-[#1C1C1E] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-2xl">
                                <Clock size={40} className="text-gray-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Loja Fechada</h2>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                No momento estamos fechados. Aguarde a abertura do caixa para fazer seu pedido.
                            </p>
                            <div className="pt-4">
                                <span className="inline-block px-4 py-2 bg-[#1C1C1E] rounded-lg text-sm font-medium text-gray-500 border border-white/5">
                                    Acompanhe nosso status em tempo real
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }



            {/* Grid de Produtos - with bottom padding for tab bar */}
            <main className="flex-1 px-4 pb-32 max-w-2xl mx-auto w-full">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 border border-white/10">
                            <Search size={40} className="text-white/30" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum lanche encontrado</h3>
                        <p className="text-white/50 text-sm">
                            {searchQuery ? `Não encontramos "${searchQuery}" no cardápio.` : 'Nenhum produto disponível nesta categoria.'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-4 px-6 py-2 bg-[#FFCC00] text-black font-bold rounded-full hover:bg-[#E5B800] transition-all"
                            >
                                Limpar busca
                            </button>
                        )}
                    </div>
                ) : (
                    <motion.div className="grid grid-cols-1 gap-3">
                        <AnimatePresence mode="popLayout">
                            {filteredProducts.map(product => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    layout
                                >
                                    <ProductCard
                                        product={product}
                                        onClick={(p) => {
                                            setSelectedProduct(p);
                                            setIsModalOpen(true);
                                        }}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            {/* Modal de Produto (Lite) */}
            <LiteProductModal
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedProduct(null);
                }}
                onAddToCart={addToCart}
                availableTags={tags}
                mode={editingCartItemIndex !== null ? 'edit' : 'add'}
                initialValues={editingCartItemIndex !== null ? {
                    quantity: cart[editingCartItemIndex].quantity,
                    notes: cart[editingCartItemIndex].notes,
                    tags: cart[editingCartItemIndex].tags
                } : undefined}
                onRemove={() => {
                    if (editingCartItemIndex !== null) {
                        removeFromCart(cart[editingCartItemIndex].tempId);
                        setIsModalOpen(false);
                        setSelectedProduct(null);
                        setEditingCartItemIndex(null);
                    }
                }}
            />

            {/* Toast de Sucesso */}
            {/* DYNAMIC ISLAND TOAST notification */}
            {
                showToast && (
                    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-slide-down pointer-events-none w-full max-w-[350px] flex justify-center">
                        <div className="bg-black border border-white/10 rounded-full px-5 py-3 shadow-2xl flex items-center gap-3">
                            <div className="bg-[#FFCC00] rounded-full p-1">
                                <Check size={14} className="text-black stroke-[3px]" />
                            </div>
                            <span className="text-white text-sm font-semibold tracking-wide">Item adicionado à sacola</span>
                        </div>
                    </div>
                )
            }

            {/* Drawer do Carrinho */}
            {
                showCart && (
                    <div className="fixed inset-0 bg-black/80 z-[150] flex items-end backdrop-blur-sm">
                        <div className="bg-[#1C1C1E] w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up shadow-2xl shadow-black/50 border-t border-white/10">
                            {/* Header do Drawer */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h2 className="text-2xl font-bold text-white">Seu Pedido</h2>
                                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-[#2C2C2E] rounded-full transition-colors">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Lista de Itens */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {cart.map((item, index) => (
                                    <div key={item.tempId} className="flex flex-col gap-3 bg-[#2C2C2E] p-4 rounded-2xl border border-white/5 relative group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-[#FFCC00] text-black text-xs font-bold px-2 py-0.5 rounded-md min-w-[24px] text-center">
                                                        {item.quantity}x
                                                    </span>
                                                    <p className="font-bold text-lg text-white leading-tight">{item.product.name}</p>
                                                </div>

                                                {/* Detalhes (Adicionais/Notas) */}
                                                <div className="pl-8 mt-1 space-y-0.5">
                                                    {item.tags && item.tags.length > 0 && (
                                                        <p className="text-xs text-red-400 font-medium">⛔ Sin: {item.tags.join(', ')}</p>
                                                    )}
                                                    {item.addons && item.addons.length > 0 && (
                                                        <p className="text-xs text-white/60">+ {item.addons.map(a => a.name).join(', ')}</p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-xs text-white/60">📝 "{item.notes}"</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-bold text-[#FFCC00] text-lg">
                                                    R$ {((item.product.price + (item.addons?.reduce((a, ad) => a + ad.price, 0) || 0)) * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions (Edit/Delete) */}
                                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                            <button
                                                onClick={() => handleEditCartItem(item, index)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Pencil size={14} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.tempId)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer com Total e Botão */}
                            <div className="p-6 border-t border-white/10 space-y-4 bg-[#1C1C1E]">
                                <div className="flex justify-between items-center text-xl">
                                    <span className="font-bold text-white">Total</span>
                                    <span className="font-bold text-[#FFCC00] text-2xl">R$ {getCartTotal().toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!isStoreOpen) {
                                            alert('Loja Fechada!');
                                            return;
                                        }
                                        setShowCart(false);
                                        setShowCheckout(true);
                                    }}
                                    disabled={!isStoreOpen}
                                    className="w-full py-4 bg-[#FFCC00] text-black font-bold text-lg rounded-2xl hover:bg-[#E5B800] transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-600 shadow-lg shadow-orange-500/10"
                                >
                                    {isStoreOpen ? 'Finalizar Pedido' : 'Loja Fechada 🔒'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cart functionality now integrated into floating pill navigation */}

            {
                showCheckout && (
                    <div className="fixed inset-0 bg-black/80 z-[160] flex items-end backdrop-blur-sm">
                        <div className="bg-[#1C1C1E] w-full rounded-t-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-slide-up shadow-2xl border-t border-white/10">
                            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#1C1C1E] z-10">
                                <h2 className="text-2xl font-bold text-white">Revisar e Finalizar</h2>
                                <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-[#2C2C2E] rounded-full transition-colors">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* 📝 RESUMO DO PEDIDO PRE-ENVIO */}
                                <div className="bg-gradient-to-br from-[#2C2C2E] to-[#222] rounded-2xl p-5 border border-white/10 shadow-lg">
                                    <h3 className="flex items-center gap-2 font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">
                                        <ShoppingCart size={14} />
                                        Resumo do Pedido ({cart.length} itens)
                                    </h3>

                                    <div className="max-h-[200px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                        {cart.map((item, idx) => (
                                            <div key={item.tempId} className="flex justify-between items-start text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                <div className="flex-1">
                                                    <div className="font-medium text-white flex gap-2">
                                                        <span className="text-[#FFCC00] font-bold">{item.quantity}x</span>
                                                        {item.product.name}
                                                    </div>
                                                    {/* Mini detalhes para conferência */}
                                                    {(item.tags?.length > 0 || item.notes) && (
                                                        <p className="text-[10px] text-gray-500 pl-6 line-clamp-1">
                                                            {item.tags?.join(', ')} {item.notes && `| Obs: ${item.notes}`}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <span className="text-white font-medium">
                                                        R$ {((item.product.price + (item.addons?.reduce((a, ad) => a + ad.price, 0) || 0)) * item.quantity).toFixed(2)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleEditCartItem(item, idx)}
                                                        className="text-gray-600 hover:text-[#FFCC00] transition-colors"
                                                        title="Editar Item"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-yellow-500/90 text-xs font-medium bg-yellow-500/10 p-3 rounded-lg">
                                        <AlertCircle size={16} />
                                        Revise os itens acima antes de enviar!
                                    </div>
                                </div>
                                {/* Dados Pessoais */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Seus Dados</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Seu nome *"
                                            className="w-full p-4 bg-[#2C2C2E] text-white rounded-xl placeholder-gray-500 focus:ring-2 focus:ring-[#FFCC00] focus:outline-none transition-all"
                                        />
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                value={formatPhone(customerPhone)}
                                                onChange={handlePhoneChange}
                                                placeholder="WhatsApp (XX) 9XXXX-XXXX *"
                                                maxLength={15}
                                                className={`w-full p-4 bg-[#2C2C2E] text-white rounded-xl placeholder-gray-500 focus:ring-2 focus:outline-none transition-all ${customerPhone.length > 0 && customerPhone.length < 10
                                                    ? 'border border-red-500 focus:ring-red-500'
                                                    : 'focus:ring-[#FFCC00]'
                                                    }`}
                                            />
                                            {customerPhone.length > 0 && customerPhone.length < 10 && (
                                                <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-1">
                                                    Telefone incompleto (DDD + número)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tipo de Pedido */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Como vai receber?</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setOrderType('pickup')}
                                            className={`p-4 rounded-xl font-bold transition-all border ${orderType === 'pickup'
                                                ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-lg shadow-orange-500/20'
                                                : 'bg-[#2C2C2E] text-gray-400 border-transparent hover:bg-[#3C3C3E]'
                                                }`}
                                        >
                                            🏪 Retirar
                                        </button>
                                        <button
                                            onClick={() => setOrderType('delivery')}
                                            className={`p-4 rounded-xl font-bold transition-all border ${orderType === 'delivery'
                                                ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-lg shadow-orange-500/20'
                                                : 'bg-[#2C2C2E] text-gray-400 border-transparent hover:bg-[#3C3C3E]'
                                                }`}
                                        >
                                            🛵 Entrega
                                        </button>
                                    </div>
                                </div>

                                {/* Campos de Endereço (só para Entrega) */}
                                {orderType === 'delivery' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Endereço de Entrega</h3>
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Rua/Avenida *"
                                                className="w-full p-4 bg-[#2C2C2E] text-white rounded-xl placeholder-gray-500 focus:ring-2 focus:ring-[#FFCC00] focus:outline-none"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={addressNumber}
                                                    onChange={(e) => setAddressNumber(e.target.value)}
                                                    placeholder="Número *"
                                                    className="p-4 bg-[#2C2C2E] text-white rounded-xl placeholder-gray-500 focus:ring-2 focus:ring-[#FFCC00] focus:outline-none"
                                                />
                                                <select
                                                    value={selectedNeighborhoodId}
                                                    onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                                                    className="p-4 bg-[#2C2C2E] text-white rounded-xl focus:ring-2 focus:ring-[#FFCC00] focus:outline-none appearance-none"
                                                >
                                                    <option value="" className="text-gray-500">Bairro *</option>
                                                    {deliveryAreas && deliveryAreas.length > 0 ? (
                                                        deliveryAreas.map(area => (
                                                            <option key={area.id} value={area.id}>
                                                                {area.name} (+R$ {(area.fee || 0).toFixed(2)})
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option disabled>Carregando bairros...</option>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Exibir Taxa de Entrega Dinâmica */}
                                            {selectedNeighborhoodId && (
                                                <div className="bg-orange-500/20 text-orange-400 p-3 rounded-xl flex items-center justify-between text-sm font-bold border border-orange-500/30">
                                                    <span>Taxa de Entrega ({deliveryAreas.find(da => String(da.id) === String(selectedNeighborhoodId))?.name})</span>
                                                    <span>+ R$ {currentDeliveryFee.toFixed(2)}</span>
                                                </div>
                                            )}

                                            {/* Seletor Tipo de Moradia */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddressType('house'); setAddressComplement(''); }}
                                                    className={`p-3 rounded-xl font-bold transition-all border text-sm ${addressType === 'house'
                                                        ? 'bg-[#FFCC00] text-black border-[#FFCC00]'
                                                        : 'bg-[#2C2C2E] text-gray-400 border-transparent hover:bg-[#3C3C3E]'
                                                        }`}
                                                >
                                                    🏠 Casa
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddressType('apartment')}
                                                    className={`p-3 rounded-xl font-bold transition-all border text-sm ${addressType === 'apartment'
                                                        ? 'bg-[#FFCC00] text-black border-[#FFCC00]'
                                                        : 'bg-[#2C2C2E] text-gray-400 border-transparent hover:bg-[#3C3C3E]'
                                                        }`}
                                                >
                                                    🏢 Apartamento
                                                </button>
                                            </div>

                                            {/* Campo Condicional: Bloco/Nº Apto */}
                                            {addressType === 'apartment' && (
                                                <input
                                                    type="text"
                                                    value={addressComplement}
                                                    onChange={(e) => setAddressComplement(e.target.value)}
                                                    placeholder="Bloco / Nº do Apartamento *"
                                                    className="w-full p-4 bg-[#2C2C2E] text-white rounded-xl placeholder-gray-500 focus:ring-2 focus:ring-[#FFCC00] focus:outline-none border-2 border-orange-500/50"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Forma de Pagamento */}
                                <div className="space-y-3">
                                    <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wide">Pagamento</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setPaymentMethod('pix')}
                                            className={`p-3 rounded-xl font-bold text-sm transition-all ${paymentMethod === 'pix'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}
                                        >
                                            📱 Pix
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('card')}
                                            className={`p-3 rounded-xl font-bold text-sm transition-all ${paymentMethod === 'card'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}
                                        >
                                            💳 Cartão
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`p-3 rounded-xl font-bold text-sm transition-all ${paymentMethod === 'cash'
                                                ? 'bg-yellow-500 text-gray-900'
                                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}
                                        >
                                            💵 Dinheiro
                                        </button>
                                    </div>

                                    {/* Campo de Troco (só para Dinheiro) */}
                                    {paymentMethod === 'cash' && (
                                        <input
                                            type="text"
                                            value={changeFor}
                                            onChange={(e) => setChangeFor(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Troco para quanto? (opcional)"
                                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                                        />
                                    )}
                                </div>

                                {/* Total e Botão */}
                                <div className="pt-4 border-t border-gray-700 space-y-3">
                                    {/* Subtotal */}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Subtotal</span>
                                        <span className="text-gray-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getCartTotal())}</span>
                                    </div>

                                    {/* Taxa de Entrega */}
                                    {currentDeliveryFee > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-blue-400">🛵 Taxa de Entrega</span>
                                            <span className="text-blue-400 font-semibold">+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentDeliveryFee)}</span>
                                        </div>
                                    )}

                                    {/* Total Final */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                                        <span className="text-gray-200 font-bold">Total</span>
                                        <span className="text-2xl font-bold text-orange-500">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getCartTotal() + currentDeliveryFee)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={submitOrder}
                                        disabled={!isStoreOpen || sending || !customerName.trim() || customerPhone.replace(/\D/g, '').length < 10 || (orderType === 'delivery' && (!address.trim() || !addressNumber.trim() || !selectedNeighborhoodId))}
                                        className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                    >
                                        {sending ? (
                                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        ) : !isStoreOpen ? (
                                            'Loja Fechada 🔒'
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Enviar Pedido
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* NAVIGATION PILL PREMIUM V2 (90% WIDTH) */}
            <motion.div
                initial={{ y: 100, x: "-50%", opacity: 0 }}
                animate={{ y: 0, x: "-50%", opacity: 1 }}
                className="fixed bottom-8 left-1/2 z-50 w-[90%] max-w-md"
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


                            <LayoutGrid
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
                            onClick={() => setShowCheckout(true)}
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

            {/* RADIAL ARC MENU */}
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
                                open: {
                                    transition: {
                                        staggerChildren: 0.05,
                                        delayChildren: 0.1
                                    }
                                },
                                closed: {
                                    transition: {
                                        staggerChildren: 0.03,
                                        staggerDirection: -1
                                    }
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {[
                                {
                                    id: 'xis',
                                    label: 'Xis',
                                    targetX: '-33vw',
                                    targetY: 0,
                                    path: <span className="text-3xl leading-none filter drop-shadow-md">🍔</span>
                                },
                                {
                                    id: 'hotdog',
                                    label: 'Hot Dog',
                                    targetX: '-11vw',
                                    targetY: -50,
                                    path: <span className="text-3xl leading-none filter drop-shadow-md">🌭</span>
                                },
                                {
                                    id: 'porcoes',
                                    label: 'Porções',
                                    targetX: '11vw',
                                    targetY: -50,
                                    path: <span className="text-3xl leading-none filter drop-shadow-md">🍟</span>
                                },
                                {
                                    id: 'bebida',
                                    label: 'Bebidas',
                                    targetX: '33vw',
                                    targetY: 0,
                                    path: <span className="text-3xl leading-none filter drop-shadow-md">🥤</span>
                                }
                            ].map((item) => {
                                const isActive = selectedCategory === item.id;

                                return (
                                    <motion.button
                                        key={item.id}
                                        variants={{
                                            open: {
                                                x: item.targetX,
                                                y: item.targetY,
                                                scale: 1,
                                                opacity: 1
                                            },
                                            closed: {
                                                x: 0,
                                                y: 80, // Sair de baixo (escondido atrás da pill)
                                                scale: 0,
                                                opacity: 0
                                            }
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25
                                        }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            setSelectedCategory(item.id);
                                            setTimeout(() => setIsMenuOpen(false), 100);
                                        }}
                                        // ADICIONADO: left-1/2 e -ml-8 para garantir origem no centro exato
                                        className={`absolute left-1/2 -ml-8 h-16 w-16 rounded-full backdrop-blur-2xl border flex flex-col items-center justify-center shadow-2xl
                                            ${isActive
                                                ? 'bg-[#FFCC00] border-[#FFCC00]/50 text-black'
                                                : 'bg-black/80 border-white/10 text-white'
                                            }`}
                                    >
                                        {/* Label Flutuante Acima */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                                                {item.label}
                                            </span>
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
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                @keyframes slide-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div >
    );
};
