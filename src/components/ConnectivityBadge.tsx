import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export const ConnectivityBadge: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    // Estado inicial null para não mostrar "Conectado" prematuramente sem check real do Supabase
    const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

    useEffect(() => {
        // 1. Browser API Listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 2. Supabase Realtime Health Check
        const channel = supabase.channel('system_health');

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setSupabaseConnected(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                setSupabaseConnected(false);
            }
        });

        // Supabase Disconnect Listener (Global)
        // Isso é mais difícil de pegar diretamente sem um wrapper,
        // mas o status do channel ajuda.

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            supabase.removeChannel(channel);
        };
    }, []);

    // Lógica Combinada: Se browser offline OU supabase desconectado = PROBLEMA
    const hasConnectionIssue = !isOnline || (supabaseConnected === false);

    return (
        <AnimatePresence>
            {hasConnectionIssue && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white shadow-xl"
                >
                    <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <WifiOff size={18} className="animate-pulse" />
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-sm">SEM CONEXÃO</span>
                                <span className="text-[10px] opacity-90">Não feche esta página!</span>
                            </div>
                        </div>
                        <div className="text-[10px] bg-white/20 px-2 py-1 rounded">
                            {!isOnline ? 'Internet Offline' : 'Servidor Inacessível'}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
