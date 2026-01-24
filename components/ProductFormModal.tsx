import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Product, ProductCategory, StockItem, ProductIngredient } from '../types';
import { supabase } from '../lib/supabase';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit?: Product | null;
    onSuccess: () => void;
}

// Sub-componente para Linha da Tabela com Toggle de Unidade
const IngredientRow: React.FC<{
    ingredient: ProductIngredient;
    stockItem?: StockItem;
    onUpdate: (qty: number) => void;
    onRemove: () => void;
}> = ({ ingredient, stockItem, onUpdate, onRemove }) => {
    // Estado local para unidade de visualização (ex: 'g' ou 'kg')
    // Inicializa com a unidade do estoque, mass permite toggle se for compatível
    const [displayUnit, setDisplayUnit] = useState(stockItem?.unit || 'un');
    const [inputValue, setInputValue] = useState('');

    // Sincroniza input quando a quantidade externa muda (ex: defaults)
    useEffect(() => {
        if (!stockItem) return;
        let visibleQty = ingredient.quantity;

        // Se Estoque=kg e Display=g -> Multiplica por 1000
        if (stockItem.unit === 'kg' && displayUnit === 'g') visibleQty *= 1000;
        if (stockItem.unit === 'L' && displayUnit === 'ml') visibleQty *= 1000;

        // Se Estoque=g e Display=kg -> Divide por 1000 (Raro)
        if (stockItem.unit === 'g' && displayUnit === 'kg') visibleQty /= 1000;
        if (stockItem.unit === 'ml' && displayUnit === 'L') visibleQty /= 1000;

        // Formatação clean (remove zeros desnecessários)
        setInputValue(parseFloat(visibleQty.toFixed(4)).toString());
    }, [ingredient.quantity, displayUnit, stockItem]);

    const handleChange = (val: string) => {
        setInputValue(val);
        const num = parseFloat(val);
        if (isNaN(num)) return;

        let finalQty = num;
        // Conversão inversa para salvar
        if (stockItem?.unit === 'kg' && displayUnit === 'g') finalQty /= 1000;
        if (stockItem?.unit === 'L' && displayUnit === 'ml') finalQty /= 1000;

        if (stockItem?.unit === 'g' && displayUnit === 'kg') finalQty *= 1000;
        if (stockItem?.unit === 'ml' && displayUnit === 'L') finalQty *= 1000;

        onUpdate(finalQty);
    };

    const toggleUnit = () => {
        if (!stockItem) return;
        if (stockItem.unit === 'kg') setDisplayUnit(prev => prev === 'kg' ? 'g' : 'kg');
        else if (stockItem.unit === 'L') setDisplayUnit(prev => prev === 'L' ? 'ml' : 'L');
        else if (stockItem.unit === 'g') setDisplayUnit(prev => prev === 'g' ? 'kg' : 'g');
        else if (stockItem.unit === 'ml') setDisplayUnit(prev => prev === 'ml' ? 'L' : 'ml');
    };

    const canToggle = stockItem && ['kg', 'g', 'L', 'ml'].includes(stockItem.unit);

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
            <td className="py-2 px-4 text-gray-900 dark:text-white">
                {stockItem?.name || 'Item Removido'}
            </td>
            <td className="py-2 px-4">
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={inputValue}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white text-right"
                    />
                    <div className="flex items-center gap-1 min-w-[60px]">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{displayUnit}</span>
                        {canToggle && (
                            <button
                                type="button"
                                onClick={toggleUnit}
                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                title="Alternar Unidade"
                            >
                                <RefreshCw size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </td>
            <td className="py-2 px-4 text-right text-sm text-gray-500 dark:text-slate-400">
                {stockItem?.cost_per_unit ? (
                    `R$ ${(ingredient.quantity * stockItem.cost_per_unit).toFixed(2)}`
                ) : '-'}
            </td>
            <td className="py-2 px-4 text-right">
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                    <Trash2 size={16} />
                </button>
            </td>
        </tr>
    );
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    productToEdit,
    onSuccess
}) => {
    // Tab State: 'general' | 'ingredients'
    const [activeTab, setActiveTab] = useState<'general' | 'ingredients'>('general');

    // General Data
    const [name, setName] = useState('');
    const [menuNumber, setMenuNumber] = useState('');
    const [category, setCategory] = useState<ProductCategory>('xis');
    const [price, setPrice] = useState('');
    const [isAvailable, setIsAvailable] = useState(true);
    const [description, setDescription] = useState('');

    // Ingredients Data
    const [ingredients, setIngredients] = useState<ProductIngredient[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [selectedStockId, setSelectedStockId] = useState('');

    // UI Loading States
    const [loading, setLoading] = useState(false);
    const [loadingIngredients, setLoadingIngredients] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            setActiveTab('general');
            if (productToEdit) {
                setName(productToEdit.name);
                setMenuNumber(productToEdit.menu_number ? productToEdit.menu_number.toString() : '');
                setCategory(productToEdit.category);
                setPrice(productToEdit.price.toString());
                setIsAvailable(productToEdit.is_available);
                setDescription(productToEdit.description || '');
                fetchIngredients(productToEdit.id);
            } else {
                resetForm();
            }
            fetchStockItems();
        }
    }, [isOpen, productToEdit]);

    const resetForm = () => {
        setName('');
        setMenuNumber('');
        setCategory('xis');
        setPrice('');
        setIsAvailable(true);
        setDescription('');
        setIngredients([]);
        setSelectedStockId('');
    };

    const fetchStockItems = async () => {
        const { data } = await supabase.from('stock_items').select('*').order('name');
        setStockItems(data || []);
    };

    const fetchIngredients = async (productId: string) => {
        setLoadingIngredients(true);
        const { data } = await supabase
            .from('product_ingredients')
            .select('*, stock_item:stock_items(*)')
            .eq('product_id', productId);

        if (data) {
            setIngredients(data as any);
        }
        setLoadingIngredients(false);
    };

    // Smart Add Ingredient
    const handleAddIngredient = () => {
        if (!selectedStockId) return;

        const stockItem = stockItems.find(item => item.id === selectedStockId);
        if (!stockItem) return;

        // SMART SEEDS (Sugestões)
        let defaultQty = 0;
        if (stockItem.unit === 'un') defaultQty = 1;
        else if (stockItem.unit === 'kg') defaultQty = 0.04; // 40g
        else if (stockItem.unit === 'g') defaultQty = 40;
        else if (stockItem.unit === 'L') defaultQty = 0.3; // 300ml
        else if (stockItem.unit === 'ml') defaultQty = 300;

        const newIngredient = {
            id: `temp-${Date.now()}`,
            product_id: productToEdit?.id || '',
            stock_item_id: selectedStockId,
            quantity: defaultQty,
            stock_item: stockItem // Important for cost calc
        } as ProductIngredient;

        setIngredients([...ingredients, newIngredient]);
        setSelectedStockId(''); // Reset selection to allow rapid adding
    };

    const handleUpdateIngredient = (index: number, newQty: number) => {
        const updated = [...ingredients];
        updated[index].quantity = newQty;
        setIngredients(updated);
    };

    const handleRemoveIngredient = (index: number) => {
        const updated = [...ingredients];
        updated.splice(index, 1);
        setIngredients(updated);
    };

    // Cost Calculation
    const totalCost = useMemo(() => {
        return ingredients.reduce((acc, ing) => {
            const cost = ing.stock_item?.cost_per_unit || 0;
            return acc + (ing.quantity * cost);
        }, 0);
    }, [ingredients]);

    const suggestedPrice = totalCost * 3; // Margem 3x

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const productPayload = {
                name,
                menu_number: menuNumber ? parseInt(menuNumber) : null,
                category,
                price: parseFloat(price),
                is_available: isAvailable,
                description: description.trim() || null
            };

            let productId = productToEdit?.id;

            // 1. Save Product
            if (productToEdit) {
                const { error } = await supabase
                    .from('products')
                    .update(productPayload)
                    .eq('id', productToEdit.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('products')
                    .insert(productPayload)
                    .select()
                    .single();
                if (error) throw error;
                productId = data.id;
            }

            // 2. Save Ingredients
            if (productId) {
                // Delete existing
                await supabase.from('product_ingredients').delete().eq('product_id', productId);

                // Insert new ones
                if (ingredients.length > 0) {
                    const ingredientsPayload = ingredients.map(ing => ({
                        product_id: productId,
                        stock_item_id: ing.stock_item_id,
                        quantity: ing.quantity
                    }));

                    const { error: ingError } = await supabase
                        .from('product_ingredients')
                        .insert(ingredientsPayload);

                    if (ingError) throw ingError;
                }
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Erro ao salvar produto');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl animate-scale-in h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-2xl z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {productToEdit ? 'Editar Produto' : 'Novo Produto'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-slate-800 px-6 bg-gray-50 dark:bg-slate-800/50">
                    <button
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        Dados Gerais
                    </button>
                    <button
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ingredients' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        onClick={() => setActiveTab('ingredients')}
                    >
                        Ficha Técnica
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
                        {activeTab === 'general' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nº</label>
                                        <input
                                            type="number"
                                            value={menuNumber}
                                            onChange={(e) => setMenuNumber(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white"
                                            placeholder="#"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome do Produto</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white"
                                            placeholder="Ex: Xis Salada"
                                        />
                                    </div>
                                </div>

                                {/* Descrição/Ingredientes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Descrição / Ingredientes</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white resize-none"
                                        placeholder="Ex: Pão brioche, blend 150g, bacon, queijo cheddar, maionese artesanal..."
                                    />
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Esta descrição será exibida no cardápio do cliente</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Categoria</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value as ProductCategory)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="xis">Xis</option>
                                            <option value="dog">Dog</option>
                                            <option value="combo">Combo</option>
                                            <option value="side">Porção</option>
                                            <option value="bebida">Bebida</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Preço (R$)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isAvailable"
                                        checked={isAvailable}
                                        onChange={(e) => setIsAvailable(e.target.checked)}
                                        className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                    />
                                    <label htmlFor="isAvailable" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                                        Produto disponível para venda
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Add Bar */}
                                <div className="flex gap-2 items-end bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Adicionar Ingrediente</label>
                                        <select
                                            value={selectedStockId}
                                            onChange={(e) => setSelectedStockId(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="">Selecione um insumo...</option>
                                            {stockItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({item.unit})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddIngredient}
                                        disabled={!selectedStockId}
                                        className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px] flex items-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Adicionar
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="border rounded-lg border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 dark:bg-slate-800">
                                            <tr>
                                                <th className="py-2 px-4 font-bold text-gray-600 dark:text-slate-300">Insumo</th>
                                                <th className="py-2 px-4 font-bold text-gray-600 dark:text-slate-300">Qtd. por Lanche</th>
                                                <th className="py-2 px-4 font-bold text-gray-600 dark:text-slate-300 text-right">Custo</th>
                                                <th className="py-2 px-4 font-bold text-gray-600 dark:text-slate-300 text-right">#</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {ingredients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-slate-500">
                                                        Nenhum ingrediente na ficha técnica.
                                                    </td>
                                                </tr>
                                            ) : (
                                                ingredients.map((ing, idx) => (
                                                    <IngredientRow
                                                        key={`${ing.stock_item_id}-${idx}`}
                                                        ingredient={ing}
                                                        stockItem={ing.stock_item || stockItems.find(s => s.id === ing.stock_item_id)}
                                                        onUpdate={(qty) => handleUpdateIngredient(idx, qty)}
                                                        onRemove={() => handleRemoveIngredient(idx)}
                                                    />
                                                ))
                                            )}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-slate-800/50 font-bold text-gray-900 dark:text-white">
                                            <tr>
                                                <td colSpan={2} className="py-3 px-4 text-right">Custo Total Estimado:</td>
                                                <td className="py-3 px-4 text-right text-brand-600">
                                                    R$ {totalCost.toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Margin Info */}
                                <div className="flex justify-between items-center text-sm p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                    <span>Sugestão de Venda (Margem 3x): <strong>R$ {suggestedPrice.toFixed(2)}</strong></span>
                                    <span>Lucro Bruto Estimado: <strong>R$ {(parseFloat(price || '0') - totalCost).toFixed(2)}</strong></span>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl mt-auto z-10">
                    {/* CMV Display */}
                    {ingredients.length > 0 && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                                    💰 Custo Estimado de Produção (CMV)
                                </span>
                                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                    R$ {totalCost.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="product-form"
                            disabled={loading}
                            className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-200"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Produto
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
