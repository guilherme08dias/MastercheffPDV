import React from 'react';
import { Order, OrderItem, Neighborhood } from '../types';
import { removeAccents, formatCurrency as formatCurrencySafe } from '../utils/stringUtils';

interface ReceiptProps {
  order: Order | null;
  items: OrderItem[];
  neighborhoodName?: string;
}

export const Receipt: React.FC<ReceiptProps> = ({ order, items, neighborhoodName }) => {
  if (!order) return null;

  const formatCurrency = (value: number) => {
    return formatCurrencySafe(value);
  };

  const formatOrderNumber = (num: number) => {
    if (num === 13) {
      return '12+1';
    }
    return num.toString();
  };

  const subtotal = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);

  return (
    <div className="hidden print:block print-receipt">
      <div className="bg-white text-black p-0 w-[72mm] mx-auto font-sans leading-snug">

        {/* --- CABEÇALHO --- */}
        <div className="text-center mb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest">MASTERCHEFF</h2>
        </div>

        {/* --- IDENTIFICAÇÃO DO PEDIDO (ALTA DENSIDADE) --- */}
        <div className="flex justify-between items-center bg-black text-white p-2 mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] items-center font-bold uppercase leading-none">
              {order.type === 'delivery' ? 'ENTREGA' : order.type === 'takeaway' ? 'RETIRADA' : 'MESA'}
            </span>
          </div>
          <h1 className="text-4xl font-black leading-none tracking-tighter">
            #{formatOrderNumber(order.daily_number || order.id)}
          </h1>
        </div>

        {/* --- CLIENTE & DATA --- */}
        <div className="mb-3 px-1">
          <p className="text-xl font-black uppercase leading-tight break-words border-b-2 border-black pb-1 mb-1">
            {removeAccents(order.customer_name || 'CLIENTE NAO INFORMADO')}
          </p>
          <div className="flex justify-between text-[10px] font-bold">
            <span>{new Date().toLocaleDateString('pt-BR')}</span>
            <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {order.type === 'delivery' && neighborhoodName && (
            <div className="mt-1 bg-gray-200 p-1 rounded text-center">
              <p className="text-sm font-bold uppercase">Bairro: {removeAccents(neighborhoodName)}</p>
            </div>
          )}
        </div>

        {/* --- ITENS ULTRA-COMPACTOS --- */}
        <div className="flex flex-col w-full px-1">
          {items.map((item, idx) => (
            <div key={idx} className="mb-1 border-b border-dashed border-gray-400 pb-1 last:border-0">
              {/* Linha 1: Qtde + Nome ......... Preço */}
              <div className="flex justify-between items-baseline">
                <div className="flex gap-1 pr-2">
                  <span className="font-black text-sm w-5 text-right">{item.quantity}x</span>
                  <span className="font-bold text-sm uppercase leading-none">{removeAccents(item.product_name)}</span>
                </div>
                <span className="text-[10px] font-bold whitespace-nowrap">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>

              {/* Adicionais (Recuados e Compactos) */}
              {/* NOTA: Assumindo que item.addons existe no OrderItem ou será adicionado. Se não existir, isso não quebra, só não renderiza. 
                   O componente atual Receipt.tsx recebe items: OrderItem[].
                   Precisamos garantir que OrderItem tenha addons. Se não tiver no type, pode dar erro de TS.
                   Vou checar Types.ts depois se necessário, mas por ora assumo a estrutura padrão.
               */}
              {/* Observações */}
              {item.notes && (
                <div className="pl-6 mt-0.5">
                  <p className="text-[10px] font-bold uppercase bg-gray-100 inline-block px-1 rounded">
                    ** {removeAccents(item.notes)} **
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* --- TOTAIS COMPACTOS --- */}
        <div className="mt-2 border-t-2 border-black pt-1 px-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold">SUBTOTAL</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {order.delivery_fee_snapshot > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span>Entrega</span>
              <span>{formatCurrency(order.delivery_fee_snapshot)}</span>
            </div>
          )}

          {order.discount_amount > 0 && (
            <div className="flex justify-between items-center text-xs font-bold">
              <span>DESCONTO {order.discount_reason && `(${removeAccents(order.discount_reason)})`}</span>
              <span>- {formatCurrency(order.discount_amount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center mt-1 text-xl font-black">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>

          <div className="flex justify-between items-center mt-1 pt-1 border-t border-dashed border-gray-400 text-xs">
            <span>Pagamento:</span>
            <span className="font-black uppercase bg-black text-white px-2 rounded-sm">
              {order.payment_method === 'cash' ? 'DINHEIRO' :
                order.payment_method === 'credit' ? 'CRÉDITO' :
                  order.payment_method === 'debit' ? 'DÉBITO' : 'PIX'}
            </span>
          </div>
        </div>

        {/* Espaço de Corte */}
        <div className="h-[10mm] w-full text-center pt-4">
          <span className="text-[8px] text-gray-400">mastercheff system v2.0</span>
        </div>
      </div>
    </div>
  );
};