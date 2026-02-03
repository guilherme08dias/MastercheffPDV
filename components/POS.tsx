import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shift, Product, Neighborhood, Tag, CartItem, OrderType, PaymentMethod, Order, OrderItem, Profile, Addon } from '../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { CartSidebar } from './CartSidebar';
import { ShiftOrdersSidebar } from './ShiftOrdersSidebar';
import { OrderHistoryModal } from './OrderHistoryModal';
import { DigitalQueueSidebar } from './DigitalQueueSidebar';
import { ShoppingCart, LogOut, ArrowLeft, History, Check, AlertTriangle, Search, LayoutDashboard, Settings, Store, RefreshCcw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBrasiliaDateFormatted } from '../utils/dateUtils';
import { POSNavigation } from './POSNavigation';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccess, playError } from '../utils/audio';
import { checkProductAvailability, StockStatus } from '../utils/stockUtils';
import { StockItem, ProductIngredient } from '../types';

interface POSProps {
  user: Profile;
  onLogout: () => void;
  onBackToAdmin?: () => void;
}

export const POS: React.FC<POSProps> = ({ user, onLogout, onBackToAdmin }) => {
  // Debug Role
  console.log("DEBUG POS ROLE CHECK:", { email: user?.email, role: user?.role });

  // Dados Globais
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);

  // Dados Estáticos
  const [products, setProducts] = useState<Product[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  // REALTIME STOCK STATE
  const [stockMap, setStockMap] = useState<Record<string, StockItem>>({});
  const [ingredientsMap, setIngredientsMap] = useState<Record<string, ProductIngredient[]>>({});

  // Estado da UI
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Alternar barra lateral móvel
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State
  const [searchQuery, setSearchQuery] = useState(''); // Estado da busca
  const [showToast, setShowToast] = useState(false); // Dynamic Island Toast


  const clearPrintQueue = async () => {
    try {
      // Local state clear
      setPrintedOrderIds(new Set());
      // Trigger backend RPC if it exists, otherwise just local
      const { error } = await supabase.rpc('clear_print_queue');
      if (error) console.warn("Backend shuffle", error); // optional
      toast.success('Fila de impressão local limpa!');
    } catch (e) {
      console.error(e);
    }
  };

  // Estado do Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');

  // Estado Pós-Checkout (para modal de sucesso)
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<OrderItem[]>([]);
  const [lastOrderNeighborhood, setLastOrderNeighborhood] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOpenInput, setShowOpenInput] = useState(false);

  const [floatInput, setFloatInput] = useState('0');

  // Estado do Fechamento de Caixa
  const [showCloseSummary, setShowCloseSummary] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [shiftStats, setShiftStats] = useState({
    total: 0,
    cash: 0,
    credit: 0,
    debit: 0,
    pix: 0,
    deliveryFees: 0,
    ordersCount: 0,
    canceledOrders: [] as any[],
    canceledTotal: 0
  });

  // Fila Digital State
  const [isDigitalQueueOpen, setIsDigitalQueueOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [digitalQueueCount, setDigitalQueueCount] = useState(0);

  // Digital Queue Count Listener (Badge)
  useEffect(() => {
    const fetchQueueCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pre_venda');
      setDigitalQueueCount(count || 0);
    };

    fetchQueueCount();

    const channel = supabase
      .channel('digital_queue_count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.pre_venda'
      }, () => {
        fetchQueueCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Estado para Alertas de Pedidos Web
  const [webOrderAlert, setWebOrderAlert] = useState<{
    id: number;
    customer_name: string;
    customer_phone: string;
    total: number;
    order_type: string;
    payment_method: string;
  } | null>(null);

  // PRINT LOCK: Track printed order IDs to prevent duplicates
  const [printedOrderIds, setPrintedOrderIds] = useState<Set<number>>(new Set());

  // Carregamento Inicial de Dados
  useEffect(() => {
    checkShift();
    fetchStockAndIngredients();
  }, []);

  // CARREGAR ESTOQUE E FICHA TÉCNICA
  const fetchStockAndIngredients = async () => {
    // 1. Fetch Stock Items
    const { data: stockData } = await supabase.from('stock_items').select('*');
    if (stockData) {
      const map: Record<string, StockItem> = {};
      stockData.forEach(item => { map[item.id] = item; });
      setStockMap(map);
    }

    // 2. Fetch Product Ingredients
    const { data: ingData } = await supabase.from('product_ingredients').select('*');
    if (ingData) {
      const map: Record<string, ProductIngredient[]> = {};
      ingData.forEach(ing => {
        if (!map[ing.product_id]) map[ing.product_id] = [];
        map[ing.product_id].push(ing);
      });
      setIngredientsMap(map);
    }
  };

  // REALTIME STOCK LISTENER
  useEffect(() => {
    const channel = supabase
      .channel('stock_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stock_items' }, payload => {
        const newItem = payload.new as StockItem;
        setStockMap(prev => ({ ...prev, [newItem.id]: newItem }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime Listener para Pedidos Web - COM TRAVA ANTI-DUPLICATA
  useEffect(() => {
    const channel = supabase
      .channel('web_orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: 'origin=eq.web'
      }, (payload) => {
        console.log('📱 Novo pedido WEB recebido:', payload);
        const newOrder = payload.new as any;

        // PRINT LOCK: Skip if already processed
        if (printedOrderIds.has(newOrder.id)) {
          console.log('🔒 Pedido já processado, ignorando:', newOrder.id);
          return;
        }

        // Skip if already confirmed/completed (status != pending)
        if (newOrder.status !== 'pending') {
          console.log('🔒 Pedido não está pendente, ignorando:', newOrder.id, newOrder.status);
          return;
        }

        // Tocar som de alerta
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVBxr');
          audio.play().catch(() => { }); // Ignorar erros de autoplay
        } catch (e) { }

        // Mostrar alerta
        setWebOrderAlert({
          id: newOrder.id,
          customer_name: newOrder.customer_name || 'Cliente',
          customer_phone: newOrder.customer_phone || '',
          total: newOrder.total || 0,
          order_type: newOrder.type || 'takeaway',
          payment_method: newOrder.payment_method || 'pix'
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [printedOrderIds]);

  const checkShift = async () => {
    try {
      setLoadingShift(true);
      // console.log("Verificando turno aberto...");
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'open')
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar turno:", error);
      }

      if (data) {
        // console.log("Turno aberto encontrado:", data);
        setCurrentShift(data);
        loadPosData();
      } else {
        // console.log("Nenhum turno aberto encontrado.");
        setCurrentShift(null);
      }
    } catch (error) {
      // console.log('No open shift found or error', error);
      setCurrentShift(null);
    } finally {
      setLoadingShift(false);
    }
  };

  const loadPosData = async () => {
    const [pRes, nRes, tRes, aRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_available', true).order('menu_number', { ascending: true }),
      supabase.from('delivery_areas').select('*, delivery_fee:fee').eq('active', true),
      supabase.from('tags').select('*'),
      supabase.from('addons').select('*').eq('is_available', true)
    ]);

    if (pRes.data) {
      // Normalização de Categorias (POS)
      const normalizedProducts = pRes.data.map(p => {
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
      setProducts(normalizedProducts);
    }

    if (nRes.data) setNeighborhoods(nRes.data);
    if (tRes.data) setTags(tRes.data);
    if (aRes.data) {
      console.log("DEBUG: Addons fetched:", aRes.data);
      setAddons(aRes.data);
    } else {
      console.warn("DEBUG: No addons fetched or error", aRes.error);
      // Alert to show user the exact error
      if (aRes.error) alert(`Erro ao carregar adicionais: ${aRes.error.message || JSON.stringify(aRes.error)}`);
    }
  };

  const handleClearPrintQueue = async () => {
    if (!window.confirm("⚠️ Zerar Fila de Impressão?\n\nIsso marcará TODOS os pedidos pendentes como 'Impressos'. Útil se a impressora travar ou entrar em loop.")) {
      return;
    }

    const toastId = toast.loading("Zerando fila...");
    try {
      const { error } = await supabase.rpc('clear_print_queue');
      if (error) throw error;

      toast.success("✅ Fila de impressão limpa!", { id: toastId });
      // Clear local lock just in case
      setPrintedOrderIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Erro ao zerar fila. Verifique permissões.", { id: toastId });
    }
  };

  const checkDeliveryFees = async (): Promise<boolean> => {
    try {
      const { count, error } = await supabase
        .from('neighborhoods')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return (count || 0) > 0;
    } catch (e) {
      console.error('Error checking fees:', e);
      return false;
    }
  };

  const handleOpenShift = async () => {
    console.log("Botão Abrir Caixa clicado");

    // PRE-FLIGHT CHECK: Taxas de Entrega
    const hasFees = await checkDeliveryFees();
    if (!hasFees) {
      alert("ERRO: Cadastre as taxas de entrega (Bairros) antes de abrir o caixa.\n\nO cliente precisa disso para finalizar o pedido.");
      return;
    }

    if (!showOpenInput) {
      setShowOpenInput(true);
      return;
    }

    const floatAmount = parseFloat(floatInput);
    if (isNaN(floatAmount) || floatAmount < 0) {
      alert("Por favor, insira um valor inicial válido.");
      return;
    }

    try {
      const shiftName = getBrasiliaDateFormatted();
      console.log("Tentando abrir/recuperar caixa:", shiftName);

      // 1. Verificar se JÁ EXISTE um turno para hoje
      const { data: existingShift, error: checkError } = await supabase
        .from('shifts')
        .select('*')
        .eq('name', shiftName)
        .maybeSingle();

      if (checkError) {
        console.error("Erro ao verificar turno:", checkError);
        alert("Erro ao verificar disponibilidade do caixa.");
        return;
      }

      if (existingShift) {
        // A. Turno Já Existe
        console.log("Turno existente encontrado:", existingShift);

        if (existingShift.status === 'open') {
          // A1. Já está aberto -> Apenas conectar
          alert(`Caixa de hoje (${shiftName}) recuperado com sucesso!`);
          setCurrentShift(existingShift);
          loadPosData();
        } else {
          // A2. Está fechado -> Reabrir
          const { data: reopenedShift, error: reopenError } = await supabase
            .from('shifts')
            .update({
              status: 'open',
              opened_at: new Date().toISOString() // Standardize opened_at
            })
            .eq('id', existingShift.id)
            .select()
            .single();

          if (reopenError) {
            alert(`Erro ao reabrir caixa: ${reopenError.message}`);
          } else {
            alert(`Caixa de hoje (${shiftName}) foi REABERTO!\n\nLOJA ONLINE AGORA: ✅ ATIVA`);
            setCurrentShift(reopenedShift);
            loadPosData();
          }
        }
      } else {
        // B. Turno Não Existe -> Criar Novo
        const { data: newShift, error: createError } = await supabase
          .from('shifts')
          .insert({
            initial_float: floatAmount,
            opening_balance: floatAmount, // Persistir saldo inicial explicitamente
            status: 'open',
            opened_at: new Date().toISOString(),
            opened_by: user.id,
            name: shiftName // GARANTIDO
          })
          .select()
          .single();

        if (createError) {
          console.error("Erro Supabase:", createError);
          alert(`Erro ao abrir caixa: ${createError.message}`);
        } else if (newShift) {
          console.log("Novo caixa aberto com sucesso:", newShift);
          setCurrentShift(newShift);
          loadPosData();
        }
      }

      // Limpar UI
      setFloatInput('0');
      setShowOpenInput(false);

    } catch (err: any) {
      console.error("Erro inesperado:", err);
      alert(`Erro inesperado ao abrir caixa: ${err.message}`);
    }
  };

  const handleCloseShiftClick = async () => {
    console.log("Botão Fechar Caixa clicado");

    // Trava de Segurança (Case Insensitive)
    if (user?.role?.toLowerCase() !== 'admin') {
      alert("Acesso restrito ao Administrador.");
      return;
    }

    if (!currentShift) {
      console.warn("Nenhum turno ativo (currentShift is null)");
      alert("Erro: Nenhum caixa aberto identificado pelo sistema.");
      return;
    }
    console.log("Turno atual ID:", currentShift.id);

    try {
      // Buscar TODOS os pedidos do turno atual (INCLUINDO cancelados para auditoria)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shift_id', currentShift.id);

      if (error) {
        console.error("Erro ao buscar pedidos:", error);
        throw error;
      }

      // Calcular totais
      const stats = {
        total: 0,
        cash: 0,
        credit: 0,
        debit: 0,
        pix: 0,
        deliveryFees: 0,
        ordersCount: 0,
        canceledOrders: [] as any[],
        canceledTotal: 0
      };

      orders?.forEach(order => {
        if (order.status === 'canceled') {
          stats.canceledOrders.push(order);
          stats.canceledTotal += order.total;
        } else {
          // Pedidos Válidos (Concluídos/Confirmados)
          stats.total += order.total;
          // Add delivery fee logic if available in snapshot
          stats.deliveryFees += (order.delivery_fee_snapshot || 0);

          stats.ordersCount++;

          switch (order.payment_method) {
            case 'cash': stats.cash += order.total; break;
            case 'credit': stats.credit += order.total; break;
            case 'debit': stats.debit += order.total; break;
            case 'pix': stats.pix += order.total; break;
          }
        }
      });

      setShiftStats(stats);
      setShowCloseSummary(true);

    } catch (error: any) {
      console.error('Erro ao calcular resumo:', error);
      alert('Erro ao calcular resumo do caixa');
    }
  };

  const handleSendReportToWhatsApp = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // TEXTO PURO - SEM EMOJIS
    let message = `RELATORIO DE FECHAMENTO - MASTERCHEFF CHAPECO\n`;
    message += `Data: ${today} as ${time}\n\n`;

    message += `Total Bruto: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.total)}\n`;
    message += `Total de Pedidos: ${shiftStats.ordersCount}\n\n`;

    message += `Pix: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.pix)}\n`;
    message += `Cartao Credito: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.credit)}\n`;
    message += `Cartao Debito: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.debit)}\n`;
    message += `Dinheiro: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.cash)}\n`;
    message += `Taxas Motoboy: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.deliveryFees || 0)}\n\n`;

    // Auditoria
    if (shiftStats.canceledOrders.length > 0) {
      message += `AUDITORIA DE CANCELADOS:\n`;
      message += `Total Cancelado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shiftStats.canceledTotal)}\n`;
      shiftStats.canceledOrders.forEach(o => {
        message += `- #${o.daily_number || o.id} (${(o.customer_name || 'Cliente').split(' ')[0]}): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.total)}\n`;
      });
    } else {
      message += `AUDITORIA DE CANCELADOS: Nenhum\n`;
    }

    const encodedDetails = encodeURIComponent(message);
    // Numero FIXO: 5549999422033
    window.open(`https://wa.me/5549999422033?text=${encodedDetails}`, '_blank');
  };

  const confirmCloseShift = async () => {
    console.log("confirmCloseShift iniciado");
    if (!currentShift) {
      console.error("Erro: currentShift é nulo ao confirmar fechamento");
      return;
    }

    const cashSales = shiftStats.cash || 0;
    const finalBalance = (currentShift.initial_float || 0) + cashSales;

    const { error } = await supabase.from('shifts').update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      cash_sales_total: cashSales,
      final_balance: finalBalance
    }).eq('id', currentShift.id);

    if (!error) {
      console.log("Caixa fechado com sucesso");
      setCurrentShift(null);
      setCart([]);
      setShowCloseSummary(false);
      if (onBackToAdmin) onBackToAdmin(); // Retornar admin para o painel ao fechar
    } else {
      console.error("Erro ao fechar caixa:", error);
      alert(`Erro ao fechar caixa: ${error.message}`);
    }
  };

  const handleImportPreOrder = (order: Order, items: OrderItem[]) => {
    // 1. Confirm overwrite if cart has items
    if (cart.length > 0) {
      if (!confirm("Importar este pedido substituirá os itens atuais do carrinho. Continuar?")) return;
    }

    // 2. Convert Items
    const newCartItems: CartItem[] = items.map(item => {
      const productData = (item as any).product || (item as any).products;
      return {
        tempId: crypto.randomUUID(),
        product: {
          id: item.product_id,
          name: productData?.name || 'Produto',
          price: item.unit_price,
          category: productData?.category || 'Outros',
          image_url: productData?.image_url,
          is_available: true
        },
        quantity: item.quantity,
        notes: item.notes || '',
        addons: (item as any).addons_detail || [],
        tags: []
      };
    });

    setCart(newCartItems);
    setCustomerName(order.customer_name || '');
    setPendingOrderId(order.id);
    setIsDigitalQueueOpen(false);
    toast.success(`Pedido de ${order.customer_name} carregado!`);
  };

  // Lógica do Carrinho
  const addToCart = (item: CartItem) => {
    setCart([...cart, item]);
  };

  const removeFromCart = (tempId: string) => {
    setCart(cart.filter(item => item.tempId !== tempId));
  };

  // SAFETY: Audio Feedback is imported at top

  // STATE: Checkout Locking
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SAFETY: Anti-Fumble (Prevent closing tab with items)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    if (cart.length > 0) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cart.length]);


  const handleCheckout = async (
    customerName: string,
    type: OrderType,
    paymentMethod: PaymentMethod,
    neighborhood: Neighborhood | null,
    discount?: { amount: number; type: 'fixed' | 'percentage'; reason: string }
  ) => {
    console.log("handleCheckout iniciado", { customerName, type, paymentMethod, neighborhood, discount });

    if (isSubmitting) return; // Prevent double click

    if (!currentShift) {
      console.error("Erro: currentShift é nulo no checkout");
      alert("Erro: Nenhum turno aberto. Tente recarregar a página.");
      return;
    }

    setIsProcessing(true);
    setIsSubmitting(true); // LOCK button

    // SAFETY: Timeout to unlock button if server hangs
    const safetyTimeout = setTimeout(() => {
      if (isProcessing) {
        setIsSubmitting(false);
        setIsProcessing(false);
        try { playError() } catch (e) { }
        toast.error("O pedido demorou muito para responder. Verifique sua conexão e tente novamente.");
      }
    }, 15000); // 15s timeout

    // 1. Recalcular Subtotal (incluindo Adicionais)
    const subtotal = cart.reduce((acc, item) => {
      const addonsTotal = item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
      return acc + ((item.product.price + addonsTotal) * item.quantity);
    }, 0);

    const deliveryFee = neighborhood ? neighborhood.delivery_fee : 0;
    const discountAmount = discount ? discount.amount : 0;

    // Total Final
    const total = subtotal + deliveryFee - discountAmount;

    try {
      console.log("Criando pedido...", { shift_id: currentShift.id, total, subtotal, discount });

      // LÓGICA DE NUMERAÇÃO: Delegada para o Trigger do Banco de Dados
      // const { data: maxOrder } = await supabase...

      let orderData;

      if (pendingOrderId) {
        // --- UPDATE EXISTING PRE-ORDER ---
        console.log("Atualizando pré-venda existente:", pendingOrderId);

        const { data, error } = await supabase
          .from('orders')
          .update({
            shift_id: currentShift.id,
            customer_name: customerName,
            type,
            neighborhood_id: neighborhood?.id,
            delivery_fee_snapshot: deliveryFee,
            payment_method: paymentMethod,
            total,
            status: 'completed', // Promove para oficial
            // daily_number: nextDailyNumber, // HANDLED BY TRIGGER
            discount_amount: discountAmount,
            discount_type: discount?.type || 'fixed',
            discount_reason: discount?.reason,
            created_at: new Date().toISOString() // Atualiza horário para o momento da venda
          })
          .eq('id', pendingOrderId)
          .select()
          .single();

        if (error) throw error;
        orderData = data;

        // Clean up old items to replace with new ones (simplest edit logic)
        await supabase.from('order_items').delete().eq('order_id', pendingOrderId);

      } else {
        // --- CREATE NEW ORDER ---
        const { data, error: orderError } = await supabase
          .from('orders')
          .insert({
            shift_id: currentShift.id,
            customer_name: customerName,
            type,
            neighborhood_id: neighborhood?.id,
            delivery_fee_snapshot: deliveryFee,
            payment_method: paymentMethod,
            total,
            status: 'completed',
            // daily_number: nextDailyNumber, // HANDLED BY TRIGGER
            discount_amount: discountAmount,
            discount_type: discount?.type || 'fixed',
            discount_reason: discount?.reason
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderData = data;
      }

      if (!orderData) {
        throw new Error("Falha na criação do pedido: Sem dados");
      }

      console.log("Pedido processado com sucesso:", orderData);

      // 2. Criar Itens (Unit Price deve incluir adicionais para bater o caixa)
      const itemsPayload = cart.map(item => {
        const addonsTotal = item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
        const finalUnitPrice = item.product.price + addonsTotal;

        // Concatenar notas com os adicionais para a cozinha saber
        const addonsNote = item.addons?.map(a => `+ ${a.name}`).join(', ');
        const finalNotes = [item.notes, addonsNote].filter(Boolean).join(' | ');

        return {
          order_id: orderData.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: finalUnitPrice,
          notes: finalNotes, // Ex: "Sem cebola | + Bacon, + Ovo"
          addons_detail: item.addons || [] // Salvar array completo com preços
        };
      });

      console.log("Inserindo itens...", itemsPayload);
      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);

      if (itemsError) {
        console.error("Erro ao inserir itens:", itemsError);
        throw itemsError;
      }

      console.log("Itens inseridos com sucesso");

      // 4. Preparar Modal de Sucesso
      setLastOrderNumber(orderData.daily_number || orderData.id);

      // 4. Resetar
      setCart([]);
      setCustomerName('');
      setPendingOrderId(null); // Clear pending
      setIsSidebarOpen(false);

      // Ativar modal de sucesso
      setShouldPrint(true);

      // SAFETY: Play Success Sound
      clearTimeout(safetyTimeout);
      try { playSuccess() } catch (e) { }

    } catch (e: any) {
      console.error("Exceção no checkout:", e);
      clearTimeout(safetyTimeout);
      try { playError() } catch (e) { }
      toast.error(`Erro ao processar venda. Verifique sua conexão. ${e.message || ''}`);
    } finally {
      setIsProcessing(false);
      setIsSubmitting(false); // Unlock button
    }
  };

  // --- HANDLER PARA EDITAR PEDIDO (Restored) ---
  const handleEditOrder = (order: Order, items: OrderItem[], neighborhoodName?: string) => {
    // 1. Confirmar com o usuário se quer sobrescrever o carrinho atual
    if (cart.length > 0) {
      if (!confirm("Editar este pedido substituirá os itens atuais do carrinho. Continuar?")) {
        return;
      }
    }

    // 2. Converter OrderItems para CartItems
    // 2. Converter OrderItems para CartItems
    const newCartItems: CartItem[] = items.map(item => {
      // FORCE CAST: The joined data exists at runtime but TS definitions might be missing 'products'
      const productData = (item as any).products || (item as any).product;

      return {
        tempId: crypto.randomUUID(),
        product: {
          id: item.product_id,
          name: productData?.name || 'Produto Desconhecido',
          price: item.unit_price,
          category: productData?.category || 'Outros',
          image_url: productData?.image_url,
          description: productData?.description,
          menu_number: productData?.menu_number || 0,
          is_available: true
        },
        quantity: item.quantity,
        notes: item.notes || '',
        addons: (item as any).addons_detail || [],
        tags: []
      };
    });

    // 3. Atualizar Estado do Carrinho
    setCart(newCartItems);
    setCustomerName(order.customer_name || '');

    // 4. Tentar recuperar o bairro (se possível)
    if (order.neighborhood_id) {
      const foundNeigh = neighborhoods.find(n => n.id === order.neighborhood_id);
      if (foundNeigh) {
        // Logica para setar bairro se houvesse estado (atualmente setNeighborhood no sidebar)
        // Isso pode requerer passar o bairro inicial para o CartSidebar
      }
    }

    // 5. Fechar Modal de Histórico e Feedback
    setIsHistoryOpen(false);
    toast.success(`Pedido #${order.daily_number} carregado para edição!`);
  };

  const handleReprint = (order: Order, items: OrderItem[], neighborhoodName: string) => {
    setLastOrder(order);
    setLastOrderItems(items);
    setLastOrderNeighborhood(neighborhoodName);
    setShouldPrint(true);
  };

  // Handler para Aceitar Pedido Web - COM TRAVA DE IMPRESSÃO
  const acceptWebOrder = async () => {
    if (!webOrderAlert) return;

    const orderId = webOrderAlert.id;

    // PRINT LOCK: Mark as printed FIRST to prevent re-processing
    setPrintedOrderIds(prev => new Set(prev).add(orderId));
    console.log('📰 Pedido marcado como processado:', orderId);

    try {
      // Atualizar status para 'confirmed' IMEDIATAMENTE
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          shift_id: currentShift?.id,
          // ADDED: Mark as printed in database too
          printed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      console.log('✅ Status atualizado para confirmed:', orderId);

      // --- BAIXA DE ESTOQUE (INVENTÁRIO) ---
      try {
        // 1. Buscar itens do pedido para saber o que baixar
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            // 2. Buscar ingredientes do produto
            const { data: ingredients } = await supabase
              .from('product_ingredients')
              .select('*')
              .eq('product_id', item.product_id);

            if (ingredients && ingredients.length > 0) {
              for (const ing of ingredients) {
                const qtyToDeduct = ing.quantity * item.quantity;

                // 3. Atualizar estoque
                const { data: stockItem } = await supabase
                  .from('stock_items')
                  .select('current_quantity')
                  .eq('id', ing.stock_item_id)
                  .single();

                if (stockItem) {
                  const newQty = (stockItem.current_quantity || 0) - qtyToDeduct;
                  await supabase
                    .from('stock_items')
                    .update({ current_quantity: newQty })
                    .eq('id', ing.stock_item_id);
                }
              }
            }
          }
        }
      } catch (stockError) {
        console.error("Erro na baixa de estoque (Web Order):", stockError);
      }
      // ---------------------------------------

      // Gerar link WhatsApp
      const phone = (webOrderAlert.customer_phone || '').replace(/\D/g, '');
      const message = encodeURIComponent(
        `Ola ${webOrderAlert.customer_name}! \n\nSeu pedido #${orderId} foi recebido e ja esta em preparacao!\n\nTotal: R$ ${(webOrderAlert.total || 0).toFixed(2)}\n\nObrigado pela preferencia!`
      );
      const whatsappUrl = `https://wa.me/55${phone}?text=${message}`;

      // Abrir WhatsApp em nova aba
      window.open(whatsappUrl, '_blank');

      // Fechar alerta
      setWebOrderAlert(null);

      // Mostrar toast de sucesso
      toast.success(`Pedido #${orderId} aceito e marcado como impresso!`);

    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      alert('Erro ao aceitar pedido. Tente novamente.');
      // Remove from printed set if failed
      setPrintedOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handler para Rejeitar Pedido Web
  const rejectWebOrder = async () => {
    if (!webOrderAlert) return;

    if (!confirm(`Rejeitar pedido de ${webOrderAlert.customer_name}?`)) return;

    try {
      await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', webOrderAlert.id);

      setWebOrderAlert(null);
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
    }
  };



  // --- FILTER LOGIC (Restored) ---
  // 1. Extract Unique Categories for the Menu (Stable List)
  const allCategories = React.useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Outros'));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      // 1. Search Filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        (product.code && product.code.toLowerCase().includes(searchLower));

      // 2. Category Filter
      const matchesCategory =
        selectedCategory === 'all' ||
        product.category === selectedCategory ||
        product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Agrupamento de Produtos para o Grid
  const groupedProducts = React.useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const cat = product.category || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(product);
    });
    return groups;
  }, [filteredProducts]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // RENDERIZAR: CARREGANDO
  if (loadingShift) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-[#FFCC00]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCC00]"></div>
      </div>
    );
  }

  // RENDERIZAR: ABRIR CAIXA (SEM TURNO ATIVO)
  if (!currentShift) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#1C1C1E] p-4 transition-colors">
        {onBackToAdmin && (
          <button onClick={onBackToAdmin} className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft size={20} /> <span className="text-sm font-medium">Voltar</span>
          </button>
        )}
        <div className="bg-[#2C2C2E] p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 border border-white/5">
          <div className="w-40 h-40 mx-auto mb-4">
            <img src="/card_logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">MasterPedidos</h1>

          {!showOpenInput ? (
            <>
              <p className="text-zinc-400 font-medium">Nenhum caixa aberto no momento.</p>
              <button
                onClick={() => setShowOpenInput(true)}
                className="w-full py-4 bg-[#FFCC00] hover:bg-[#E5B800] text-black rounded-2xl font-bold text-lg shadow-lg shadow-[#FFCC00]/10 transition-all transform hover:scale-[1.02]"
              >
                ABRIR CAIXA
              </button>
              <button onClick={onLogout} className="text-sm text-zinc-500 hover:text-white transition-colors underline-offset-4 hover:underline">Sair</button>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2 text-left">
                  Valor Inicial (Fundo de Troco)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={floatInput}
                    onChange={(e) => setFloatInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-white/10 bg-[#1C1C1E] text-white rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none text-lg transition-all"
                    placeholder="0.00"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleOpenShift();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOpenInput(false)}
                  className="flex-1 py-3 bg-[#1C1C1E] hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-2xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenShift}
                  className="flex-1 py-3 bg-[#FFCC00] hover:bg-[#E5B800] text-black rounded-2xl font-bold shadow-lg shadow-[#FFCC00]/20 transition-all transform hover:scale-[1.02]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDERIZAR: INTERFACE PDV HUB LAYOUT
  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden dark">

      {/* 🟢 LEFT PANEL: Products & Navigation */}
      <div className="flex-1 flex flex-col h-full lg:overflow-y-auto custom-scrollbar relative bg-black">

        {/* Header Fixo Desktop */}
        <header className="sticky top-0 z-30 bg-[#1C1C1E]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0 h-[60px]">
          <div className="flex items-center gap-3">
            {/* Mobile: Menu ou Voltar */}
            <div className="md:hidden flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                  MasterCheff <span className="text-[#FFCC00]">POS</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${currentShift ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {currentShift ? 'ABERTO' : 'FECHADO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop: Navigation Controls */}
            <div className="hidden md:flex items-center gap-3">
              {user?.role === 'admin' && onBackToAdmin ? (
                <button onClick={onBackToAdmin} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Painel Admin">
                  <LayoutDashboard size={20} className="text-gray-400 hover:text-white" />
                </button>
              ) : (
                <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Sair">
                  <LogOut size={20} className="text-gray-400" />
                </button>
              )}

              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                  MasterCheff <span className="text-[#FFCC00]">POS</span>
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentShift ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`}></div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {currentShift ? `Cx. Aberto` : 'Cx. Fechado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Actions (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              {user?.role === 'admin' && (
                <button
                  onClick={handleCloseShiftClick}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-500/20"
                >
                  Fechar Caixa
                </button>
              )}
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 bg-[#2C2C2E] rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Histórico"
              >
                <History size={18} />
              </button>
              <button
                onClick={() => setIsDigitalQueueOpen(true)}
                className="p-2 bg-[#2C2C2E] rounded-lg text-[#FFCC00] hover:text-yellow-300 transition-colors border border-[#FFCC00]/20"
                title="Fila Digital"
              >
                <Clock size={18} />
              </button>
            </div>

            {/* Search Bar - Desktop Only Here */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Buscar produto (F3)..."
                className="bg-[#2C2C2E] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-[#FFCC00] outline-none w-48 transition-all focus:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Fila Digital Indicator (Mobile) */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white relative mr-1"
            onClick={() => setIsDigitalQueueOpen(true)}
          >
            <Clock size={22} className={digitalQueueCount > 0 ? "text-[#FFCC00]" : "text-gray-400"} />
            {digitalQueueCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFCC00] rounded-full flex items-center justify-center border border-[#1C1C1E] shadow-sm animate-bounce-short">
                <span className="text-[10px] font-bold text-black leading-none">{digitalQueueCount}</span>
              </div>
            )}
          </button>

          {/* Mobile: Settings Trigger */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Settings size={22} />
          </button>

        </header>

        {/* 📱 MOBILE MANAGEMENT MENU (Dropdown) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#1C1C1E] border-b border-white/10 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* 1. Loja Online Status (REMOVIDO via User Request) */}

                {/* 2. Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Zerar fila */}
                  <button
                    onClick={async () => {
                      if (confirm("Tem certeza que deseja ZERAR a fila de impressao?")) {
                        await clearPrintQueue();
                        toast.success("Fila limpa!");
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 active:scale-95 transition-transform"
                  >
                    <RefreshCcw size={20} />
                    <span className="text-xs font-bold">Zerar Fila</span>
                  </button>

                  {/* Historico */}
                  <button
                    onClick={() => { setIsHistoryOpen(true); setIsMobileMenuOpen(false); }}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-[#2C2C2E] border border-white/10 rounded-xl text-gray-200 active:scale-95 transition-transform"
                  >
                    <History size={20} />
                    <span className="text-xs font-bold">Histórico</span>
                  </button>
                </div>

                {/* 3. Fechar Caixa & Admin */}
                <div className="flex flex-col gap-2 pt-2">
                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => { handleCloseShiftClick(); setIsMobileMenuOpen(false); }}
                        className="w-full py-3 bg-[#FFCC00] text-black font-bold text-sm rounded-xl shadow-lg active:scale-95 transition-transform"
                      >
                        Fechar Caixa
                      </button>

                      <button
                        onClick={onBackToAdmin}
                        className="w-full py-3 bg-white/5 text-gray-300 font-bold text-sm rounded-xl border border-white/10 active:bg-white/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <LayoutDashboard size={16} />
                        Voltar ao Painel
                      </button>
                    </>
                  )}
                  {user?.role !== 'admin' && (
                    <button
                      onClick={onLogout}
                      className="w-full py-3 bg-red-500/10 text-red-400 font-bold text-sm rounded-xl border border-red-500/20"
                    >
                      Sair (Logout)
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>



        <div className="sticky top-[60px] z-20 bg-black pt-2 pb-2 px-4 shadow-lg shrink-0">

          {/* DESKTOP CATEGORY MENU (Horizontal Scroll removed -> Centered & Visible) */}
          <div className="hidden lg:flex items-center justify-center gap-3 flex-wrap pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`relative px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors border ${selectedCategory === 'all'
                ? 'text-black border-transparent'
                : 'bg-[#2C2C2E] text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
            >
              <span className="relative z-10">Todos</span>
              {selectedCategory === 'all' && (
                <motion.div
                  layoutId="active-category"
                  className="absolute inset-0 bg-[#FFCC00] rounded-full z-0 shadow-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
            {/* Dynamic Categories from Grouped Products */}
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  // Optional: Smooth scroll to section
                  document.getElementById(`category-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`relative px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors border ${selectedCategory === cat
                  ? 'text-black border-transparent'
                  : 'bg-[#2C2C2E] text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="relative z-10">{cat}</span>
                {selectedCategory === cat && (
                  <motion.div
                    layoutId="active-category"
                    className="absolute inset-0 bg-[#FFCC00] rounded-full z-0 shadow-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>


        </div>

        {/* Product Grid Area */}
        <main className="p-4 flex-1">
          {Object.keys(groupedProducts).length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <div className="mx-auto w-16 h-16 bg-[#2C2C2E] rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-gray-500" />
              </div>
              <p className="text-gray-400">Nenhum produto encontrado.</p>
            </div>
          ) : (
            <>
              {Object.keys(groupedProducts).map((category) => (
                <div key={category} id={`category-${category}`} className="mb-8 scroll-mt-32">
                  {/* Sticky Section Header */}
                  <div className="sticky top-[60px] lg:top-[110px] z-40 mb-4 py-2 bg-black -mx-4 px-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2 py-1 bg-[#FFCC00] text-black rounded uppercase tracking-wider shadow-glow">
                        {category}
                      </span>
                      <div className="h-px bg-white/10 flex-1"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {groupedProducts[category].map((product) => {
                      const stockStatus = checkProductAvailability(
                        ingredientsMap[product.id] || [],
                        stockMap
                      );
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onClick={() => handleProductClick(product)}
                          stockStatus={stockStatus}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Extra space for mobile FAB */}
          <div className="h-24 lg:h-8"></div>
        </main>
      </div>

      {/* 🔵 RIGHT PANEL: Cart Sidebar (Always Visible on Desktop) */}
      <div className="hidden lg:block w-[400px] xl:w-[450px] border-l border-white/10 bg-[#1C1C1E] relative z-20 shrink-0 h-full">
        <div className="h-full">
          <CartSidebar
            isOpen={true}
            onClose={() => { }} // No-op on desktop
            cart={cart}
            neighborhoods={neighborhoods}
            onRemoveItem={removeFromCart}
            onCheckout={handleCheckout}
            isLoading={isProcessing || isSubmitting}
            customerName={customerName}
            setCustomerName={setCustomerName}
          />
        </div>
      </div>

      {/* 🟠 MOBILE ONLY ELEMENTS */}
      <div className="lg:hidden">
        <POSNavigation
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          cartCount={cart.length}
          onOpenCart={() => setIsSidebarOpen(true)}
          onSearch={(q) => setSearchQuery(q)}
        />
        {/* Floating Cart Button (Mobile Only - Legacy/Backup) */}
        <AnimatePresence>
          {
            cart.length > 0 && !isSidebarOpen && (
              <motion.button
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                onClick={() => setIsSidebarOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-[#FFCC00] rounded-full shadow-[0_4px_20px_rgba(255,204,0,0.4)] flex items-center justify-center z-40 md:bottom-8 md:right-8 active:scale-90 transition-transform"
              >
                <ShoppingCart className="text-black" size={28} />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-black">
                  {cart.length}
                </span>
              </motion.button>
            )
          }
        </AnimatePresence >

        {/* Mobile Cart Sidebar (Drawer) */}
        <div className="relative z-50">
          <CartSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            cart={cart}
            neighborhoods={neighborhoods}
            onRemoveItem={removeFromCart}
            onCheckout={handleCheckout}
            isLoading={isProcessing || isSubmitting}
            customerName={customerName}
            setCustomerName={setCustomerName}
          />
        </div>
      </div>

      {/* ⚪ SHARED MODALS & TOASTS */}

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && selectedProduct && (
          <ProductModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            product={selectedProduct}
            onAddToCart={(item) => {
              addToCart(item);
              setIsModalOpen(false);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 2000);
            }}
            availableAddons={addons}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Island Toast */}
      {
        showToast && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-down pointer-events-none w-full max-w-[300px] flex justify-center">
            <div className="bg-black/90 backdrop-blur border border-white/10 rounded-full px-5 py-2 shadow-2xl flex items-center gap-3">
              <div className="bg-[#FFCC00] rounded-full p-1">
                <Check size={12} className="text-black stroke-[3px]" />
              </div>
              <span className="text-white text-xs font-bold tracking-wide">Adicionado!</span>
            </div>
          </div>
        )
      }

      {/* History Modal */}
      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        shiftId={currentShift?.id || ''}
        onEditOrder={handleEditOrder}
        onReprint={handleReprint}
      />

      {/* Digital Queue Sidebar */}
      <DigitalQueueSidebar
        isOpen={isDigitalQueueOpen}
        onClose={() => setIsDigitalQueueOpen(false)}
        onImportOrder={handleImportPreOrder}
      />

      {/* 
      <ShiftOrdersSidebar
        isOpen={false}
        onClose={() => { }}
        onReprint={handleReprint}
        currentShiftId={currentShift?.id}
      /> 
      */}

      {/* --- MODAL DE SUCESSO / IMPRESSÃO --- */}
      {
        shouldPrint && lastOrderNumber && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
              <div className="bg-green-500 p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Check size={40} className="text-green-500" strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-black text-white mb-1">Pedido #{lastOrderNumber}</h2>
                <p className="text-green-100 font-medium">Registrado com Sucesso!</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                  <p className="text-blue-800 dark:text-blue-300 font-semibold">
                    🖨️ Pedido enviado para impressão!
                  </p>
                </div>

                <button
                  onClick={() => setShouldPrint(false)}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Novo Pedido
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Resumo do Fechamento */}
      {
        showCloseSummary && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#2C2C2E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
              {/* Header Fixo */}
              <div className="p-8 pb-4 text-center flex-none border-b border-white/5 bg-[#2C2C2E]">
                <h2 className="text-3xl font-bold text-white mb-2">Fechamento de Caixa</h2>
                <p className="text-gray-400">Resumo do turno atual</p>
              </div>

              {/* Conteúdo Scrollável */}
              <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">

                {/* Saldo Principal */}
                <div className="text-center mb-8">
                  <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Faturamento Total do Turno</p>
                  <div className="text-[#FFCC00] text-5xl font-bold tracking-tighter">
                    R$ {(shiftStats.total || 0).toFixed(2)}
                  </div>
                </div>

                {/* Lista de Detalhes */}
                <div className="space-y-2">
                  <div className="bg-[#1C1C1E] rounded-2xl p-4 flex justify-between items-center">
                    <span className="text-white font-medium">🛒 Vendas (Produtos)</span>
                    <span className="text-white font-bold">R$ {((shiftStats.total || 0) - (shiftStats.deliveryFees || 0)).toFixed(2)}</span>
                  </div>

                  <div className="bg-[#1C1C1E] rounded-2xl p-4 flex justify-between items-center border border-orange-500/20">
                    <span className="text-orange-400 font-medium">🛵 Taxas Motoboy</span>
                    <span className="text-orange-400 font-bold">R$ {(shiftStats.deliveryFees || 0).toFixed(2)}</span>
                  </div>

                  <div className="bg-[#1C1C1E] rounded-2xl p-4 flex justify-between items-center border border-green-500/20">
                    <span className="text-green-400 font-medium">💵 Total em Dinheiro</span>
                    <span className="text-green-400 font-bold">R$ {((currentShift?.initial_float || 0) + (shiftStats.cash || 0)).toFixed(2)}</span>
                  </div>
                </div>

                {/* 📊 SUB-RELATÓRIO DE NUMERÁRIO (Novo) */}
                <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/10 space-y-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📊 Resumo de Numerário</h3>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Troco Inicial</span>
                    <span className="text-white">R$ {(currentShift?.initial_float || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Vendas em Dinheiro (+)</span>
                    <span className="text-green-400 font-medium">R$ {(shiftStats.cash || 0).toFixed(2)}</span>
                  </div>

                  <div className="h-px bg-white/10 my-1"></div>

                  <div className="flex justify-between text-base font-bold">
                    <span className="text-white">Total na Gaveta (=)</span>
                    <span className="text-[#FFCC00]">R$ {((currentShift?.initial_float || 0) + (shiftStats.cash || 0)).toFixed(2)}</span>
                  </div>
                </div>

                {/* Auditoria de Cancelados */}
                {shiftStats.canceledOrders.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-red-400 font-bold flex items-center gap-2">
                        🚫 Auditoria de Cancelados
                      </h3>
                      <span className="text-red-400 font-bold">R$ {shiftStats.canceledTotal.toFixed(2)}</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                      {shiftStats.canceledOrders.map(order => (
                        <div key={order.id} className="text-xs text-red-300/80 flex justify-between">
                          <span>#{order.daily_number} - {order.customer_name}</span>
                          <span>R$ {order.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Fixo (Botões) */}
              <div className="p-8 pt-4 flex-none bg-[#2C2C2E] border-t border-white/5 space-y-3">
                <button
                  onClick={handleSendReportToWhatsApp}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>📱 Enviar Relatório WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowCloseSummary(false)}
                    className="w-full py-3 bg-transparent border border-white/10 text-gray-400 hover:text-white font-medium rounded-2xl hover:bg-white/5 transition-all text-sm"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={confirmCloseShift}
                    className="w-full py-3 bg-[#FFCC00] hover:bg-[#E5B800] text-black font-bold rounded-2xl shadow-lg shadow-[#FFCC00]/20 active:scale-95 transition-all text-sm"
                  >
                    Confirmar Fechamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Animações CSS customizadas */}
      <style>{`
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
      `}</style>
    </div >
  );
};