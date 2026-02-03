import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, UtensilsCrossed } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // App.tsx handles the session change
  };

  return (
    <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center p-4 transition-colors">
      <div className="bg-[#2C2C2E] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/5 animate-scale-in">
        <div className="p-8 pb-0 text-center">
          <div className="w-32 h-32 mx-auto mb-6">
            <img src="/card_logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">MasterPedidos</h1>
          <p className="text-zinc-400 mt-2 text-sm">Acesso Restrito Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-zinc-500" size={20} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-[#1C1C1E] border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#FFCC00] focus:border-transparent outline-none text-white placeholder-zinc-600 transition-all font-medium"
                placeholder="usuario@masterpedidos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-zinc-500" size={20} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-[#1C1C1E] border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#FFCC00] focus:border-transparent outline-none text-white placeholder-zinc-600 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFCC00] hover:bg-[#E5B800] text-black py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#FFCC00]/10 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Autenticando...</span>
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>

          <div className="flex flex-col items-center gap-4 mt-6 pt-4 border-t border-white/5">
            <button type="button" className="text-sm text-zinc-500 hover:text-white transition-colors">
              Esqueci minha senha
            </button>
            <div className="text-xs text-zinc-600">
              Mastercheff PDV v2.0
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};