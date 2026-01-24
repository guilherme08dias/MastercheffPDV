
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StockItem } from '../types';
import { StockEntryModal } from './StockEntryModal';
import { StockLossModal } from './StockLossModal';
import { Plus, Search, Trash2, Loader2, Package, AlertTriangle, Save, X, ArrowDownCircle, AlertOctagon, Timer } from 'lucide-react';

export const StockManager: React.FC = () => {
    const [items, setItems] = useState<StockItem[]>([]);
    const [autonomyMap, setAutonomyMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isLossModalOpen, setIsLossModalOpen] = useState(false);

    // Form State
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [formName, setFormName] = useState('');
    const [formUnit, setFormUnit] = useState('un');
    const [formQuantity, setFormQuantity] = useState('');
    const [formMinQuantity, setFormMinQuantity] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .order('name');

            if (error) throw error;
            setItems(data || []);

            try {
                const { data: autonomyData, error: autonomyError } = await supabase
                    .from('stock_usage_stats')
                    .select('stock_item_id, days_autonomy');

                if (autonomyData && !autonomyError) {
                    const map: Record<string, number> = {};
                    autonomyData.forEach((row: any) => {
                        map[row.stock_item_id] = row.days_autonomy;
                    });
                    setAutonomyMap(map);
                }
            } catch (e) {
                console.warn('Autonomy view not ready or reachable');
            }

        } catch (error) {
            console.error('Error fetching stock items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item?: StockItem) => {
        if (item) {
            setEditingItem(item);
            setFormName(item.name);
            setFormUnit(item.unit);
            setFormQuantity(item.current_quantity.toString());
            setFormMinQuantity(item.min_quantity.toString());
        } else {
            setEditingItem(null);
            setFormName('');
            setFormUnit('un');
            setFormQuantity('0');
            setFormMinQuantity('5');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                name: formName,
                unit: formUnit,
                current_quantity: parseFloat(formQuantity),
                min_quantity: parseFloat(formMinQuantity)
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('stock_items')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('stock_items')
                    .insert(payload);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchItems();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Erro ao salvar item de estoque');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        try {
            const { error } = await supabase.from('stock_items').delete().eq('id', id);
            if (error) throw error;
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erro ao excluir. Verifique se não está vinculado a algum produto.');
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-[#1C1C1E] rounded-xl shadow-sm border border-white/10 flex flex-col h-[600px] animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1C1C1E] rounded-t-xl">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="text-[#FFCC00]" />
                        Controle de Estoque
                    </h2>
                    <p className="text-sm text-gray-400">Gerencie insumos e níveis de reposição</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsLossModalOpen(true)}
                        className="bg-red-900/20 text-red-400 hover:bg-red-900/40 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border border-red-500/20"
                        title="Registrar Perda/Quebra"
                    >
                        <AlertOctagon size={20} />
                        Quebra
                    </button>
                    <button
                        onClick={() => setIsEntryModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <ArrowDownCircle size={20} />
                        Entrada
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-[#FFCC00] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#E5B800] transition-colors shadow-lg"
                    >
                        <Plus size={20} />
                        Novo Item
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-4 bg-[#1C1C1E] border-b border-white/10">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar insumo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-none bg-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#FFCC00] outline-none text-white placeholder-gray-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-0">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-[#FFCC00]" size={40} />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p>Nenhum insumo encontrado.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2C2C2E] sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                            <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                                <th className="py-3 px-6 font-medium">Nome</th>
                                <th className="py-3 px-6 font-medium text-center">Unidade</th>
                                <th className="py-3 px-6 font-medium text-right">Quantidade Atual</th>
                                <th className="py-3 px-6 font-medium text-right">Mínimo</th>
                                <th className="py-3 px-6 font-medium text-center">Autonomia (Dias)</th>
                                <th className="py-3 px-6 font-medium text-center">Status</th>
                                <th className="py-3 px-6 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5 bg-[#1C1C1E]">
                            {filteredItems.map((item) => {
                                const isLowStock = item.current_quantity <= item.min_quantity;
                                const autonomy = autonomyMap[item.id];
                                let autonomyClass = "text-gray-500";
                                if (autonomy && autonomy < 2) autonomyClass = "text-red-400 font-bold animate-pulse";
                                else if (autonomy && autonomy < 7) autonomyClass = "text-yellow-500 font-bold";
                                else if (autonomy && autonomy >= 7) autonomyClass = "text-green-500";

                                return (
                                    <tr key={item.id} className="hover:bg-[#2C2C2E] transition-colors duration-200 group">
                                        <td className="py-3 px-6 border-b border-white/5 font-medium text-gray-300">{item.name}</td>
                                        <td className="py-3 px-6 border-b border-white/5 text-center text-gray-500">{item.unit}</td>
                                        <td className="py-3 px-6 border-b border-white/5 text-right font-bold text-gray-300">
                                            {item.current_quantity.toFixed(3).replace(/\.?0+$/, '')}
                                        </td>
                                        <td className="py-3 px-6 border-b border-white/5 text-right text-gray-500">
                                            {item.min_quantity}
                                        </td>
                                        <td className={`py-3 px-6 border-b border-white/5 text-center font-medium ${autonomyClass}`}>
                                            {autonomy !== undefined ? (autonomy > 365 ? '> 1 ano' : `${Math.round(autonomy)} dias`) : '-'}
                                        </td>
                                        <td className="py-3 px-6 border-b border-white/5 text-center">
                                            {isLowStock ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-900/20 text-red-400 animate-pulse border border-red-500/20">
                                                    <AlertTriangle size={12} /> Repor
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-900/20 text-green-400 border border-green-500/20">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-6 border-b border-white/5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Package size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-yellow-500 hover:bg-yellow-900/20 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-xl w-full max-w-sm animate-scale-in">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2C2C2E] rounded-t-2xl">
                            <h2 className="text-xl font-bold text-white">
                                {editingItem ? 'Editar Insumo' : 'Novo Insumo'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Insumo</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-2 border-none bg-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#FFCC00] outline-none text-white placeholder-gray-500"
                                    placeholder="Ex: Pão de Xis"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Unidade</label>
                                    <select
                                        value={formUnit}
                                        onChange={(e) => setFormUnit(e.target.value)}
                                        className="w-full px-4 py-2 border-none bg-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#FFCC00] outline-none text-white"
                                    >
                                        <option value="un">Unidade (un)</option>
                                        <option value="kg">Quilo (kg)</option>
                                        <option value="g">Grama (g)</option>
                                        <option value="L">Litro (L)</option>
                                        <option value="ml">Mililitro (ml)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Qtd Mínima</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.001"
                                        value={formMinQuantity}
                                        onChange={(e) => setFormMinQuantity(e.target.value)}
                                        className="w-full px-4 py-2 border-none bg-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#FFCC00] outline-none text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade Atual</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.001"
                                    value={formQuantity}
                                    onChange={(e) => setFormQuantity(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-600 bg-[#2C2C2E] rounded-lg focus:ring-2 focus:ring-[#FFCC00] outline-none text-white font-bold"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 bg-[#2C2C2E] text-white font-medium rounded-xl hover:bg-[#38383A] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-[#FFCC00] text-black font-bold rounded-xl hover:bg-[#E5B800] transition-colors flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Stock Entry & Loss Modals - Assuming they will inherit themes or need separate updates. But focusing on main manager for now */}
            <StockEntryModal
                isOpen={isEntryModalOpen}
                onClose={() => setIsEntryModalOpen(false)}
                onSuccess={fetchItems}
            />

            <StockLossModal
                isOpen={isLossModalOpen}
                onClose={() => setIsLossModalOpen(false)}
                onSuccess={fetchItems}
                stockItems={items}
            />
        </div>
    );
};
