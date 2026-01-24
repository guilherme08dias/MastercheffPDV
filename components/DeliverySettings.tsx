
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, X, Check } from 'lucide-react';

interface DeliveryArea {
    id: string;
    name: string;
    fee: number;
    active: boolean;
}

export const DeliverySettings: React.FC = () => {
    const [areas, setAreas] = useState<DeliveryArea[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Novo Bairro
    const [newName, setNewName] = useState('');
    const [newFee, setNewFee] = useState('');

    useEffect(() => {
        fetchAreas();
    }, []);

    const fetchAreas = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('delivery_areas')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Erro ao buscar bairros:', error);
        } else {
            setAreas(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newName.trim() || !newFee) return;

        const feeValue = parseFloat(newFee.replace(',', '.'));
        if (isNaN(feeValue)) return;

        const { data, error } = await supabase
            .from('delivery_areas')
            .insert({
                name: newName.trim(),
                fee: feeValue,
                active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar:', error);
            alert('Erro ao adicionar bairro.');
        } else if (data) {
            setAreas([...areas, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewName('');
            setNewFee('');
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('delivery_areas')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar:', error);
        } else {
            setAreas(areas.map(a => a.id === id ? { ...a, active: !currentStatus } : a));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este bairro?')) return;

        const { error } = await supabase
            .from('delivery_areas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar:', error);
        } else {
            setAreas(areas.filter(a => a.id !== id));
        }
    };

    const handleUpdateFee = async (id: string, newFee: number) => {
        const { error } = await supabase
            .from('delivery_areas')
            .update({ fee: newFee })
            .eq('id', id);

        if (error) console.error('Error updating fee', error);
        else {
            setAreas(areas.map(a => a.id === id ? { ...a, fee: newFee } : a));
        }
    };

    return (
        <div className="bg-[#1C1C1E] rounded-xl shadow-lg p-6 animate-fade-in border border-white/10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">🛵 Taxas de Entrega por Bairro</h2>
                    <p className="text-gray-400 text-sm">Gerencie os valores de frete para cada região.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-[#FFCC00] hover:bg-[#E5B800] text-black px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                >
                    <Plus size={20} />
                    Novo Bairro
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 bg-[#2C2C2E] p-4 rounded-xl border border-white/10 flex gap-4 items-end animate-slide-down">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Nome do Bairro</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full p-2 rounded-lg border-none bg-[#1C1C1E] text-white focus:outline-none focus:ring-2 focus:ring-[#FFCC00]"
                            placeholder="Ex: Centro"
                            autoFocus
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Taxa (R$)</label>
                        <input
                            type="number"
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            className="w-full p-2 rounded-lg border-none bg-[#1C1C1E] text-white focus:outline-none focus:ring-2 focus:ring-[#FFCC00]"
                            placeholder="0.00"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={!newName || !newFee}
                        className="p-2.5 bg-green-900/40 text-green-400 rounded-lg hover:bg-green-900/60 disabled:opacity-50 border border-green-500/30"
                    >
                        <Check size={20} />
                    </button>
                    <button
                        onClick={() => setIsAdding(false)}
                        className="p-2.5 bg-red-900/40 text-red-400 rounded-lg hover:bg-red-900/60 border border-red-500/30"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin w-8 h-8 border-4 border-[#FFCC00] border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {areas.length === 0 && (
                        <p className="text-center text-gray-500 py-10">Nenhum bairro cadastrado.</p>
                    )}
                    {areas.map(area => (
                        <div key={area.id} className="flex items-center justify-between p-3 bg-[#2C2C2E] rounded-lg hover:bg-[#38383A] transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                                <button
                                    onClick={() => handleToggleActive(area.id, area.active)}
                                    className={`w-10 h-6 rounded-full p-1 transition-colors ${area.active ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${area.active ? 'translate-x-4' : ''}`}></div>
                                </button>
                                <span className={`font-medium text-white ${!area.active && 'opacity-50 line-through'}`}>
                                    {area.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">R$</span>
                                    <input
                                        type="number"
                                        defaultValue={area.fee}
                                        onBlur={(e) => handleUpdateFee(area.id, parseFloat(e.target.value))}
                                        className="w-20 bg-transparent font-bold text-right border-b border-gray-600 text-white focus:border-[#FFCC00] outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => handleDelete(area.id)}
                                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
