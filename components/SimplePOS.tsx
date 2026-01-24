import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { LogOut, UtensilsCrossed, X } from 'lucide-react';
import { getBrasiliaCurrentTime, getBrasiliaDateFormatted } from '../utils/dateUtils';

interface SimplePOSProps {
    user: Profile;
    onLogout: () => void;
    onBackToAdmin?: () => void;
}

export const SimplePOS: React.FC<SimplePOSProps> = ({ user, onLogout, onBackToAdmin }) => {
    // Debug Role for Critical Fix
    console.log("DEBUG ROLE CHECK:", { email: user?.email, role: user?.role });

    const [currentShift, setCurrentShift] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [showOpenModal, setShowOpenModal] = useState(false); // Mantido por compatibilidade, mas não usado no novo fluxo
    const [showOpenInput, setShowOpenInput] = useState(false);

    const [floatInput, setFloatInput] = useState('0');

    // Estado do Fechamento de Caixa
    const [showCloseSummary, setShowCloseSummary] = useState(false);
    const [shiftStats, setShiftStats] = useState({
        total: 0,
        cash: 0,
        credit: 0,
        debit: 0,
        pix: 0,
        ordersCount: 0
    });

    useEffect(() => {
        checkShift();
    }, []);

    const checkShift = async () => {
        console.log('Verificando turno aberto...');
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('status', 'open')
                .maybeSingle();

            if (error) {
                console.error('Erro ao buscar turno:', error);
                setError(`Erro ao buscar turno: ${error.message}`);
            } else if (data) {
                console.log('Turno aberto encontrado:', data);
                setCurrentShift(data);
            } else {
                console.log('Nenhum turno aberto');
                setCurrentShift(null);
            }
        } catch (err: any) {
            console.error('ERRO INESPERADO:', err);
            setError(`Erro inesperado: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async () => {
        const floatAmount = parseFloat(floatInput.replace(',', '.'));

        if (isNaN(floatAmount) || floatAmount < 0) {
            alert('Por favor, insira um valor válido para o fundo de troco.');
            return;
        }

        try {
            // ANCHOR: Ensure Shift Name is ALWAYS DD/MM/YY (Brasilia)
            const shiftName = getBrasiliaDateFormatted();

            // 1. Check for ANY existing shift with this name (Open or Closed)
            // This is the "Perguntar antes de Atirar" logic
            const { data: existingShift, error: checkError } = await supabase
                .from('shifts')
                .select('*')
                .eq('name', shiftName)
                .maybeSingle();

            if (checkError) {
                alert(`Erro ao verificar turnos existentes: ${checkError.message}`);
                return;
            }

            if (existingShift) {
                alert(`JÁ EXISTE UM CAIXA REGISTRADO PARA HOJE (${shiftName}).\n\nStatus: ${existingShift.status === 'open' ? 'ABERTO' : 'FECHADO'}.\n\nO sistema bloqueou a criação de um novo turno duplicado para evitar inconsistência nos relatórios.`);
                return;
            }

            // 2. Proceed to Create specific payload
            const payload = {
                opened_at: new Date().toISOString(),
                initial_float: floatAmount,
                status: 'open',
                opened_by: user.id,
                name: shiftName // Strict Name Anchor
            };

            const { data, error } = await supabase
                .from('shifts')
                .insert(payload)
                .select()
                .single();

            if (error) {
                // Handle Unique Violation (Duplicate Name)
                if (error.code === '23505') {
                    alert(`JÁ EXISTE UM CAIXA PARA HOJE (${shiftName}).\n\nO sistema não permite múltiplos caixas com o mesmo nome para garantir a integridade dos relatórios.\n\nSe você fechou o caixa por engano, contate o suporte para reabri-lo.`);
                } else {
                    alert(`Erro ao abrir caixa: ${error.message}`);
                }
                return;
            }

            if (data) {
                setCurrentShift(data);
                setShowOpenInput(false);
                setFloatInput('0');
                // alert(`Caixa aberto com sucesso! Turno: ${shiftName}`); // Less intrusive
            }

        } catch (err: any) {
            alert(`Erro inesperado ao abrir caixa: ${err.message}`);
        }
    };

    const handleCloseShiftClick = async () => {
        // Trava de Segurança Reforçada para Opção A
        if (user?.role !== 'admin') {
            alert('Acesso negado: Perfil sem permissão para fechar caixa.');
            return;
        }

        if (!currentShift) return;

        try {
            // Buscar pedidos do turno atual (exceto cancelados)
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('shift_id', currentShift.id)
                .neq('status', 'canceled');

            if (error) throw error;

            // Calcular totais
            const stats = {
                total: 0,
                cash: 0,
                credit: 0,
                debit: 0,
                pix: 0,
                ordersCount: orders?.length || 0
            };

            orders?.forEach(order => {
                stats.total += order.total;
                switch (order.payment_method) {
                    case 'cash': stats.cash += order.total; break;
                    case 'credit': stats.credit += order.total; break;
                    case 'debit': stats.debit += order.total; break;
                    case 'pix': stats.pix += order.total; break;
                }
            });

            setShiftStats(stats);
            setShowCloseSummary(true);

        } catch (error: any) {
            console.error('Erro ao calcular resumo:', error);
            alert('Erro ao calcular resumo do caixa');
        }
    };

    const confirmCloseShift = async () => {
        if (!currentShift) return;

        try {
            const { error } = await supabase
                .from('shifts')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString()
                })
                .eq('id', currentShift.id);

            if (error) {
                alert(`Erro ao fechar caixa: ${error.message}`);
            } else {
                setCurrentShift(null);
                setShowCloseSummary(false);
                if (onBackToAdmin) onBackToAdmin();
            }
        } catch (err: any) {
            alert(`Erro inesperado: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
                    <h2 className="text-yellow-800 font-bold text-lg mb-2">Erro</h2>
                    <p className="text-yellow-600 text-sm mb-4">{error}</p>
                    <button
                        onClick={checkShift}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    if (!currentShift) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                {onBackToAdmin && (
                    <button
                        onClick={onBackToAdmin}
                        className="absolute top-4 left-4 text-gray-500 hover:text-gray-800"
                    >
                        ← Voltar
                    </button>
                )}

                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                    <div className="w-40 h-40 mx-auto mb-4">
                        <img src="/card_logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">MasterPedidos</h1>

                    {!showOpenInput ? (
                        <>
                            <p className="text-gray-500 font-medium">Nenhum caixa aberto no momento.</p>

                            <button
                                onClick={() => setShowOpenInput(true)}
                                className="w-full py-4 bg-[#BB080E] hover:bg-[#9F1226] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#BB080E]/20 transition-all transform hover:scale-105"
                            >
                                ABRIR CAIXA
                            </button>

                            <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600 underline">
                                Sair
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                    Valor Inicial (Fundo de Troco)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={floatInput}
                                        onChange={(e) => setFloatInput(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BB080E] outline-none text-lg"
                                        placeholder="0.00"
                                        autoFocus
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleOpenShift();
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowOpenInput(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleOpenShift}
                                    className="flex-1 py-3 bg-[#BB080E] hover:bg-[#9F1226] text-white rounded-xl font-bold shadow-lg shadow-[#BB080E]/20 transition-all transform hover:scale-105"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal de Abertura de Caixa */}
                {showOpenModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Abrir Caixa</h2>
                                <button
                                    onClick={() => {
                                        setShowOpenModal(false);
                                        setFloatInput('0');
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Valor Inicial (Fundo de Troco)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={floatInput}
                                        onChange={(e) => setFloatInput(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-lg"
                                        placeholder="0.00"
                                        autoFocus
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleOpenShift();
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowOpenModal(false);
                                        setFloatInput('0');
                                    }}
                                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleOpenShift}
                                    className="flex-1 py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors shadow-lg"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-600 text-white p-2 rounded-lg">
                        <div className="w-8 h-8 relative">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">MasterPedidos</h1>
                        <span className="text-xs text-green-600 font-medium">● Caixa Aberto</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-right">
                        <p className="font-bold text-gray-700">{user.email}</p>
                        <p className="text-xs text-gray-400 uppercase">{user.role}</p>
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            onClick={handleCloseShiftClick}
                            className="text-gray-500 hover:text-yellow-600 flex items-center gap-2 text-sm font-medium px-3 py-2 rounded hover:bg-yellow-50"
                        >
                            <LogOut size={18} />
                            Fechar Caixa
                        </button>
                    )}

                    {/* Modal de Resumo do Fechamento */}
                    {showCloseSummary && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <LogOut className="text-red-600" size={24} />
                                    Fechamento de Caixa
                                </h2>

                                <div className="space-y-4 mb-6">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Total em Vendas</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            R$ {shiftStats.total.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{shiftStats.ordersCount} pedidos realizados</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-xs text-green-600 font-bold uppercase mb-1">Dinheiro</p>
                                            <p className="font-bold text-gray-900">R$ {shiftStats.cash.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Pix</p>
                                            <p className="font-bold text-gray-900">R$ {shiftStats.pix.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <p className="text-xs text-purple-600 font-bold uppercase mb-1">Crédito</p>
                                            <p className="font-bold text-gray-900">R$ {shiftStats.credit.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                            <p className="text-xs text-orange-600 font-bold uppercase mb-1">Débito</p>
                                            <p className="font-bold text-gray-900">R$ {shiftStats.debit.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCloseSummary(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmCloseShift}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        Confirmar Fechamento
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-md">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Caixa Aberto!</h2>
                    </div>

                    <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Data de Abertura:</span>
                            <span className="font-medium">{new Date(currentShift.opened_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Horário:</span>
                            <span className="font-medium">{new Date(currentShift.opened_at).toLocaleTimeString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Fundo de Troco:</span>
                            <span className="font-bold text-green-600">R$ {currentShift.initial_float?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 font-medium">
                            ✅ Sistema funcionando! Agora você pode integrar os componentes completos do POS.
                        </p>
                    </div>
                </div>
            </div>
            {/* Modal de Resumo do Fechamento - Movido para o final */}
            {showCloseSummary && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative z-[10000]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <LogOut className="text-red-600" size={24} />
                            Fechamento de Caixa
                        </h2>

                        <div className="space-y-4 mb-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-sm text-gray-500 mb-1">Total em Vendas</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    R$ {shiftStats.total.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{shiftStats.ordersCount} pedidos realizados</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <p className="text-xs text-green-600 font-bold uppercase mb-1">Dinheiro</p>
                                    <p className="font-bold text-gray-900">R$ {shiftStats.cash.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Pix</p>
                                    <p className="font-bold text-gray-900">R$ {shiftStats.pix.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                    <p className="text-xs text-purple-600 font-bold uppercase mb-1">Crédito</p>
                                    <p className="font-bold text-gray-900">R$ {shiftStats.credit.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">Débito</p>
                                    <p className="font-bold text-gray-900">R$ {shiftStats.debit.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseSummary(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmCloseShift}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Confirmar Fechamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
