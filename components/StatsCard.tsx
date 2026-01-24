import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'brand' | 'blue' | 'green' | 'orange';
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, trend, color = 'brand' }) => {
    return (
        <div className="bg-[#1C1C1E] p-6 rounded-2xl border border-white/5 hover:bg-[#2C2C2E] transition-all duration-300 h-full flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-[#2C2C2E] group-hover:bg-[#3C3C3E] transition-colors">
                    <Icon size={24} className="text-[#FFCC00]" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend.isPositive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                        {trend.isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {trend.value}%
                    </div>
                )}
            </div>

            <div className="mt-auto">
                <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</h3>
                <p className="text-sm text-gray-400 font-medium">{label}</p>
            </div>
        </div>
    );
};
