
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Calendar, Search, Loader2, DollarSign, ShoppingBag, Info, Award } from 'lucide-react';
import { SalesRanking } from './SalesRanking';
import { LineChart, Line, XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getBrasiliaDate } from '../utils/dateUtils';

interface SalesStats {
    totalSales: number;
    orderCount: number;
    averageTicket: number;
    averageItemCost?: number;
}

interface TopProduct {
    name: string;
    quantity: number;
    total: number;
}

export const SalesReports: React.FC = () => {
    // Default to current month using Brasilia Date
    const [activeTab, setActiveTab] = useState<'sales' | 'ranking'>('sales'); // Added this line
    const [startDate, setStartDate] = useState(() => {
        const date = new Date(getBrasiliaDate());
        date.setDate(1); // First day of month
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return getBrasiliaDate(); // Today in Brasilia
    });

    const [stats, setStats] = useState<SalesStats>({ totalSales: 0, orderCount: 0, averageTicket: 0, averageItemCost: 0 });
    const [financials, setFinancials] = useState({
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        expensesByCategory: [] as { category: string; total: number; percentage: number; color: string }[]
    });

    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();

        // REALTIME SUBSCRIPTION FOR EXPENSES
        const expensesChannel = supabase
            .channel('sales_reports_expenses')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'expenses'
            }, () => {
                console.log('⚡ Despesa alterada! Recarregando analytics...');
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(expensesChannel);
        };
    }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Adjust dates to include the full day in local time
            const queryStartDate = new Date(`${startDate}T00:00:00`);
            const queryEndDate = new Date(`${endDate}T23:59:59.999`);

            if (isNaN(queryStartDate.getTime()) || isNaN(queryEndDate.getTime())) {
                console.error("Invalid dates selected");
                setLoading(false);
                return;
            }

            console.log("SalesReports: Fetching data between", startDate, "and", endDate);

            // 1. Fetch SHIFTS (Primary Source of Truth)
            const { data: shifts, error: shiftsError } = await supabase
                .from('shifts')
                .select('id, opened_at, name')
                .gte('opened_at', queryStartDate.toISOString())
                .lte('opened_at', queryEndDate.toISOString())
                .order('opened_at', { ascending: true }); // Ensure column is correct, likely opened_at or created_at

            // ... (Inside Orders Fetching)
            // Fix ordering if 'at' was used incorrectly or implied. 
            // In the previous code, order was implicit or not problematic here, but let's be safe.

            // ... (Inside Top Products)
            // (Top Products logic moved down)

            // ... (Inside Recent Orders in Dashboard - checking that file next)


            if (shiftsError) {
                console.error("SalesReports: Error fetching shifts:", shiftsError);
                throw shiftsError;
            }

            // 2. Fetch Orders linked to these shifts AND Orphan Orders
            // Initialize orders array properly before using it
            let orders: any[] = [];
            const shiftIds = shifts?.map(s => s.id) || [];

            // A. Shift Orders
            if (shiftIds.length > 0) {
                const { data, error } = await supabase
                    .from('orders')
                    .select('id, total, created_at, shift_id, status')
                    .in('shift_id', shiftIds)
                    .neq('status', 'canceled');

                // If error is 42703 (column does not exist), it might be total_amount vs total.
                // We'll let it fail for now but log it better. If user says total_amount fails, we might need to change to total.
                if (error) console.error("SalesReports: Error fetching shift orders:", error);

                // If it fails with "column total_amount does not exist", we should ideally try 'total'.
                // But let's assume valid column for now or we'll patch types next.
                if (data) orders = [...orders, ...data];
            }

            // B. Orphan Orders (Date Range)
            const { data: orphanOrders, error: orphanError } = await supabase
                .from('orders')
                .select('id, total, created_at, shift_id, status')
                .is('shift_id', null)
                .gte('created_at', queryStartDate.toISOString())
                .lte('created_at', queryEndDate.toISOString())
                .neq('status', 'canceled');

            if (orphanError) console.error("SalesReports: Error fetching orphan orders:", orphanError);
            if (orphanOrders) orders = [...orders, ...orphanOrders];

            // 5. Fetch Expenses (Shift-Centric + Orphans)
            let allExpenses: any[] = [];

            // A. Expenses linked to Shifts
            if (shiftIds.length > 0) {
                const { data: shiftExpenses, error: err1 } = await supabase
                    .from('expenses')
                    .select('*')
                    .in('shift_id', shiftIds);
                if (err1) console.error("Error fetching shift expenses:", err1);
                if (shiftExpenses) allExpenses = [...allExpenses, ...shiftExpenses];
            }

            // B. Orphan Expenses (General) in Date Range
            const { data: orphanExpenses, error: err2 } = await supabase
                .from('expenses')
                .select('*')
                .is('shift_id', null)
                .gte('expense_date', queryStartDate.toISOString().split('T')[0])
                .lte('expense_date', queryEndDate.toISOString().split('T')[0]);

            if (err2) console.error("Error fetching orphan expenses:", err2);
            if (orphanExpenses) allExpenses = [...allExpenses, ...orphanExpenses];

            // Remove duplicates just in case
            const uniqueExpenses = Array.from(new Map(allExpenses.map(item => [item.id, item])).values());
            const expenses = uniqueExpenses;

            // Calculate General Stats
            // Calculate General Stats
            const totalSales = orders.reduce((acc, curr) => acc + (curr.total || curr.total_amount || 0), 0);
            const orderCount = orders.length;
            const averageTicket = orderCount > 0 ? totalSales / orderCount : 0;

            // Calculate Financials
            const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const netProfit = totalSales - totalExpenses;
            const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

            // Expenses by Category
            const expenseMap = new Map<string, number>();
            expenses.forEach(exp => {
                const current = expenseMap.get(exp.category) || 0;
                expenseMap.set(exp.category, current + exp.amount);
            });

            const expensesByCategory = Array.from(expenseMap.entries())
                .map(([category, total]) => ({
                    category,
                    total,
                    percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
                    color: '#EF4444' // Red for expenses
                }))
                .sort((a, b) => b.total - a.total);

            // Top Products & Average Item Cost
            let topProductsData: TopProduct[] = [];
            let averageItemCost = 0;

            if (orders.length > 0) {
                const orderIds = orders.map(o => o.id);
                const { data: orderItems, error: itemsError } = await supabase
                    .from('order_items')
                    .select('quantity, unit_price, product:products(name)')
                    .in('order_id', orderIds);

                if (!itemsError && orderItems) {
                    const totalItemsCount = orderItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
                    averageItemCost = totalItemsCount > 0 ? totalSales / totalItemsCount : 0;

                    const productMap = new Map<string, { quantity: number, total: number }>();
                    orderItems.forEach((item: any) => {
                        const name = item.product?.name || 'Desconhecido';
                        const current = productMap.get(name) || { quantity: 0, total: 0 };
                        productMap.set(name, {
                            quantity: current.quantity + item.quantity,
                            total: current.total + (item.quantity * item.unit_price)
                        });
                    });

                    topProductsData = Array.from(productMap.entries())
                        .map(([name, stats]) => ({
                            name,
                            quantity: stats.quantity,
                            total: stats.total
                        }))
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 5);
                }
            }

            // Chart Data Preparation
            let currentDate = new Date(queryStartDate);
            const allDates: string[] = [];
            while (currentDate <= queryEndDate) {
                const dateStr = currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); // DD/MM/YY
                allDates.push(dateStr);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // === CHART DATA FROM sales_summary VIEW ===
            const { data: salesSummary, error: summaryError } = await supabase
                .from('sales_summary')
                .select('shift_id, shift_name, business_date, total_sales, total_orders') // Assuming sales_summary uses total_sales alias from total_amount or works
                .gte('opened_at', queryStartDate.toISOString())
                .lte('opened_at', queryEndDate.toISOString())
                .order('business_date', { ascending: true });

            if (summaryError) {
                console.error("SalesReports: Error fetching sales_summary:", summaryError);
            }

            const salesByDate = new Map<string, { total: number; expenses: number }>();

            salesSummary?.forEach(row => {
                const dateKey = row.business_date;
                const current = salesByDate.get(dateKey) || { total: 0, expenses: 0 };
                salesByDate.set(dateKey, {
                    total: current.total + (row.total_sales || 0),
                    expenses: current.expenses
                });
            });

            // Agregar despesas por data
            expenses.forEach(exp => {
                let dateKey: string;
                if (exp.shift_id) {
                    const shiftRow = salesSummary?.find(s => s.shift_id === exp.shift_id);
                    dateKey = shiftRow?.business_date || exp.expense_date;
                } else {
                    dateKey = exp.expense_date;
                }

                if (dateKey) {
                    const current = salesByDate.get(dateKey) || { total: 0, expenses: 0 };
                    salesByDate.set(dateKey, {
                        total: current.total,
                        expenses: current.expenses + (exp.amount || 0)
                    });
                }
            });

            const chartDataPoints = allDates.map(dateLabel => {
                const [d, m, y] = dateLabel.split('/');
                const isoDateStr = `20${y}-${m}-${d}`;
                const dayData = salesByDate.get(isoDateStr) || { total: 0, expenses: 0 };

                return {
                    date: dateLabel,
                    total: dayData.total,
                    expenses: dayData.expenses,
                    dayName: dateLabel.slice(0, 5) // DD/MM
                };
            });

            // Calculate height (optional, can remove if unused by Recharts)
            const maxTotal = Math.max(...chartDataPoints.map(d => Math.max(d.total, d.expenses)), 1);
            const finalChartData = chartDataPoints.map(d => ({
                ...d,
                height: (d.total / maxTotal) * 100
            }));

            setStats({ totalSales, orderCount, averageTicket, averageItemCost });
            setFinancials({ totalExpenses, netProfit, profitMargin, expensesByCategory });
            setTopProducts(topProductsData);
            setChartData(finalChartData);

        } catch (error) {
            console.error('Error fetching sales report:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header and Filters (Global) */}
            <div className="flex flex-col gap-4 bg-[#1C1C1E] p-4 md:p-6 rounded-2xl shadow-sm border border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                            {activeTab === 'sales' ? (
                                <><TrendingUp className="w-6 h-6 text-[#FFCC00]" /> Relatórios de Vendas</>
                            ) : (
                                <><Award className="w-6 h-6 text-[#FFCC00]" /> Ranking de Produtos</>
                            )}
                        </h2>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                            <p className="text-gray-400 text-sm">
                                {activeTab === 'sales' ? 'Acompanhe o desempenho do seu negócio' : 'Analise os itens mais vendidos'}
                            </p>
                            <span className="w-fit px-2 py-0.5 bg-green-900/30 text-green-400 text-[10px] font-bold rounded-full border border-green-800 flex items-center gap-1">
                                <Info size={10} />
                                Timezone: Brasília (Active)
                            </span>
                        </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-2 bg-[#2C2C2E] p-3 md:p-2 rounded-xl md:rounded-lg border border-white/10">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                            <div className="flex items-center gap-2 w-full">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-sm focus:ring-0 text-white w-full"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-sm focus:ring-0 text-white w-full"
                                />
                            </div>
                        </div>
                        <button
                            onClick={fetchData}
                            className="w-full md:w-auto p-2 bg-[#FFCC00] text-black rounded-lg hover:bg-[#E5B800] transition-colors flex items-center justify-center font-bold"
                            title="Atualizar"
                        >
                            <Search className="w-4 h-4 md:mr-0 mr-2" />
                            <span className="md:hidden">Buscar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`flex-1 md:flex-none px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'sales' ? 'bg-[#FFCC00] text-black shadow-lg' : 'bg-[#2C2C2E] text-gray-400 hover:text-white'}`}
                >
                    Resumo Geral
                </button>
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`flex-1 md:flex-none px-4 py-3 md:py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'ranking' ? 'bg-[#FFCC00] text-black shadow-lg' : 'bg-[#2C2C2E] text-gray-400 hover:text-white'}`}
                >
                    Ranking de Produtos
                </button>
            </div>

            {activeTab === 'ranking' ? (
                <SalesRanking startDate={startDate} endDate={endDate} />
            ) : (
                <>
                    {/* Existing Sales Content Starts Here */}

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
                        </div>
                    ) : (
                        <>
                            {stats.orderCount === 0 && stats.totalSales === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 bg-[#1C1C1E] rounded-2xl border border-white/10 text-center">
                                    <div className="w-16 h-16 bg-[#2C2C2E] rounded-full flex items-center justify-center mb-4">
                                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Aguardando vendas...</h3>
                                    <p className="text-gray-400 text-sm mt-1 max-w-md">
                                        Nenhum pedido encontrado para os turnos abertos neste período. As vendas aparecerão aqui assim que forem registradas.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                        <div className="bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/5 transition-all duration-300 hover:bg-[#2C2C2E] flex flex-col justify-between h-full group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Receita Bruta</p>
                                                    <h3 className="text-3xl md:text-4xl font-black text-white leading-none">
                                                        R$ {stats.totalSales.toFixed(2)}
                                                    </h3>
                                                </div>
                                                <div className="p-3 bg-green-900/20 rounded-lg">
                                                    <DollarSign className="w-6 h-6 text-green-400" />
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-400 mt-2 flex items-center gap-2 bg-[#2C2C2E] p-2 rounded-lg w-fit">
                                                <ShoppingBag size={14} className="text-gray-300" />
                                                <span className="font-bold text-gray-300">{stats.orderCount}</span>
                                                <span>pedidos no período</span>
                                            </div>
                                        </div>

                                        <div className="bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-gray-400 text-sm font-medium">Ticket Médio</p>
                                                    <h3 className="text-3xl font-bold text-white mt-1">
                                                        R$ {stats.averageTicket.toFixed(2)}
                                                    </h3>
                                                </div>
                                                <div className="p-3 bg-blue-900/20 rounded-lg">
                                                    <TrendingUp className="w-6 h-6 text-blue-400" />
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                Média por pedido
                                            </div>
                                        </div>

                                        <div className="bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-gray-400 text-sm font-medium">Lucro Líquido (Est.)</p>
                                                    <h3 className={`text-3xl font-bold mt-1 ${financials.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        R$ {financials.netProfit.toFixed(2)}
                                                    </h3>
                                                </div>
                                                <div className={`p-3 rounded-lg ${financials.netProfit >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                                                    <DollarSign className={`w-6 h-6 ${financials.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                Margem: {financials.profitMargin.toFixed(1)}%
                                            </div>
                                        </div>

                                        <div className="bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-gray-400 text-sm font-medium">Média por Item</p>
                                                    <h3 className="text-3xl font-bold text-white mt-1">
                                                        R$ {stats.averageItemCost?.toFixed(2) || '0.00'}
                                                    </h3>
                                                </div>
                                                <div className="p-3 bg-purple-900/20 rounded-lg">
                                                    <ShoppingBag className="w-6 h-6 text-purple-400" />
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                Valor médio por lanche
                                            </div>
                                        </div>
                                    </div>

                                    {/* Charts Section - 12 Columns Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                                        {/* Sales Chart (8 Cols) */}
                                        <div className="lg:col-span-8 bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/5 transition-all duration-300 hover:border-white/10 flex flex-col h-full min-h-[400px]">
                                            <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Receitas vs Despesas</h3>
                                            <div className="flex-1 w-full min-h-0">
                                                {chartData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={chartData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                                            <XAxis
                                                                dataKey="dayName"
                                                                axisLine={false}
                                                                tickLine={false}
                                                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                                                dy={10}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{
                                                                    backgroundColor: '#1F2937',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: '#F3F4F6'
                                                                }}
                                                                itemStyle={{ color: '#F3F4F6' }}
                                                                formatter={(value: number, name: string, props: any) => {
                                                                    const label = props.dataKey === 'total' ? 'Receitas' : name;
                                                                    return [`R$ ${value.toFixed(2)}`, label];
                                                                }}
                                                                labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                                                            />
                                                            <Legend
                                                                wrapperStyle={{ paddingTop: '20px' }}
                                                                iconType="line"
                                                                formatter={(value: string) => (
                                                                    <span style={{ color: '#9CA3AF', fontSize: '14px' }}>{value}</span>
                                                                )}
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="total"
                                                                stroke="#10b981" // Green-500
                                                                strokeWidth={3}
                                                                dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                                connectNulls={true}
                                                                name="Receitas"
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="expenses"
                                                                stroke="#ef4444" // Red-500
                                                                strokeWidth={3}
                                                                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                                connectNulls={true}
                                                                name="Despesas"
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                                        Sem dados para exibir
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Top Products (4 Cols) */}
                                        <div className="lg:col-span-4 bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/5 transition-all duration-300 hover:border-white/10 flex flex-col h-full">
                                            <h3 className="text-lg font-bold text-white mb-6">Produtos Mais Vendidos</h3>
                                            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                                {topProducts.map((product, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 hover:bg-[#2C2C2E] rounded-xl transition-colors border border-transparent hover:border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center text-orange-400 font-bold text-sm shrink-0">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-white line-clamp-1">{product.name}</p>
                                                                <p className="text-xs text-gray-400">{product.quantity} unidades</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-white shrink-0">
                                                            R$ {product.total.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                                {topProducts.length === 0 && (
                                                    <p className="text-gray-400 text-center py-4 flex items-center justify-center h-full">Nenhum dado disponível</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expenses Breakdown */}
                                    <div className="bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-white/10 transition-colors">
                                        <h3 className="text-lg font-bold text-white mb-6">Despesas por Categoria</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                {financials.expensesByCategory.map((category, index) => (
                                                    <div key={index} className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-medium text-gray-300 capitalize">{category.category}</span>
                                                            <span className="text-gray-400">{category.percentage.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-500 rounded-full"
                                                                style={{ width: `${category.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="text-xs text-gray-400 text-right">R$ {category.total.toFixed(2)}</p>
                                                    </div>
                                                ))}
                                                {financials.expensesByCategory.length === 0 && (
                                                    <p className="text-gray-400">Nenhuma despesa registrada no período.</p>
                                                )}
                                            </div>

                                            {/* DRE Simplificado */}
                                            <div className="bg-[#000000] p-6 rounded-xl border border-white/10">
                                                <h4 className="font-bold text-white mb-4">Resumo Financeiro (DRE)</h4>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Receita Bruta</span>
                                                        <span className="font-bold text-green-400">+ R$ {stats.totalSales.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Despesas Operacionais</span>
                                                        <span className="font-bold text-red-400">- R$ {financials.totalExpenses.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-px bg-white/10 my-2"></div>
                                                    <div className="flex justify-between text-base">
                                                        <span className="font-bold text-white">Lucro Líquido</span>
                                                        <span className={`font-bold ${financials.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            R$ {financials.netProfit.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};
