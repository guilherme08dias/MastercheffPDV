import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingCart, X, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface POSNavigationProps {
    cartCount: number;
    onSearch: (query: string) => void;
    onCategorySelect: (category: string) => void;
    onOpenCart: () => void;
    selectedCategory: string;
}

export const POSNavigation: React.FC<POSNavigationProps> = ({
    cartCount,
    onSearch,
    onCategorySelect,
    onOpenCart,
    selectedCategory
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when search opens
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
        onSearch(e.target.value);
    };

    const clearSearch = () => {
        setSearchText('');
        onSearch('');
        setIsSearchOpen(false);
        // Reset category if needed? No, keep context.
    };

    return (
        <>
            {/* NAVIGATION PILL PREMIUM V2 - Espelho exato do Cardapio.tsx */}
            <motion.div
                initial={{ y: 100, x: "-50%", opacity: 0 }}
                animate={{ y: 0, x: "-50%", opacity: 1 }}
                className="fixed bottom-8 left-1/2 z-50 w-[90%] max-w-md"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <div className="rounded-full bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/50 flex items-center justify-between px-2 py-4 relative overflow-hidden">

                    {/* 1. BUSCAR */}
                    {!isSearchOpen ? (
                        <motion.button
                            onClick={() => setIsSearchOpen(true)}
                            className="relative flex-1 flex flex-col items-center justify-center gap-y-1.5 h-full z-10"
                            whileTap={{ scale: 0.9 }}
                        >
                            <Search size={22} className="text-white/70 transition-colors" strokeWidth={2.5} />
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 whitespace-nowrap">BUSCAR</span>
                        </motion.button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex items-center gap-3 px-4 w-full h-full"
                        >
                            <Search size={22} className="text-white/50" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchText}
                                onChange={handleSearchChange}
                                placeholder="Buscar..."
                                autoFocus
                                className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-base"
                            />
                            <button
                                onClick={clearSearch}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} className="text-white/50" />
                            </button>
                        </motion.div>
                    )}

                    {/* 2. CATEGORIAS (Trigger Radial Menu) */}
                    {!isSearchOpen && (
                        <motion.button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="relative flex-1 flex flex-col items-center justify-center gap-y-1.5 h-full z-10"
                            whileTap={{ scale: 0.9 }}
                        >
                            <Grid size={22} className="text-white/70 transition-colors" strokeWidth={2.5} />
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 whitespace-nowrap">CATEGORIAS</span>
                        </motion.button>
                    )}

                    {/* 3. CARRINHO */}
                    {!isSearchOpen && (
                        <motion.button
                            onClick={onOpenCart}
                            className="relative flex-1 flex flex-col items-center justify-center gap-y-1.5 h-full z-10"
                            whileTap={{ scale: 0.9 }}
                        >
                            <div className="relative">
                                <ShoppingCart size={22} className="text-white/70 transition-colors" strokeWidth={2.5} />
                                {cartCount > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FFCC00] rounded-full flex items-center justify-center border border-black/60 shadow-sm"
                                    >
                                        <span className="text-[9px] font-bold text-black leading-none">{cartCount}</span>
                                    </motion.div>
                                )}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 whitespace-nowrap">CARRINHO</span>
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* RADIAL MENU OVERLAY */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40]"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <motion.div
                            className="fixed bottom-[110px] left-1/2 -translate-x-1/2 w-[80vw] max-w-md flex items-end justify-center h-0"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={{
                                open: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                                closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {[
                                { id: 'xis', label: 'Xis', x: '-33vw', y: 0, icon: '🍔' },
                                { id: 'hotdog', label: 'Dogs', x: '-11vw', y: -50, icon: '🌭' },
                                { id: 'porcoes', label: 'Porções', x: '11vw', y: -50, icon: '🍟' },
                                { id: 'bebida', label: 'Bebidas', x: '33vw', y: 0, icon: '🥤' }
                            ].map((item) => {
                                const isActive = selectedCategory === item.id;
                                return (
                                    <motion.button
                                        key={item.id}
                                        variants={{
                                            open: { x: item.x, y: item.y, scale: 1, opacity: 1 },
                                            closed: { x: 0, y: 80, scale: 0, opacity: 0 }
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            onCategorySelect(item.id);
                                            setTimeout(() => setIsMenuOpen(false), 150);
                                        }}
                                        className={`absolute left-1/2 -ml-8 h-16 w-16 rounded-full backdrop-blur-2xl border flex flex-col items-center justify-center shadow-2xl
                                            ${isActive ? 'bg-[#FFCC00] border-[#FFCC00]/50 text-black' : 'bg-black/80 border-white/10 text-white'}`}
                                    >
                                        {/* Label Badge */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                                            <span className="text-[10px] font-bold uppercase text-white">{item.label}</span>
                                        </div>
                                        <span className="text-3xl leading-none filter drop-shadow-md">{item.icon}</span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .ease-spring { transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>
        </>
    );
};
