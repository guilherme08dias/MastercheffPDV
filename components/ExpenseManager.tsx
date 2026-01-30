
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Expense, ExpenseCategory } from '../types';
import { Plus, Trash2, Calendar, DollarSign, Filter, FileText, Pencil, X } from 'lucide-react';
import { getBrasiliaDate, formatToBR } from '../utils/dateUtils';

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
    { id: 'energia', label: 'Energia Elétrica', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'contador', label: 'Contador', color: 'bg-blue-100 text-blue-800' },
    { id: 'salarios', label: 'Salários', color: 'bg-green-100 text-green-800' },
    { id: 'mercado', label: 'Mercado', color: 'bg-orange-100 text-orange-800' },
    { id: 'hamburguer', label: 'Hambúrguer', color: 'bg-red-100 text-red-800' },
    { id: 'pao', label: 'Pão', color: 'bg-amber-100 text-amber-800' },
    { id: 'embalagens', label: 'Embalagens', color: 'bg-purple-100 text-purple-800' },
    { id: 'gas', label: 'Gás', color: 'bg-red-100 text-red-800' },
    { id: 'outros', label: 'Outros', color: 'bg-gray-100 text-gray-800' },
];

export const ExpenseManager: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(getBrasiliaDate().slice(0, 7)); // YYYY-MM

    // Form State
    const [category, setCategory] = useState<ExpenseCategory>('mercado');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [expenseDate, setExpenseDate] = useState(getBrasiliaDate());
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);

    useEffect(() => {
        fetchExpenses();
        checkActiveShift();
    }, [selectedMonth]);

    const checkActiveShift = async () => {
        const { data } = await supabase
            .from('shifts')
            .select('id')
            .eq('status', 'open')
            .maybeSingle();

        if (data) {
            setCurrentShiftId(data.id);
        } else {
            setCurrentShiftId(null);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const startOfMonth = `${selectedMonth}-01`;
            const endOfMonth = `${selectedMonth}-31`;

            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .gte('expense_date', startOfMonth)
                .lte('expense_date', endOfMonth)
                .order('expense_date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            alert('Erro ao carregar despesas.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentShiftId && !editingExpenseId) {
            console.log("Lançando despesa sem turno ativo (Modo Retroativo)");
        }

        if (!amount || !category || !expenseDate) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        try {
            const payload: any = {
                category,
                description,
                amount: parseFloat(amount),
                expense_date: expenseDate,
            };

            if (!editingExpenseId && currentShiftId) {
                payload.shift_id = currentShiftId;
            }

            let data, error;

            if (editingExpenseId) {
                const result = await supabase
                    .from('expenses')
                    .update(payload)
                    .eq('id', editingExpenseId)
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            } else {
                const result = await supabase
                    .from('expenses')
                    .insert(payload)
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            if (editingExpenseId) {
                setExpenses(expenses.map(exp => exp.id === editingExpenseId ? data : exp));
            } else {
                setExpenses([data, ...expenses]);
            }

            closeModal();
        } catch (error) {
            console.error('Erro ao salvar despesa:', error);
            alert('Erro ao salvar despesa.');
        }
    };

    const handleEditExpense = (expense: Expense) => {
        setCategory(expense.category);
        setDescription(expense.description || '');
        setAmount(expense.amount.toString());
        setExpenseDate(expense.expense_date.slice(0, 10));
        setEditingExpenseId(expense.id);
        setIsModalOpen(true);
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setExpenses(expenses.filter(exp => exp.id !== id));
        } catch (error) {
            console.error('Erro ao excluir despesa:', error);
            alert('Erro ao excluir despesa.');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setCategory('mercado');
        setDescription('');
        setAmount('');
        setExpenseDate(getBrasiliaDate());
        setEditingExpenseId(null);
    };

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1C1C1E] p-4 md:p-6 rounded-2xl shadow-sm border border-white/10 transition-colors">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">Gerenciamento de Despesas</h2>
                    <p className="text-gray-400 text-sm md:text-base">Controle os gastos do seu negócio</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full md:w-auto px-4 py-3 md:py-2 bg-[#2C2C2E] border-none rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none text-white transition-colors"
                    />
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-[#FFCC00] text-black rounded-xl hover:bg-[#E5B800] transition-colors font-bold shadow-lg"
                    >
                        <Plus size={20} />
                        Nova Despesa
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                    <div className="p-3 bg-[#2C2C2E] rounded-xl text-red-500">
                        <DollarSign size={32} />
                    </div>
                    <div>
                        <p className="text-gray-400 font-medium text-sm md:text-base">Total de Despesas ({selectedMonth})</p>
                        <h3 className="text-3xl md:text-4xl font-black text-white mt-1">R$ {totalExpenses.toFixed(2)}</h3>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-[#1C1C1E] rounded-2xl shadow-sm border border-white/10 overflow-hidden transition-colors">
                {/* Mobile View: Cards */}
                <div className="md:hidden space-y-3 p-4">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Carregando...</div>
                    ) : expenses.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">Nenhuma despesa.</div>
                    ) : (
                        expenses.map((expense) => {
                            const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === expense.category);
                            return (
                                <div key={expense.id} className="p-4 bg-[#2C2C2E] rounded-xl border border-white/5 shadow-sm">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${categoryInfo?.color || 'bg-gray-700 text-gray-300'}`}>
                                                        {categoryInfo?.label || expense.category}
                                                    </span>
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {formatToBR(expense.expense_date)}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-white text-base leading-tight break-words">{expense.description || 'Sem descrição'}</p>
                                            </div>
                                            <div className="ml-3 shrink-0">
                                                <p className="font-black text-white text-xl">R$ {expense.amount.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-3 border-t border-white/5">
                                            <button
                                                onClick={() => handleEditExpense(expense)}
                                                className="flex-1 py-2 bg-blue-500/10 text-blue-400 font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors"
                                            >
                                                <Pencil size={14} /> EDITAR
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExpense(expense.id)}
                                                className="flex-1 py-2 bg-red-500/10 text-red-400 font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                                            >
                                                <Trash2 size={14} /> EXCLUIR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#2C2C2E] border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Valor</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Carregando despesas...</td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhuma despesa registrada neste mês.</td>
                                </tr>
                            ) : (
                                expenses.map((expense) => {
                                    const categoryInfo = EXPENSE_CATEGORIES.find(c => c.id === expense.category);
                                    return (
                                        <tr key={expense.id} className="hover:bg-[#2C2C2E] transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-300 font-medium">
                                                {formatToBR(expense.expense_date)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${categoryInfo?.color || 'bg-gray-700 text-gray-300'}`}>
                                                    {categoryInfo?.label || expense.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {expense.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-white text-right">
                                                R$ {expense.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEditExpense(expense)}
                                                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/10">
                        <div className="bg-[#2C2C2E] p-6 text-white flex justify-between items-center border-b border-white/10">
                            <h3 className="text-xl font-bold">{editingExpenseId ? 'Editar Despesa' : 'Nova Despesa'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data / Turno</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    {currentShiftId && !editingExpenseId ? (
                                        <div className="w-full pl-10 pr-4 py-2 border border-green-900/30 bg-green-900/20 text-green-400 rounded-xl flex items-center gap-2">
                                            <span className="font-bold text-sm">Vincular ao Turno Atual</span>
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            required
                                            disabled={!!editingExpenseId}
                                            value={expenseDate}
                                            onChange={(e) => setExpenseDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-[#2C2C2E] border-none rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none text-white transition-colors disabled:opacity-60"
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        required
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#2C2C2E] border-none rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none appearance-none text-white transition-colors"
                                    >
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Valor (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#2C2C2E] border-none rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none text-white transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição (Opcional)</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#2C2C2E] border-none rounded-xl focus:ring-2 focus:ring-[#FFCC00] outline-none resize-none text-white transition-colors"
                                        placeholder="Detalhes da despesa..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 bg-[#2C2C2E] text-white font-bold rounded-xl hover:bg-[#38383A] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-[#FFCC00] text-black font-bold rounded-xl hover:bg-[#E5B800] shadow-lg transition-colors"
                                >
                                    {editingExpenseId ? 'Salvar Alterações' : 'Salvar Despesa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
