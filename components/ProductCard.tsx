import { Plus, AlertCircle } from 'lucide-react';
import { StockStatus } from '../utils/stockUtils';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  stockStatus?: StockStatus; // Optional to prevent breaking other usages initially
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, stockStatus }) => {
  const isAvailable = stockStatus?.available ?? true;
  const isLowStock = stockStatus ? stockStatus.remaining > 0 && stockStatus.remaining < 5 : false;

  const handleClick = (p: Product) => {
    if (!isAvailable) return;
    onClick(p);
  };

  return (
    <div
      onClick={() => handleClick(product)}
      className={`bg-[#1C1C1E] rounded-[20px] p-5 cursor-pointer border h-full flex flex-col justify-between relative overflow-hidden group transition-transform duration-200
        ${isAvailable ? 'border-white/5 active:scale-[0.96] hover:border-[#FFCC00]/30' : 'border-red-500/20 opacity-60 grayscale cursor-not-allowed'}
      `}
    >
      {/* SOLD OUT OVERLAY */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-[2px]">
          <div className="bg-red-600/90 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-sm shadow-xl border border-red-400/30 transform -rotate-12">
            Esgotado
          </div>
        </div>
      )}

      {/* LOW STOCK BADGE */}
      {isLowStock && isAvailable && (
        <div className="absolute top-3 right-3 z-10 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
          <AlertCircle size={10} />
          Restam {stockStatus?.remaining}
        </div>
      )}

      <div>
        <h3 className="text-white font-bold text-lg leading-tight tracking-tight mb-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 font-medium">
            {product.description}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between mt-4">
        <p className={`font-bold text-lg tracking-wide ${isAvailable ? 'text-[#FFCC00]' : 'text-gray-500'}`}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
        </p>

        <button
          disabled={!isAvailable}
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform 
            ${isAvailable
              ? 'bg-[#FFCC00] text-black shadow-[#FFCC00]/20 active:scale-90 hover:scale-110'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};