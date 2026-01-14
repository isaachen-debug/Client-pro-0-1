import { CheckCircle2, Clock, FileText, DollarSign } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'contract' | 'payment' | 'job_completed' | 'job_created' | 'invoice';
  title: string;
  description: string;
  time: string;
  user?: string;
  amount?: string;
}

const ActivityIcon = ({ type }: { type: ActivityItem['type'] }) => {
  switch (type) {
    case 'contract':
      return <div className="p-2 rounded-full bg-purple-100 text-purple-600"><FileText size={16} /></div>;
    case 'payment':
      return <div className="p-2 rounded-full bg-emerald-100 text-emerald-600"><DollarSign size={16} /></div>;
    case 'job_completed':
      return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><CheckCircle2 size={16} /></div>;
    case 'job_created':
      return <div className="p-2 rounded-full bg-amber-100 text-amber-600"><Clock size={16} /></div>;
    default:
      return <div className="p-2 rounded-full bg-slate-100 text-slate-600"><FileText size={16} /></div>;
  }
};

export const ActivityFeed = ({ items }: { items: ActivityItem[] }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock size={18} className="text-slate-400" />
          Atividade Recente
        </h3>
        <button className="text-xs font-bold text-purple-600 hover:text-purple-700">Ver tudo</button>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-start">
            <ActivityIcon type={item.type} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">{item.time}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
              {item.amount && (
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                  {item.amount}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
