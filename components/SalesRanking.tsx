import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, TrendingUp, TrendingDown, Award, ShoppingBag, Loader2, ArrowUpDown, Search } from 'lucide-react';
import { getBrasiliaDate } from '../utils/dateUtils';
import { motion } from 'framer-motion';

interface SalesRankingItem {
    product_name: string;
    quantity_sold: number;
    total_revenue: number;
    category: string;
    rank: number;
}

export const SalesRanking: React.FC = () => {
    // Dates
    const [startDate, setStartDate] = useState(() => {
        const date = new Date(getBrasiliaDate());
        date.setDate(1); // 1st of current month
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return getBrasiliaDate(); // Today
    });

    // Content
    const [ranking, setRanking] = useState<SalesRankingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Category Filter State
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

    const fetchRanking = async () => {
        setLoading(true);
        try {
            // Adjust dates for full day coverage
            const queryStartDate = new Date(`${startDate}T00:00:00`).toISOString();
            const queryEndDate = new Date(`${endDate}T23:59:59.999`).toISOString();

            const { data, error } = await supabase.rpc('get_sales_ranking', {
                start_date: queryStartDate,
                end_date: queryEndDate
            });

            if (error) {
                console.error('Error details:', error);
                throw error;
            }
            setRanking(data || []);

        } catch (error: any) {
            console.error('Error fetching ranking:', error.message || error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRanking();
    }, [startDate, endDate]);

    const categories = ['Todos', 'xis', 'hot dog', 'bebida', 'porcoes'];

    const filteredRanking = ranking.filter(item =>
        selectedCategory === 'Todos' ||
        (selectedCategory === 'xis' && (item.category === 'xis' || !item.category)) || // Fallback for legacy
        item.category === selectedCategory
    );

    const sortedRanking = [...filteredRanking].sort((a, b) => {
        if (sortOrder === 'desc') {
            return b.quantity_sold - a.quantity_sold;
        } else {
            return a.quantity_sold - b.quantity_sold;
        }
    });

    const handleClearFilters = () => {
        setStartDate(() => {
            const date = new Date(getBrasiliaDate());
            date.setDate(1);
            return date.toISOString().split('T')[0];
        });
        setEndDate(getBrasiliaDate());
        setSelectedCategory('Todos');
        setSortOrder('desc');
        fetchRanking();
    };

    return (
        <div className="space-y-6">
            {/* Header / Filter Bar */}
            <div className="flex flex-col gap-4 bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-white/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Award className="text-[#FFCC00]" size={24} />
                            Ranking de Produtos
                        </h2>
                        <p className="text-xs text-gray-400">Analise os itens {sortOrder === 'desc' ? 'mais' : 'menos'} vendidos</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Date Picker */}
                        <div className="flex items-center gap-2 bg-[#2C2C2E] p-2 rounded-lg border border-white/10 flex-1 md:flex-initial">
                            <Calendar size={16} className="text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-xs focus:ring-0 text-white p-0 w-24"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-xs focus:ring-0 text-white p-0 w-24"
                            />
                        </div>

                        {/* Sort Toggle */}
                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="p-2 bg-[#2C2C2E] text-white rounded-lg border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2"
                            title={sortOrder === 'desc' ? "Mudar para Menos Vendidos" : "Mudar para Mais Vendidos"}
                        >
                            <ArrowUpDown size={16} />
                            <span className="text-xs font-bold hidden md:inline">
                                {sortOrder === 'desc' ? 'Mais Vendidos' : 'Menos Vendidos'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Category Pills - Scrollable on Mobile */}
                <div className="overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedCategory === cat
                                    ? 'bg-[#FFCC00] text-black border-[#FFCC00]'
                                    : 'bg-transparent text-[#FFCC00] border-[#FFCC00]/30 hover:bg-[#FFCC00]/10'
                                    }`}
                            >
                                {cat === 'Todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-[#FFCC00]" size={32} />
                </div>
            ) : sortedRanking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-[#1C1C1E] rounded-2xl border border-white/5 text-center px-4">
                    <div className="w-16 h-16 bg-[#2C2C2E] rounded-full flex items-center justify-center mb-4">
                        <Search className="text-gray-400 opacity-50" size={32} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">
                        {selectedCategory === 'Todos' ? 'Nenhuma venda encontrada' : `Nenhum(a) ${selectedCategory} vendido(a)`}
                    </h3>
                    <p className="text-sm max-w-xs mx-auto mb-6">
                        Não há registros para este filtro no período selecionado.
                    </p>
                    <button
                        onClick={handleClearFilters}
                        className="px-4 py-2 bg-[#FFCC00] text-black font-bold rounded-lg hover:bg-[#E5B800] transition-colors"
                    >
                        Limpar Filtros
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedRanking.map((item, index) => {
                        const actualRank = sortOrder === 'desc' ? index + 1 : ranking.length - index;
                        const isTop3 = index < 3 && sortOrder === 'desc';
                        const rankColor = index === 0 && sortOrder === 'desc' ? 'text-[#FFCC00] border-[#FFCC00]/50' :
                            index === 1 && sortOrder === 'desc' ? 'text-gray-300 border-gray-300/50' :
                                index === 2 && sortOrder === 'desc' ? 'text-orange-400 border-orange-400/50' : 'text-gray-500 border-white/10';

                        return (
                            <motion.div
                                key={item.product_name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-[#2C2C2E] rounded-xl border ${isTop3 ? 'border-[#FFCC00]/30 bg-[#FFCC00]/5' : 'border-white/5'} relative group overflow-hidden`}
                            >
                                {/* Visual Scroll Hint (Right Side) for Mobile */}
                                <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/50 to-transparent pointer-events-none z-10" />

                                {/* Scrollable Container */}
                                <div className="p-4 overflow-x-auto whitespace-nowrap scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                                    <div className="flex items-center gap-4 min-w-[280px]"> {/* Min width ensures scroll on tiny screens if needed */}
                                        {/* Rank Batch */}
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center font-black text-lg border ${rankColor}`}>
                                            #{actualRank}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-base leading-tight">
                                                {item.product_name}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-xs font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <ShoppingBag size={10} />
                                                    {item.quantity_sold} un.
                                                </span>
                                                <span className="text-sm font-bold text-green-400">
                                                    R$ {item.total_revenue.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {isTop3 && (
                                            <div className="hidden md:block absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                                <Award size={40} className="text-[#FFCC00]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
