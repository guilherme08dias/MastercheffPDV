import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shift, Product, Neighborhood, Tag, CartItem, OrderType, PaymentMethod, Order, OrderItem, Profile, Addon } from '../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { CartSidebar } from './CartSidebar';
import { ShiftOrdersSidebar } from './ShiftOrdersSidebar';
import { OrderHistoryModal } from './OrderHistoryModal';
import { ShoppingCart, LogOut, ArrowLeft, History, Sun, Moon, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBrasiliaDateFormatted } from '../utils/dateUtils';
import { POSNavigation } from './POSNavigation';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Estado da UI
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Alternar barra lateral móvel
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(''); // Estado da busca
  const [isDarkMode, setIsDarkMode] = useState(false); // Estado do Dark Mode
  const [showToast, setShowToast] = useState(false); // Dynamic Island Toast

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

  // Lógica do Carrinho
  const addToCart = (item: CartItem) => {
    setCart([...cart, item]);
  };

  const removeFromCart = (tempId: string) => {
    setCart(cart.filter(item => item.tempId !== tempId));
  };

  const handleCheckout = async (
    customerName: string,
    type: OrderType,
    paymentMethod: PaymentMethod,
    neighborhood: Neighborhood | null,
    discount?: { amount: number; type: 'fixed' | 'percentage'; reason: string }
  ) => {
    console.log("handleCheckout iniciado", { customerName, type, paymentMethod, neighborhood, discount });

    if (!currentShift) {
      console.error("Erro: currentShift é nulo no checkout");
      alert("Erro: Nenhum turno aberto. Tente recarregar a página.");
      return;
    }
    setIsProcessing(true);

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

      // LÓGICA DE NUMERAÇÃO POR TURNO (SHIFT-BASED)
      // Buscar o Maior Número do Turno Atual
      const { data: maxOrder } = await supabase
        .from('orders')
        .select('daily_number')
        .eq('shift_id', currentShift.id)
        .order('daily_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextDailyNumber = (maxOrder?.daily_number || 0) + 1;

      const { data: orderData, error: orderError } = await supabase
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
          daily_number: nextDailyNumber,
          discount_amount: discountAmount,
          discount_type: discount?.type || 'fixed',
          discount_reason: discount?.reason
        })
        .select()
        .single();

      if (orderError) {
        console.error("Erro ao criar pedido:", orderError);
        throw orderError;
      }
      if (!orderData) {
        throw new Error("Falha na criação do pedido: Sem dados");
      }

      console.log("Pedido criado com sucesso:", orderData);

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

      console.log("Itens inseridos com sucesso");

      // 3. BAIXA DE ESTOQUE (INVENTÁRIO)
      try {
        console.log("Iniciando baixa de estoque...");
        for (const cartItem of cart) {
          // Buscar ingredientes do produto
          const { data: ingredients } = await supabase
            .from('product_ingredients')
            .select('*')
            .eq('product_id', cartItem.product.id);

          if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
              const qtyToDeduct = ing.quantity * cartItem.quantity;

              // RPC seria ideal aqui, mas vamos de decremento direto pra simplificar
              // Usando rpc 'decrement_stock' se existisse, ou fetch+update
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

          // --- NOVO: BAIXA DOS ADICIONAIS ---
          if (cartItem.addons && cartItem.addons.length > 0) {
            for (const addon of cartItem.addons) {
              const { data: addonIngredients } = await supabase
                .from('addon_ingredients')
                .select('*')
                .eq('addon_id', addon.id);

              if (addonIngredients) {
                for (const ing of addonIngredients) {
                  const qtyToDeduct = ing.quantity * cartItem.quantity; // 1 addon * qtd lanches

                  const { data: stockItem } = await supabase
                    .from('stock_items')
                    .select('current_quantity')
                    .eq('id', ing.stock_item_id)
                    .single();

                  if (stockItem) {
                    const newQty = (stockItem.current_quantity || 0) - qtyToDeduct;
                    await supabase.from('stock_items').update({ current_quantity: newQty }).eq('id', ing.stock_item_id);
                  }
                }
              }
            }
          }
        }
        console.log("Baixa de estoque concluída.");
      } catch (stockError) {
        console.error("Erro na baixa de estoque (ignorado para não travar venda):", stockError);
      }

      // 4. Preparar Modal de Sucesso
      setLastOrderNumber(orderData.daily_number || orderData.id);

      // 4. Resetar & Mostrar Modal
      setCart([]);
      setCustomerName('');
      setIsSidebarOpen(false);

      // Ativar modal de sucesso
      setShouldPrint(true);

    } catch (e: any) {
      console.error("Exceção no checkout:", e);
      toast.error(`Erro ao processar venda. Verifique sua conexão. ${e.message || ''}`);
    } finally {
      setIsProcessing(false);
    }
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

  // Lógica de Filtro e Busca
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(searchLower) ||
      (p.menu_number && p.menu_number.toString() === searchLower); // Busca exata por número

    return matchesCategory && matchesSearch;
  });


  // RENDERIZAR: CARREGANDO
  if (loadingShift) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-[#FFCC00]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCC00]"></div>
      </div>
    );
  }

  // Placeholder para edição
  const handleEditOrder = (order: any) => {
    const newNote = prompt("Editar Observação do Pedido #" + order.daily_number, order.notes || "");
    if (newNote !== null) {
      supabase.from('orders').update({ notes: newNote }).eq('id', order.id).then(({ error }) => {
        if (error) toast.error("Erro ao atualizar");
        else toast.success("Observação atualizada");
      });
    }
  };

  // RENDERIZAR: ABRIR CAIXA (SEM TURNO ATIVO)
  if (!currentShift) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        {onBackToAdmin && (
          <button onClick={onBackToAdmin} className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} /> Voltar
          </button>
        )}
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-40 h-40 mx-auto mb-4">
            <img src="/card_logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MasterPedidos</h1>

          {!showOpenInput ? (
            <>
              <p className="text-gray-500 font-medium">Nenhum caixa aberto no momento.</p>
              <button
                onClick={() => setShowOpenInput(true)}
                className="w-full py-4 bg-[#BB080E] hover:bg-[#9F1226] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#BB080E]/20 transition-all transform hover:scale-105"
              >
                ABRIR CAIXA
              </button>
              <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600 underline">Sair</button>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Valor Inicial (Fundo de Troco)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={floatInput}
                    onChange={(e) => setFloatInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB080E] outline-none text-lg text-gray-900"
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
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenShift}
                  className="flex-1 py-3 bg-[#BB080E] hover:bg-[#9F1226] text-white rounded-xl font-bold shadow-lg shadow-[#BB080E]/20 transition-all transform hover:scale-105"
                >
                  Confirmar Abertura
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDERIZAR: INTERFACE PDV
  return <div className={`${isDarkMode ? 'dark' : ''}`}>
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans transition-colors duration-300">
      {/* Sidebar de Histórico (Esquerda) */}




      <CartSidebar
        cart={cart}
        neighborhoods={neighborhoods}
        onRemoveItem={(tempId) => setCart(prev => prev.filter(i => i.tempId !== tempId))}
        onCheckout={handleCheckout}
        isLoading={isProcessing}
        customerName={customerName}
        setCustomerName={setCustomerName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Modals Necessários */}
      {isModalOpen && selectedProduct && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={selectedProduct}
          availableAddons={addons}
          onAddToCart={(item) => {
            setCart([...cart, item]);
            setIsModalOpen(false);
            // Dynamic Island Toast
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
          }}
        />
      )}

      {/* Dynamic Island Toast (igual Cardapio.tsx) */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-slide-down pointer-events-none w-full max-w-[350px] flex justify-center md:hidden">
          <div className="bg-black border border-white/10 rounded-full px-5 py-3 shadow-2xl flex items-center gap-3">
            <div className="bg-[#FFCC00] rounded-full p-1">
              <Check size={14} className="text-black stroke-[3px]" />
            </div>
            <span className="text-white text-sm font-semibold tracking-wide">Item adicionado à sacola</span>
          </div>
        </div>
      )}

      {/* POS Navigation Fixed (Mobile Only) */}
      <div className="md:hidden">
        <POSNavigation
          cartCount={cart.length}
          onSearch={(query) => setSearchQuery(query)}
          onCategorySelect={(cat) => setSelectedCategory(cat)}
          onOpenCart={() => setIsSidebarOpen(true)}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* --- MODAL DE SUCESSO / IMPRESSÃO --- */}
      {shouldPrint && lastOrderNumber && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="bg-green-500 p-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-white mb-1">Pedido #{lastOrderNumber}</h2>
              <p className="text-green-100 font-medium">Registrado com Sucesso!</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                <p className="text-blue-800 dark:text-blue-300 font-semibold">
                  🖨️ Pedido enviado para impressão automática!
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                  O recibo será impresso automaticamente no servidor
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
      )}

      {/* --- MODAL DE ALERTA PEDIDO WEB --- */}
      {webOrderAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-center">
              <div className="text-3xl mb-1">📱</div>
              <h2 className="text-xl font-bold text-white">Novo Pedido Web!</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Cliente */}
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{webOrderAlert.customer_name}</p>
                <p className="text-gray-500 dark:text-gray-400">📞 {webOrderAlert.customer_phone}</p>
              </div>

              {/* Tipo e Pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl text-center font-bold ${webOrderAlert.order_type === 'delivery' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                  {webOrderAlert.order_type === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}
                </div>
                <div className={`p-3 rounded-xl text-center font-bold ${webOrderAlert.payment_method === 'pix' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  webOrderAlert.payment_method === 'cash' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  }`}>
                  {webOrderAlert.payment_method === 'pix' ? '📱 Pix' : webOrderAlert.payment_method === 'cash' ? '💵 Dinheiro' : '💳 Cartão'}
                </div>
              </div>

              {/* Total */}
              <div className="py-3 border-t border-b border-gray-200 dark:border-gray-700 text-center">
                <p className="text-3xl font-bold text-green-600">R$ {webOrderAlert.total.toFixed(2)}</p>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={rejectWebOrder}
                  className="flex-1 py-3 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-xl font-bold transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  ❌ Rejeitar
                </button>
                <button
                  onClick={acceptWebOrder}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  ✅ Aceitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full min-w-0 no-print relative bg-black">

        {/* MOBILE HEADER - Mirror Mode (Fixed, igual Cardapio.tsx) */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-4 pt-6 pb-3 flex flex-col items-center justify-center gap-1 relative">
            <img
              src="/logo.png"
              alt="Mastercheff"
              className="w-14 h-14 object-contain"
            />
            <h1 className="font-bold text-white tracking-wide uppercase text-xs text-center">
              Mastercheff POS
            </h1>
            {/* Status Dot (absolute left) */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${currentShift?.status === 'open' ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                {currentShift?.status === 'open' ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            {/* Botões (absolute right) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="w-9 h-9 bg-[#1C1C1E] rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10"
                title="Histórico de Pedidos"
              >
                <History size={16} />
              </button>
              <button
                onClick={handleClearPrintQueue}
                className="w-9 h-9 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                title="Zerar Fila de Impressão"
              >
                <AlertTriangle size={16} />
              </button>
              <button
                onClick={async () => {
                  if (confirm("Deseja realmente sair?")) {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }
                }}
                className="w-9 h-9 bg-[#1C1C1E] rounded-full flex items-center justify-center text-red-500/70 hover:text-red-500 transition-colors border border-white/10"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Spacer para Header Mobile Fixo */}
        <div className="h-28 md:hidden" />

        {/* Background Decorativo */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#1C1C1E]/50 to-transparent pointer-events-none z-0"></div>

        {/* Barra Superior - DESKTOP ONLY */}
        <header className="hidden md:flex relative z-10 px-8 py-6 flex-row justify-between items-center gap-4 shrink-0 backdrop-blur-xl bg-black/60 border-b border-white/10 sticky top-0">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {onBackToAdmin && user?.role === 'admin' && (
              <button onClick={onBackToAdmin} className="w-10 h-10 bg-[#1C1C1E] rounded-2xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2C2C2E] transition-all" title="Voltar ao Admin">
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="font-bold text-2xl text-white leading-none tracking-tight">MasterPedidos</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Caixa Aberto</span>
              </div>
            </div>
            {/* Kill Switch Desktop */}
            <button
              onClick={handleClearPrintQueue}
              className="ml-4 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              title="Emergência: Zerar Fila"
            >
              <AlertTriangle size={12} />
              Zerar Fila
            </button>
          </div>

          {/* Barra de Pesquisa Centralizada */}
          <div className="flex-1 max-w-md w-full mx-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Buscar por nome ou codigo..."
                className="w-full pl-12 pr-4 py-3 bg-[#1C1C1E] border-none rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#FFCC00] outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#FFCC00] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 bg-[#1C1C1E] rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#FFCC00] hover:bg-[#2C2C2E] transition-all active:scale-95"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 bg-[#1C1C1E] text-gray-400 hover:text-white hover:bg-[#2C2C2E] font-semibold text-sm px-4 py-3 rounded-2xl transition-all active:scale-95"
            >
              <History size={18} />
              <span className="hidden sm:inline">Historico</span>
            </button>

            {/* Live Status Indicator - AUTOMATED */}
            <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl border ${currentShift?.status === 'open'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${currentShift?.status === 'open' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold tracking-wider ${currentShift?.status === 'open' ? 'text-emerald-500' : 'text-red-500'}`}>
                {currentShift?.status === 'open' ? 'LOJA ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="text-right hidden sm:block bg-[#1C1C1E] px-4 py-2 rounded-2xl border border-white/10">
              <p className="font-semibold text-white text-sm">{user.email}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{user.role === 'admin' ? 'Admin' : 'Caixa'}</p>
            </div>

            {user?.role?.toLowerCase() === 'admin' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseShiftClick();
                }}
                className="relative z-50 text-gray-400 hover:text-red-400 flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-2xl hover:bg-red-600/20 transition-colors"
                title="Fechar Caixa"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Fechar Caixa</span>
              </button>
            )}


            {/* Botão de Logout Universal - Visível para todos */}
            <button
              onClick={async () => {
                if (confirm("Deseja realmente sair?")) {
                  await supabase.auth.signOut();
                  window.location.reload();
                }
              }}
              className="text-gray-400 hover:text-red-400 hover:bg-red-600/20 p-2 rounded-2xl transition-colors flex items-center gap-2"
              title="Sair do Sistema"
            >
              <LogOut size={20} />
              <span className="hidden md:inline font-semibold">Sair</span>
            </button>
          </div>
        </header>

        {/* Categorias - DESKTOP ONLY (e mobile apenas como fallback visual se necessário, mas oculta se nav pill ativa) */}
        <div className="relative z-10 px-8 pb-2 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-hide hidden md:block">
          <div className="flex gap-3">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'xis', label: 'Xis' },
              { id: 'hotdog', label: 'Dogs' },
              { id: 'porcoes', label: 'Porções' },
              { id: 'bebida', label: 'Bebidas' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 active:scale-95 ${selectedCategory === cat.id
                  ? 'bg-[#FFCC00] text-black'
                  : 'bg-[#1C1C1E] text-gray-400 hover:bg-[#2C2C2E] hover:text-white border border-white/10'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade - Mobile: max-w-2xl com animações, Desktop: grid normal */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 md:p-8 md:pb-8 relative z-10">
          {/* Mobile Grid com Framer Motion */}
          <motion.div
            layout
            className="flex flex-col md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-6 max-w-2xl mx-auto md:max-w-none"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
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
        </div>
      </div>

      {/* --- ÁREA DIREITA: Barra Lateral do Carrinho (Desktop) --- */}
      <div className="hidden md:block w-[400px] shrink-0 h-full no-print relative z-20">
        <CartSidebar
          cart={cart}
          neighborhoods={neighborhoods}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckout}
          isLoading={isProcessing}
          customerName={customerName}
          setCustomerName={setCustomerName}
        />
      </div>

      {/* --- GAVETA LATERAL MÓVEL --- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl animate-slide-in-right">
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">Carrinho</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <LogOut className="rotate-180 text-gray-500 dark:text-gray-400" size={18} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <CartSidebar
                  cart={cart}
                  neighborhoods={neighborhoods}
                  onRemoveItem={removeFromCart}
                  onCheckout={handleCheckout}
                  isLoading={isProcessing}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}



      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        shiftId={currentShift?.id || ''}
        onEditOrder={handleEditOrder}
      />

      {/* Modal de Resumo do Fechamento */}
      {showCloseSummary && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-8 pb-0 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Fechamento de Caixa</h2>
              <p className="text-gray-400">Resumo do turno atual</p>
            </div>

            <div className="p-8 space-y-6">

              {/* Saldo Principal */}
              <div className="text-center mb-8">
                <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Faturamento Total do Turno</p>
                <div className="text-[#FFCC00] text-5xl font-bold tracking-tighter">
                  R$ {(shiftStats.total || 0).toFixed(2)}
                </div>
              </div>

              {/* Lista de Detalhes */}
              <div className="space-y-2">
                <div className="bg-[#2C2C2E] rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-white font-medium">🛒 Vendas (Produtos)</span>
                  <span className="text-white font-bold">R$ {((shiftStats.total || 0) - (shiftStats.deliveryFees || 0)).toFixed(2)}</span>
                </div>

                <div className="bg-[#2C2C2E] rounded-2xl p-4 flex justify-between items-center border border-orange-500/20">
                  <span className="text-orange-400 font-medium">🛵 Taxas Motoboy</span>
                  <span className="text-orange-400 font-bold">R$ {(shiftStats.deliveryFees || 0).toFixed(2)}</span>
                </div>

                <div className="bg-[#2C2C2E] rounded-2xl p-4 flex justify-between items-center border border-green-500/20">
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

              {/* Botões */}
              <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-white/5">
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
        </div>
      )}
    </div>

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

};