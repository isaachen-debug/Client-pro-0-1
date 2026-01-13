import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  comparison?: {
    value: string | number;
    percent: number; // positivo para crescimento, negativo para queda
    label: string; // ex: "vs mês passado"
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'purple' | 'emerald' | 'blue' | 'amber';
}

export const StatCard = ({ title, value, comparison, icon, color = 'purple' }: StatCardProps) => {
  const isPositive = comparison && comparison.percent > 0;
  const isNegative = comparison && comparison.percent < 0;
  
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  const barColor = {
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</h3>
        {icon && <div className={`p-2 rounded-xl ${colorClasses[color]}`}>{icon}</div>}
      </div>
      
      <div className="space-y-1 z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900">{value}</span>
          {comparison && (
            <div className={`flex items-center text-xs font-bold ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-500' : 'text-slate-400'}`}>
              {isPositive ? <ArrowUp size={12} /> : isNegative ? <ArrowDown size={12} /> : <Minus size={12} />}
              <span>{Math.abs(comparison.percent)}%</span>
            </div>
          )}
        </div>
        
        {comparison && (
          <p className="text-xs text-slate-400 font-medium">
            vs {comparison.value} {comparison.label}
          </p>
        )}
      </div>

      {/* Mini Progress Bar Visual */}
      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${barColor[color]} opacity-80`} 
          style={{ width: `${Math.min(Math.abs(comparison?.percent || 50), 100)}%` }} 
        />
      </div>
    </div>
  );
};
