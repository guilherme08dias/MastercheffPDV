
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Trash2, UserPlus, Shield, User, Copy, Check } from 'lucide-react';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Estado para o formulário de novo usuário
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'admin' | 'cashier'>('cashier');
    const [generatedSql, setGeneratedSql] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (newUserEmail && newUserPassword) {
            const sql = `
-- 1. Criar usuário no Auth (Faça isso no painel Authentication do Supabase ou via SQL se tiver permissão)
-- INSERT INTO auth.users ... (Complexo via SQL puro sem extensão)

-- MELHOR OPÇÃO: Crie o usuário no painel do Supabase e depois rode isso:

INSERT INTO public.profiles (id, email, role)
SELECT id, email, '${newUserRole}'
FROM auth.users
WHERE email = '${newUserEmail}';
      `.trim();
            setGeneratedSql(sql);
        }
    }, [newUserEmail, newUserPassword, newUserRole]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('role');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja remover o acesso deste usuário? Ele não poderá mais acessar o sistema.')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            alert('Acesso do usuário removido com sucesso!');
            fetchUsers();
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            alert('Erro ao remover usuário.');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedSql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-[#1C1C1E] p-6 rounded-2xl border border-white/10">
                <h2 className="text-2xl font-bold text-white">Gerenciamento de Usuários</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-[#FFCC00] text-black px-4 py-2 rounded-lg hover:bg-[#E5B800] transition-colors font-bold shadow-lg"
                >
                    <UserPlus size={20} />
                    Novo Usuário
                </button>
            </div>

            <div className="bg-[#1C1C1E] rounded-2xl shadow-sm border border-white/10 overflow-hidden">
                {/* Mobile View: Cards */}
                <div className="md:hidden space-y-4 p-4">
                    {users.map((user) => (
                        <div key={user.id} className="bg-[#2C2C2E] p-4 rounded-xl flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`shrink-0 p-2 rounded-full ${user.role === 'admin' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                    {user.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-white truncate text-sm">{user.email}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                    ${user.role === 'admin' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                        {user.role === 'admin' ? 'Administrador' : 'Caixa'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Remover Acesso"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Desktop View: Table */}
                <table className="hidden md:table w-full text-left">
                    <thead className="bg-[#2C2C2E] text-gray-400 text-sm">
                        <tr>
                            <th className="py-4 px-6 font-medium">Usuário</th>
                            <th className="py-4 px-6 font-medium">Função</th>
                            <th className="py-4 px-6 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-[#2C2C2E] transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                            {user.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                                        </div>
                                        <span className="font-medium text-white">{user.email}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                    ${user.role === 'admin' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                        {user.role === 'admin' ? 'Administrador' : 'Caixa'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-gray-400 hover:text-yellow-500 transition-colors p-2 hover:bg-yellow-900/20 rounded-lg"
                                        title="Remover Acesso"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Adicionar Usuário */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-[#1C1C1E] w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-white/10 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Adicionar Novo Usuário</h3>

                        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mb-6 text-sm text-yellow-400">
                            <p className="font-bold mb-2">⚠️ Atenção</p>
                            <p>Como este sistema não possui um backend dedicado, a criação de usuários deve ser feita em duas etapas:</p>
                            <ol className="list-decimal ml-4 mt-2 space-y-1 text-yellow-300/80">
                                <li>Crie o usuário no painel do <strong>Supabase Authentication</strong>.</li>
                                <li>O sistema irá detectar automaticamente e criar o perfil, ou você pode rodar o SQL abaixo.</li>
                            </ol>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email do Novo Usuário</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full bg-[#2C2C2E] border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-[#FFCC00] outline-none"
                                    placeholder="exemplo@masterpedidos.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Função</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as any)}
                                    className="w-full bg-[#2C2C2E] border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-[#FFCC00] outline-none"
                                >
                                    <option value="cashier">Caixa (Atendente)</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>

                        {newUserEmail && (
                            <div className="bg-black rounded-lg p-4 relative group border border-white/5">
                                <code className="text-green-400 text-xs block whitespace-pre-wrap font-mono">
                                    {generatedSql}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute top-2 right-2 p-2 bg-white/10 rounded hover:bg-white/20 text-white transition-colors"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#2C2C2E] rounded-lg font-medium transition-colors"
                            >
                                Fechar
                            </button>
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-[#FFCC00] text-black rounded-lg font-bold hover:bg-[#E5B800] shadow-lg transition-colors"
                            >
                                Ir para Supabase
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
