import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Search, ArrowDownCircle, Loader2, CheckCircle2, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StockItem } from '../types';

interface StockEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<StockItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

    // Form States
    const [quantityToAdd, setQuantityToAdd] = useState('');
    const [unitPrice, setUnitPrice] = useState(''); // Preço por UN ou KG

    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchItems();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setSearchTerm('');
        setSelectedItem(null);
        setQuantityToAdd('');
        setUnitPrice('');
        setShowSuccess(false);
    };

    const fetchItems = async () => {
        const { data } = await supabase.from('stock_items').select('*').order('name');
        setItems(data || []);
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Quando seleciona item, preenche o preço atual
    useEffect(() => {
        if (selectedItem && selectedItem.cost_per_unit) {
            setUnitPrice(selectedItem.cost_per_unit.toString());
        } else {
            setUnitPrice('');
        }
    }, [selectedItem]);

    // Cálculo em Tempo Real
    const totalInvestment = useMemo(() => {
        const qty = parseFloat(quantityToAdd) || 0;
        const price = parseFloat(unitPrice) || 0;
        return qty * price;
    }, [quantityToAdd, unitPrice]);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !quantityToAdd) return;

        setLoading(true);
        try {
            const addedQty = parseFloat(quantityToAdd);
            const finalCostPerUnit = parseFloat(unitPrice) || 0;

            const newTotalQty = (selectedItem.current_quantity || 0) + addedQty;

            // 1. Update Stock Item
            const { error: updateError } = await supabase
                .from('stock_items')
                .update({
                    current_quantity: newTotalQty,
                    cost_per_unit: finalCostPerUnit // Atualiza custo com o da última compra
                })
                .eq('id', selectedItem.id);

            if (updateError) throw updateError;

            // 2. Insert Movement (Audit)
            const { error: moveError } = await supabase
                .from('stock_movements')
                .insert({
                    stock_item_id: selectedItem.id,
                    type: 'in', // Entrada
                    quantity: addedQty,
                    cost_at_time: finalCostPerUnit,
                    total_value: totalInvestment,
                    reason: 'Compra Manual',
                    // created_by: auth.uid() // Trigger ou RLS pega automático se tiver, senão null
                });

            // Log movement error but don't block success flow if table issues (migração pendente)
            if (moveError) console.error('Erro ao salvar histórico:', moveError);

            // Show success animation UI
            setShowSuccess(true);

            // Wait a bit then close
            setTimeout(() => {
                onSuccess(); // Refresh parent list
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error updating stock:', error);
            alert('Erro ao registrar entrada.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden">

                {/* Header */}
                <div className="bg-brand-600 p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ArrowDownCircle size={24} />
                        Nova Compra
                    </h2>
                    <button onClick={onClose} className="hover:bg-brand-700 p-1 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {showSuccess ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Entrada Confirmada!</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Adicionado <span className="font-bold">{quantityToAdd} {selectedItem?.unit}</span> de {selectedItem?.name}.
                        </p>
                        <div className="mt-4 text-sm text-gray-400">
                            Investimento: R$ {totalInvestment.toFixed(2)}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleConfirm} className="p-6 space-y-6">

                        {/* 1. Seleção de Item */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                Item Comprado
                            </label>

                            {!selectedItem ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Buscar pão, carne, refri..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border-none bg-[#2C2C2E] rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none text-white placeholder-gray-500"
                                    />
                                    {searchTerm && (
                                        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                                            {filteredItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setSearchTerm('');
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex justify-between items-center border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                                                >
                                                    <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded">
                                                        Atual: {item.current_quantity} {item.unit}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <div>
                                        <p className="font-bold text-lg text-blue-900 dark:text-blue-100">{selectedItem.name}</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            Estoque Atual: {selectedItem.current_quantity} {selectedItem.unit}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium text-sm px-3 py-1 bg-white dark:bg-slate-800 rounded shadow-sm"
                                    >
                                        Trocar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. Inputs de Calculadora */}
                        {selectedItem && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 mb-1">
                                            Quantidade ({selectedItem.unit})
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0.001"
                                            step="0.001"
                                            autoFocus
                                            value={quantityToAdd}
                                            onChange={(e) => setQuantityToAdd(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-xl font-bold text-brand-600 dark:bg-slate-800"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 mb-1">
                                            Valor Unitário (R$)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            value={unitPrice}
                                            onChange={(e) => setUnitPrice(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-xl font-bold text-gray-700 dark:text-white dark:bg-slate-800"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* CARD TOTAL CALCULADO */}
                                <div className="bg-gray-900 dark:bg-black rounded-xl p-4 flex items-center justify-between text-white shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/10 p-2 rounded-lg">
                                            <Calculator size={24} className="text-brand-300" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Total da Compra</p>
                                            <p className="text-xs text-gray-500">
                                                {quantityToAdd || '0'} x R$ {unitPrice || '0.00'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-brand-300">
                                        R$ {totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 text-gray-600 dark:text-slate-400 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedItem || !quantityToAdd}
                                className="flex-[2] py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                Confirmar Compra
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
