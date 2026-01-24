import React, { useState, useEffect } from 'react';

import { Product, Tag, CartItem, Addon } from '../types';
import { X, Check, Minus, Plus, ChevronDown } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  availableTags: Tag[];
  availableAddons: Addon[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  availableTags,
  availableAddons = [] // Default to empty array if not provided
}) => {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      console.log("DEBUG ProductModal Open:", {
        productCategory: product?.category,
        addonsCount: availableAddons.length,
        availableAddons
      });
      setSelectedTags(new Set());
      setSelectedAddons(new Set());
      setIsAddonsOpen(false);
      setCustomNotes('');
      setQuantity(1);
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const toggleTag = (label: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(label)) {
      newTags.delete(label);
    } else {
      newTags.add(label);
    }
    setSelectedTags(newTags);
  };

  const toggleAddon = (addonId: string) => {
    const newAddons = new Set(selectedAddons);
    if (newAddons.has(addonId)) {
      newAddons.delete(addonId);
    } else {
      newAddons.add(addonId);
    }
    setSelectedAddons(newAddons);
  };

  const handleAdd = () => {
    const finalNotesParts = [...Array.from(selectedTags)];

    // Get full addon objects
    const selectedAddonObjects = availableAddons.filter(a => selectedAddons.has(a.id));

    // Add addons to notes string for backward compatibility or simple view
    selectedAddonObjects.forEach(addon => {
      finalNotesParts.push(`+ ${addon.name}`);
    });

    if (customNotes.trim()) finalNotesParts.push(customNotes.trim());

    const item: CartItem = {
      tempId: Math.random().toString(36).substr(2, 9),
      product,
      quantity,
      notes: finalNotesParts.join(', '),
      tags: Array.from(selectedTags),
      addons: selectedAddonObjects
    };

    onAddToCart(item);
    onClose();
  };

  // Calculate dynamic price
  const addonsTotal = availableAddons
    .filter(a => selectedAddons.has(a.id))
    .reduce((acc, curr) => acc + curr.price, 0);

  const unitPrice = product.price + addonsTotal;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 no-print transition-all">
      <div className="bg-[#1C1C1E] w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] border border-white/10 animate-scale-in">

        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-white/5">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-white leading-tight">{product.name}</h2>
            <p className="text-[#FFCC00] font-bold text-xl mb-2 mt-1">R$ {product.price.toFixed(2)}</p>
            {product.description && (
              <p className="text-sm text-gray-400 leading-relaxed">{product.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-3 bg-[#2C2C2E] rounded-full hover:bg-[#3C3C3E] flex-shrink-0 transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Turbine seu Lanche Section */}
          {(product.category === 'xis' || product.category === 'dog' || product.category === 'hotdog') && availableAddons.length > 0 && (
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#2C2C2E]/30">
              <button
                onClick={() => setIsAddonsOpen(!isAddonsOpen)}
                className={`w-full flex justify-between items-center p-4 transition-colors ${isAddonsOpen
                  ? 'bg-[#FFCC00]/10 text-[#FFCC00]'
                  : 'text-white hover:bg-[#2C2C2E]'
                  }`}
              >
                <span className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  🍔 Turbine seu Lanche
                  {selectedAddons.size > 0 && (
                    <span className="bg-[#FFCC00] text-black text-[10px] px-2 py-0.5 rounded-full">
                      {selectedAddons.size}
                    </span>
                  )}
                </span>
                <ChevronDown
                  size={20}
                  className={`transition-transform duration-300 ${isAddonsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isAddonsOpen && (
                <div className="p-4 bg-[#1C1C1E] animate-slide-down border-t border-white/5">
                  <div className="grid grid-cols-2 gap-3">
                    {availableAddons.map(addon => {
                      const isSelected = selectedAddons.has(addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`flex justify-between items-center p-3 rounded-xl border transition-all ${isSelected
                            ? 'bg-[#FFCC00]/10 border-[#FFCC00] text-[#FFCC00] shadow-sm'
                            : 'bg-[#2C2C2E] border-transparent text-gray-300 hover:border-gray-600'
                            }`}
                        >
                          <span className="font-medium text-left text-sm">{addon.name}</span>
                          <span className="text-xs font-bold opacity-80 whitespace-nowrap">+ R$ {addon.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remove Ingredients Section */}
          {product.category !== 'bebida' && product.description && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Remover Ingredientes</h3>
              <div className="flex flex-wrap gap-2">
                {product.description
                  .split(/, | e |\./)
                  .map(i => i.trim())
                  .filter(i => i.length > 0)
                  .map(ingredient => {
                    const formattedIngredient = ingredient.charAt(0).toUpperCase() + ingredient.slice(1).toLowerCase();
                    const tagLabel = `Sem ${formattedIngredient}`;
                    const isSelected = selectedTags.has(tagLabel);
                    return (
                      <button
                        key={formattedIngredient}
                        onClick={() => toggleTag(tagLabel)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${isSelected
                          ? 'bg-red-500/10 border-red-500 text-red-500 line-through'
                          : 'bg-[#2C2C2E] border-transparent text-gray-300 hover:bg-[#3C3C3E]'
                          }`}
                      >
                        {formattedIngredient}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Custom Notes */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Outras Observações</h3>
            <textarea
              className="w-full border-none bg-[#2C2C2E] text-white rounded-xl p-4 text-sm focus:ring-2 focus:ring-[#FFCC00] outline-none resize-none placeholder-gray-500"
              rows={3}
              placeholder="Ex: Pão torrado, maionese à parte..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-white/5 bg-[#1C1C1E] rounded-b-3xl flex items-center gap-4">
          {/* Quantity */}
          <div className="flex items-center gap-3 bg-[#2C2C2E] rounded-xl p-1.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <Minus size={18} />
            </button>
            <span className="text-xl font-bold w-6 text-center text-white">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg bg-[#FFCC00] text-black flex items-center justify-center hover:bg-[#E5B800] transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="flex-1 bg-[#FFCC00] hover:bg-[#E5B800] text-black h-14 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <span>Adicionar</span>
            <span className="bg-black/10 px-2 py-0.5 rounded text-sm font-black">
              R$ {totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};