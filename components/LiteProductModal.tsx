import React, { useState, useEffect } from 'react';
import { Product, CartItem, Tag } from '../types';
import { X, Minus, Plus, Trash2, ChevronDown } from 'lucide-react';

interface LiteProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: CartItem) => void;
    availableTags: Tag[]; // We might use this for reference, but main logic uses description
}

export const LiteProductModal: React.FC<LiteProductModalProps> = ({
    product,
    isOpen,
    onClose,
    onAddToCart,
    availableTags
}) => {
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set()); // Tags marked for REMOVAL
    const [customNotes, setCustomNotes] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedTags(new Set());
            setCustomNotes('');
            setQuantity(1);
            setIsIngredientsOpen(false);
        }
    }, [isOpen]);

    if (!isOpen || !product) return null;

    // Derive ingredients from description
    const ingredients = product.description
        ? product.description.split(/, | e |\./).map(i => i.trim()).filter(i => i.length > 0)
        : [];

    const toggleTag = (label: string) => {
        const newTags = new Set(selectedTags);
        if (newTags.has(label)) {
            newTags.delete(label); // Un-remove (Add back)
        } else {
            newTags.add(label); // Mark for removal
        }
        setSelectedTags(newTags);
    };

    const handleAdd = () => {
        const finalNotesParts: string[] = [];

        // Add "Sem [Ingrediente]" notes
        selectedTags.forEach(tag => {
            finalNotesParts.push(tag);
        });

        if (customNotes.trim()) finalNotesParts.push(customNotes.trim());

        const item: CartItem = {
            tempId: Math.random().toString(36).substr(2, 9),
            product,
            quantity,
            notes: finalNotesParts.join(', '),
            tags: Array.from(selectedTags), // Technically these are "removed" ingredients, passing as tags for consistency
            addons: [] // No addons in Lite mode
        };

        onAddToCart(item);
        onClose();
    };

    const totalPrice = product.price * quantity;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-xl transition-all">
            <div className="bg-[#1C1C1E] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 border-t border-white/10 shadow-2xl flex flex-col max-h-[90vh] animate-slide-up sm:animate-scale-in">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{product.name}</h2>
                        <p className="text-[#FFCC00] font-bold text-xl mt-1">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-[#2C2C2E] rounded-full hover:bg-[#3C3C3E] transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 mb-6 space-y-6 scrollbar-hide">

                    {/* Ingredients Dropdown */}
                    {ingredients.length > 0 && (
                        <div>
                            <div
                                onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
                                className="bg-[#2C2C2E] text-white rounded-xl p-4 flex justify-between items-center cursor-pointer border border-white/5 active:bg-[#3C3C3E] transition-colors"
                            >
                                <span className="font-bold text-sm">Remover Ingredientes</span>
                                <ChevronDown
                                    size={20}
                                    className={`text-gray-400 transition-transform duration-300 ${isIngredientsOpen ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {/* Badges Summary (Visible when collapsed or always?) - Visible always below dropdown for better UX */}
                            {selectedTags.size > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 animate-fade-in pl-1">
                                    {Array.from(selectedTags).map(tag => (
                                        <span key={tag} className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded-md border border-red-500/20 font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Dropdown Content */}
                            {isIngredientsOpen && (
                                <div className="mt-2 space-y-2 animate-slide-down pl-2 border-l-2 border-white/5">
                                    {ingredients.map(ingredient => {
                                        const formattedIngredient = ingredient.charAt(0).toUpperCase() + ingredient.slice(1).toLowerCase();
                                        const tagLabel = `Sem ${formattedIngredient}`;
                                        const isRemoved = selectedTags.has(tagLabel);

                                        return (
                                            <button
                                                key={ingredient}
                                                onClick={() => toggleTag(tagLabel)}
                                                className={`w-full flex justify-between items-center p-3 rounded-xl transition-all ${isRemoved
                                                    ? 'bg-red-500/10 border border-red-500/50'
                                                    : 'bg-transparent hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isRemoved ? 'bg-red-500 border-red-500' : 'border-gray-500'
                                                        }`}>
                                                        {isRemoved && <X size={14} className="text-white" />}
                                                    </div>
                                                    <span className={`font-medium text-sm ${isRemoved
                                                        ? 'text-red-500 line-through'
                                                        : 'text-gray-300'
                                                        }`}>
                                                        {formattedIngredient}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Observations */}
                    <div>
                        <textarea
                            className="w-full bg-[#2C2C2E] border-none text-white placeholder-gray-500 rounded-xl p-4 h-24 focus:ring-1 focus:ring-[#FFCC00] resize-none outline-none text-sm"
                            placeholder="Observações (ex: Pão bem torrado...)"
                            value={customNotes}
                            onChange={(e) => setCustomNotes(e.target.value)}
                        />
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="flex flex-col gap-4">
                    {/* Quantity Control */}
                    <div className="flex items-center justify-between bg-[#2C2C2E] p-2 rounded-xl">
                        <span className="text-gray-400 text-sm font-bold ml-2">Quantidade</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 rounded-lg bg-[#3C3C3E] text-white flex items-center justify-center hover:bg-[#4C4C4E] active:scale-95 transition-all"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="text-xl font-bold w-8 text-center text-white">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 rounded-lg bg-[#3C3C3E] text-white flex items-center justify-center hover:bg-[#4C4C4E] active:scale-95 transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={handleAdd}
                        className="w-full py-4 bg-[#FFCC00] text-black font-bold text-lg rounded-2xl shadow-xl shadow-orange-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Adicionar a Sacola
                        <span className="bg-black/10 px-2 py-0.5 rounded text-sm font-black">
                            R$ {totalPrice.toFixed(2)}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};
