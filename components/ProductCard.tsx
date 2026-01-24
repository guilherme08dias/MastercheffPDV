import React from 'react';
import { Product } from '../types';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  return (
    <div
      onClick={() => onClick(product)}
      className="bg-[#1C1C1E] rounded-[20px] p-5 cursor-pointer border border-white/5 h-full flex flex-col justify-between relative overflow-hidden group transition-transform active:scale-[0.96] duration-200"
    >
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
        <p className="text-[#FFCC00] font-bold text-lg tracking-wide">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
        </p>

        <button className="bg-[#FFCC00] text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-[#FFCC00]/20 transition-transform active:scale-90 hover:scale-110">
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};