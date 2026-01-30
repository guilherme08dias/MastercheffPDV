
import React, { useState, useMemo } from 'react';
import { Trash2, ShoppingCart, ChevronDown, ArrowRight, Loader2, User, MapPin, UtensilsCrossed, ShoppingBag, Bike, Banknote, CreditCard, QrCode, X } from 'lucide-react';
import { CartItem, Neighborhood, OrderType, PaymentMethod } from '../types';

interface CartSidebarProps {
  cart: CartItem[];
  neighborhoods: Neighborhood[];
  onRemoveItem: (tempId: string) => void;
  onCheckout: (
    customerName: string,
    type: OrderType,
    paymentMethod: PaymentMethod,
    neighborhood: Neighborhood | null,
    discount?: { amount: number; type: 'fixed' | 'percentage'; reason: string }
  ) => void;
  isLoading: boolean;
  customerName: string;
  setCustomerName: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  neighborhoods,
  onRemoveItem,
  onCheckout,
  isLoading,
  customerName,
  setCustomerName,
  isOpen,
  onClose
}) => {
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderType>('local');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // Discount States
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Accordion States for Mobile Compact View
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // BUG FIX: Resetar bairro se não for entrega
  React.useEffect(() => {
    if (orderType !== 'delivery') {
      setSelectedNeighborhoodId('');
    }
  }, [orderType]);

  const selectedNeighborhood = useMemo(() =>
    neighborhoods.find(n => n.id === selectedNeighborhoodId) || null,
    [selectedNeighborhoodId, neighborhoods]);

  // Calcular total considerando Adicionais
  const subtotal = cart.reduce((acc, item) => {
    const addonsTotal = item.addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
    const itemTotal = (item.product.price + addonsTotal) * item.quantity;
    return acc + itemTotal;
  }, 0);

  const deliveryFee = (orderType === 'delivery' && selectedNeighborhood) ? Number(selectedNeighborhood.delivery_fee) : 0;

  // Calculate Discount
  const discountAmount = useMemo(() => {
    const value = parseFloat(discountValue.replace(',', '.')) || 0;
    if (value <= 0) return 0;
    if (discountType === 'fixed') {
      return Math.min(value, subtotal);
    } else {
      return Math.min((subtotal * value) / 100, subtotal);
    }
  }, [subtotal, discountValue, discountType]);

  const total = subtotal + deliveryFee - discountAmount;

  const handleCheckoutClick = () => {
    console.log("Validando checkout...", { cartLength: cart.length, customerName, orderType, selectedNeighborhood });
    if (cart.length === 0) return alert("Carrinho vazio!");
    if (!customerName.trim()) {
      console.warn("Validação falhou: Nome do cliente vazio");
      return alert("Digite o nome do cliente.");
    }
    if (orderType === 'delivery' && !selectedNeighborhood) return alert("Selecione um bairro.");

    if (!paymentMethod) return alert("Selecione a forma de pagamento!");

    // @ts-ignore
    onCheckout(customerName, orderType, paymentMethod, selectedNeighborhood, {
      amount: discountAmount,
      type: discountType,
      reason: discountReason || 'Desconto'
    });
  };

  return (
    <>
      {/* Overlay (Mobile Only) */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-[100dvh] w-full sm:w-[400px] bg-[#1C1C1E] border-l border-white/10 shadow-2xl z-50 transition-transform duration-300 transform flex flex-col lg:static lg:transform-none lg:w-full lg:h-full lg:z-auto lg:border-none lg:shadow-none ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#1C1C1E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFCC00] flex items-center justify-center text-black font-bold">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white leading-none">Seu Pedido</h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{cart.length} itens adicionados</p>
            </div>
          </div>

          {/* Close Button (Mobile Only) */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2C2C2E] text-gray-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Customer Input */}
        <div className="relative p-4 pb-0 shrink-0">
          <User className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Nome do Cliente"
            className="w-full pl-10 pr-4 py-3 bg-[#2C2C2E] border-none rounded-xl text-sm font-medium text-white placeholder-gray-500 focus:ring-2 focus:ring-[#FFCC00] outline-none transition-all"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 opacity-60">
              <ShoppingCart size={48} strokeWidth={1.5} />
              <p className="font-medium">Seu carrinho está vazio</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.tempId} className="group relative bg-[#2C2C2E] rounded-xl p-4 border border-white/10 hover:bg-[#38383A] transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.product.category}</span>
                    <h4 className="font-bold text-white leading-tight">{item.product.name}</h4>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.tempId)}
                    className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-600/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex justify-between items-end">
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Qtd: <span className="font-bold text-white">{item.quantity}x</span></p>

                    {/* Exibir Adicionais */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 mb-1">
                        {item.addons.map(addon => (
                          <span key={addon.id} className="text-[10px] bg-green-900/30 text-green-300 px-1.5 py-0.5 rounded border border-green-800 font-medium">
                            + {addon.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.notes && <p className="italic text-gray-500">"{item.notes}"</p>}
                  </div>
                  <p className="font-bold text-[#FFCC00]">
                    R$ {((item.product.price + (item.addons?.reduce((acc, curr) => acc + curr.price, 0) || 0)) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout */}
        <div className="p-6 bg-[#1C1C1E] border-t border-white/10 z-10 space-y-4 shadow-2xl">

          {/* Compact Grid for Type & Payment (Side-by-Side) */}
          <div className="grid grid-cols-2 gap-3 relative z-30">

            {/* 1. Order Type Dropup */}
            <div className="relative">
              <button
                onClick={() => { setIsTypeOpen(!isTypeOpen); setIsPaymentOpen(false); }}
                className="w-full py-3 px-3 bg-[#2C2C2E] border-none rounded-xl flex items-center justify-between shadow-sm hover:bg-[#38383A] transition-all"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {orderType === 'local' && <UtensilsCrossed size={16} className="text-[#FFCC00] shrink-0" />}
                  {orderType === 'takeaway' && <ShoppingBag size={16} className="text-blue-500 shrink-0" />}
                  {orderType === 'delivery' && <Bike size={16} className="text-orange-500 shrink-0" />}

                  <div className="flex flex-col items-start truncate">
                    <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Tipo</span>
                    <span className="text-xs font-bold text-white truncate">
                      {orderType === 'local' && 'Mesa'}
                      {orderType === 'takeaway' && 'Balcão'}
                      {orderType === 'delivery' && 'Entrega'}
                    </span>
                  </div>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isTypeOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTypeOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-[#2C2C2E] rounded-xl shadow-xl border border-white/10 overflow-hidden animate-fade-in divide-y divide-white/5">
                  <button onClick={() => { setOrderType('local'); setIsTypeOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <UtensilsCrossed size={16} className="text-[#FFCC00]" />
                    <span className="text-sm font-medium">Mesa</span>
                  </button>
                  <button onClick={() => { setOrderType('takeaway'); setIsTypeOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <ShoppingBag size={16} className="text-blue-500" />
                    <span className="text-sm font-medium">Balcão</span>
                  </button>
                  <button onClick={() => { setOrderType('delivery'); setIsTypeOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <Bike size={16} className="text-orange-500" />
                    <span className="text-sm font-medium">Entrega</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Payment Method Dropup */}
            <div className="relative">
              <button
                onClick={() => { setIsPaymentOpen(!isPaymentOpen); setIsTypeOpen(false); }}
                className={`w-full py-3 px-3 border-none rounded-xl flex items-center justify-between shadow-sm transition-all ${!paymentMethod
                  ? 'bg-red-900/20 border-red-500/30 text-red-400 animate-pulse-slow'
                  : 'bg-[#2C2C2E] hover:bg-[#38383A] text-white'
                  }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {!paymentMethod && <div className="w-4 h-4 rounded-full bg-red-400 shrink-0" />}
                  {paymentMethod === 'cash' && <Banknote size={16} className="text-green-500 shrink-0" />}
                  {paymentMethod === 'pix' && <QrCode size={16} className="text-emerald-500 shrink-0" />}
                  {paymentMethod === 'credit' && <CreditCard size={16} className="text-blue-500 shrink-0" />}
                  {paymentMethod === 'debit' && <CreditCard size={16} className="text-cyan-500 shrink-0" />}

                  <div className="flex flex-col items-start truncate">
                    <span className="text-[10px] text-gray-500 font-bold uppercase leading-none">Pagamento</span>
                    <span className={`text-xs font-bold truncate ${!paymentMethod ? 'text-red-400' : 'text-white'}`}>
                      {!paymentMethod && 'Selecionar...'}
                      {paymentMethod === 'cash' && 'Dinheiro'}
                      {paymentMethod === 'pix' && 'PIX'}
                      {paymentMethod === 'credit' && 'Crédito'}
                      {paymentMethod === 'debit' && 'Débito'}
                    </span>
                  </div>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isPaymentOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPaymentOpen && (
                <div className="absolute bottom-full right-0 w-full mb-2 bg-[#2C2C2E] rounded-xl shadow-xl border border-white/10 overflow-hidden animate-fade-in divide-y divide-white/5">
                  <button onClick={() => { setPaymentMethod('cash'); setIsPaymentOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <Banknote size={16} className="text-green-500" />
                    <span className="text-sm font-medium">Dinheiro</span>
                  </button>
                  <button onClick={() => { setPaymentMethod('pix'); setIsPaymentOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <QrCode size={16} className="text-emerald-500" />
                    <span className="text-sm font-medium">PIX</span>
                  </button>
                  <button onClick={() => { setPaymentMethod('credit'); setIsPaymentOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <CreditCard size={16} className="text-blue-500" />
                    <span className="text-sm font-medium">Crédito</span>
                  </button>
                  <button onClick={() => { setPaymentMethod('debit'); setIsPaymentOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left text-white">
                    <CreditCard size={16} className="text-cyan-500" />
                    <span className="text-sm font-medium">Débito</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {orderType === 'delivery' && (
            <div className="relative animate-fade-in">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedNeighborhoodId}
                onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                className="w-full pl-9 pr-8 py-3 bg-[#2C2C2E] border-none rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-[#FFCC00] outline-none appearance-none cursor-pointer shadow-sm"
              >
                <option value="">Selecione o Bairro...</option>
                {neighborhoods.map(n => (
                  <option key={n.id} value={n.id}>{n.name} (+ R$ {(n.delivery_fee || 0).toFixed(2)})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
          )}

          {/* Widget de Desconto */}
          <div className="mb-3">
            <button
              onClick={() => setIsDiscountOpen(!isDiscountOpen)}
              className="text-xs font-bold text-[#FFCC00] hover:text-[#E5B800] underline mb-2 flex items-center gap-1"
            >
              {isDiscountOpen ? 'Remover Desconto' : 'Adicionar Desconto / Cupom'}
            </button>

            {isDiscountOpen && (
              <div className="bg-[#2C2C2E] p-3 rounded-xl border border-dashed border-white/10 animate-fade-in">
                <div className="flex gap-2 mb-2">
                  <div className="flex bg-[#1C1C1E] rounded-lg p-1 border border-white/10 shrink-0">
                    <button
                      onClick={() => setDiscountType('fixed')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${discountType === 'fixed' ? 'bg-[#FFCC00] text-black shadow-sm' : 'text-gray-500 hover:bg-white/10'}`}
                    >
                      R$
                    </button>
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${discountType === 'percentage' ? 'bg-[#FFCC00] text-black shadow-sm' : 'text-gray-500 hover:bg-white/10'}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder={discountType === 'fixed' ? "0,00" : "0%"}
                    className="flex-1 bg-[#1C1C1E] border-none rounded-lg px-3 text-sm focus:ring-2 focus:ring-[#FFCC00] outline-none text-white"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  className="w-full bg-[#1C1C1E] border-none rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#FFCC00] outline-none text-white"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span>
              <span>R$ {(subtotal || 0).toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-400 font-medium">
                <span>Desconto {discountReason && `(${discountReason})`}</span>
                <span>- R$ {(discountAmount || 0).toFixed(2)}</span>
              </div>
            )}
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm text-[#FFCC00]">
                <span>Entrega</span>
                <span>R$ {(deliveryFee || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-2 border-t border-dashed border-white/10">
              <span className="font-bold text-white text-lg">Total</span>
              <span className="font-black text-3xl text-[#FFCC00] tracking-tight">R$ {(total || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckoutClick}
            disabled={isLoading || (orderType === 'delivery' && !selectedNeighborhood) || !paymentMethod}
            className="w-full py-4 bg-[#FFCC00] hover:bg-[#E5B800] text-black rounded-2xl font-semibold text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <span>Finalizar Pedido</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};