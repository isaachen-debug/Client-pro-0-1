import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';

export const FinancialChart = ({ data }: { data: any[] }) => {
  const [view, setView] = useState<'revenue' | 'balance'>('revenue');

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 h-[320px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-slate-800">Fluxo Financeiro</h3>
          <p className="text-xs text-slate-400">Últimos 30 dias</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('revenue')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'revenue' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
          >
            Receita
          </button>
          <button 
            onClick={() => setView('balance')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'balance' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
          >
            Saldo
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'revenue' ? (
            <BarChart data={data} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#94a3b8'}} 
                dy={10}
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
              />
              <Bar dataKey="income" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="expense" fill="#cbd5e1" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: '#94a3b8'}} 
                dy={10}
              />
              <Tooltip 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
