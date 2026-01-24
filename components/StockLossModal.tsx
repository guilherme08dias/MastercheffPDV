import React, { useState } from 'react';
import { X, AlertOctagon, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StockItem } from '../types';

interface StockLossModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    stockItems: StockItem[];
}

export const StockLossModal: React.FC<StockLossModalProps> = ({ isOpen, onClose, onSuccess, stockItems }) => {
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('Vencimento');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const item = stockItems.find(i => i.id === selectedItemId);
            if (!item) return;

            const qty = parseFloat(quantity);
            const newQty = (item.current_quantity || 0) - qty;

            const { error } = await supabase
                .from('stock_items')
                .update({ current_quantity: newQty })
                .eq('id', selectedItemId);

            if (error) throw error;

            // TODO: Logar isso em tabela 'stock_losses' futuramente
            console.log(`Quebra registrada: ${item.name} - ${qty} ${item.unit} (${reason})`);

            alert(`Quebra registrada com sucesso! Estoque atualizado.`);
            onSuccess();
            onClose();
            setQuantity('');
            setSelectedItemId('');
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar quebra.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                <div className="bg-red-600 p-6 flex justify-between items-center text-white rounded-t-2xl">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertOctagon size={24} />
                        Registrar Quebra / Perda
                    </h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleConfirm} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Item</label>
                        <select
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={selectedItemId}
                            onChange={e => setSelectedItemId(e.target.value)}
                            required
                        >
                            <option value="">Selecione o item...</option>
                            {stockItems.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.current_quantity} {i.unit})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Quantidade Perdida</label>
                        <input
                            type="number"
                            step="0.001"
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Motivo</label>
                        <select
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        >
                            <option value="Vencimento">Vencimento</option>
                            <option value="Erro de Produção">Erro de Produção</option>
                            <option value="Consumo Interno">Consumo Interno / Funcionário</option>
                            <option value="Avaria">Avaria / Queda</option>
                            <option value="Qualidade Insuficiente">Qualidade Insuficiente</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Confirmar Baixa
                    </button>
                </form>
            </div>
        </div>
    );
};
