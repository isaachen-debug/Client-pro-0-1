import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  Filter,
  Trash2,
  Wallet,
  TrendingUp,
  Target,
  Clock
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { transactionsApi } from '../services/api';
import { pageGutters } from '../styles/uiTokens';
import type { Transaction, TransactionStatus } from '../types';
import { format } from 'date-fns';
import { InvoiceDrawer } from '../components/finance/InvoiceDrawer';
import { ptBR } from 'date-fns/locale';
import { usePreferences } from '../contexts/PreferencesContext';

const Financeiro = () => {
  const { theme } = usePreferences();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');
  const [typeFiltro, setTypeFiltro] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [, setExpenseError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [, setResetError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const brlFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );
  const formatCurrency = (value: number) => brlFormatter.format(value);

  const resolvePeriod = () => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    return { start, end };
  };

  const period = resolvePeriod();
  const monthYearRaw = period.start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthYear = `${monthYearRaw.charAt(0).toUpperCase()}${monthYearRaw.slice(1)}`.replace(' de ', ' ');

  const fetchFinanceiroData = async () => {
    try {
      setLoading(true);
      const startDate = period.start.toISOString().split('T')[0];
      const endDate = period.end.toISOString().split('T')[0];
      const data = await transactionsApi.listByPeriod(startDate, endDate);
      setTransactions(data);
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceiroData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor]);

  const summary = useMemo(() => {
    const receipts = transactions.filter((t) => t.type === 'RECEITA');
    const expenses = transactions.filter((t) => t.type === 'DESPESA');
    const paid = receipts.filter((t) => t.status === 'PAGO');
    const pending = receipts.filter((t) => t.status === 'PENDENTE');

    const revenuePaid = paid.reduce((sum, t) => sum + t.amount, 0);
    const revenuePending = pending.reduce((sum, t) => sum + t.amount, 0);
    const total = revenuePaid + revenuePending;
    const expensesTotal = expenses.reduce((sum, t) => sum + t.amount, 0);
    const balance = total - expensesTotal;

    return {
      revenuePaid,
      revenuePending,
      total,
      expensesTotal,
      balance,
      paidCount: paid.length,
      pendingCount: pending.length,
    };
  }, [transactions]);

  const typeFilteredTransactions = useMemo(() => {
    if (typeFiltro === 'RECEITA') return transactions.filter((t) => t.type === 'RECEITA');
    if (typeFiltro === 'DESPESA') return transactions.filter((t) => t.type === 'DESPESA');
    return transactions;
  }, [transactions, typeFiltro]);

  const pendingTransactions = useMemo(
    () => typeFilteredTransactions.filter((t) => t.status === 'PENDENTE'),
    [typeFilteredTransactions],
  );
  const paidTransactions = useMemo(
    () => typeFilteredTransactions.filter((t) => t.status === 'PAGO'),
    [typeFilteredTransactions],
  );
  const overdueTransactions = useMemo(
    () =>
      pendingTransactions.filter((t) => {
        const due = new Date(t.dueDate);
        return due < new Date();
      }),
    [pendingTransactions],
  );
  const filteredTransactions = useMemo(() => {
    switch (statusFiltro) {
      case 'pago':
        return paidTransactions;
      case 'pendente':
        return pendingTransactions;
      case 'atrasado':
        return overdueTransactions;
      case 'todos':
      default:
        return typeFilteredTransactions;
    }
  }, [statusFiltro, paidTransactions, pendingTransactions, overdueTransactions, typeFilteredTransactions]);
  const orderedTransactions = useMemo(
    () =>
      [...filteredTransactions].sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
      ),
    [filteredTransactions],
  );

  const fallbackChartData = [
    { date: '05', balance: 1200 },
    { date: '10', balance: 1800 },
    { date: '15', balance: 2600 },
    { date: '20', balance: 2200 },
    { date: '25', balance: 3200 },
    { date: '30', balance: 3000 },
  ];

  const chartData = useMemo(() => {
    const source = transactions.length ? transactions : [];
    if (!source.length) {
      return fallbackChartData.map((item, idx) => ({
        ...item,
        expenses: Math.max(0, item.balance * 0.4 - idx * 50),
      }));
    }

    let balance = 0;
    let expenses = 0;
    return [...source]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map((t) => {
        if (t.type === 'DESPESA') {
          expenses += t.amount;
          balance -= t.amount;
        } else {
          balance += t.amount;
        }
        return {
          date: format(new Date(t.dueDate), 'dd/MM'),
          balance: Number(balance.toFixed(2)),
          expenses: Number(expenses.toFixed(2)),
        };
      });
  }, [transactions]);

  const handleExportar = async () => {
    try {
      const blob = await transactionsApi.exportCsv(
        period.start.toISOString().split('T')[0],
        period.end.toISOString().split('T')[0],
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };

  const handleStatusToggle = async (transaction: Transaction) => {
    try {
      const nextStatus = transaction.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
      const updated = await transactionsApi.updateStatus(transaction.id, nextStatus);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (error) {
      console.error('Erro ao atualizar status da transação:', error);
    }
  };

  const handleResetFinanceiro = async () => {
    try {
      setResetLoading(true);
      setResetError(null);
      await transactionsApi.resetAll();
      setResetConfirmText('');
      setResetModalOpen(false);
      await fetchFinanceiroData();
    } catch (error) {
      console.error('Erro ao resetar financeiro:', error);
      setResetError('Não foi possível limpar os dados. Verifique o backend ou tente novamente.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    const parsedAmount = Number(expenseAmount.replace(',', '.'));
    if (!expenseDescription.trim()) {
      setExpenseError('Informe o que é a despesa.');
      return;
    }
    if (!expenseAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setExpenseError('Informe um valor válido.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    try {
      setExpenseLoading(true);
      setExpenseError(null);
      const payload = {
        type: 'DESPESA',
        status: 'PAGO' as TransactionStatus,
        amount: parsedAmount,
        dueDate: today,
        paidAt: today,
        description: expenseDescription.trim(),
      };
      const created = await transactionsApi.create(payload);
      setTransactions((prev) => [created, ...prev]);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      setExpenseError('Não foi possível salvar a despesa.');
    } finally {
      setExpenseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50/70'}`}>
        <div className={`${pageGutters} max-w-3xl mx-auto space-y-8 pb-20`}>
          {/* Header & Date Navigation */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Financeiro</h1>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className={`p-1 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className={`text-sm font-bold capitalize min-w-[100px] text-center ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{monthYear}</span>
                <button
                  onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className={`p-1 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setGoalOpen(true)}
                className={`h-10 w-10 rounded-2xl border shadow-sm flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
              >
                <Target size={20} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-10 w-10 rounded-2xl border flex items-center justify-center shadow-sm transition-all ${showFilters
                  ? isDark ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-900 border-slate-900 text-white'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Filter size={20} />
              </button>
            </div>
          </div>

          {/* Main Balance Card */}
          <div className={`relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl ${isDark ? 'bg-slate-900 shadow-slate-900/50 border border-slate-800' : 'bg-slate-900 shadow-slate-900/20'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] translate-x-20 -translate-y-20" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] -translate-x-10 translate-y-10" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Saldo Atual</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight">
                      {showBalance ? formatCurrency(summary.balance) : '••••••'}
                    </span>
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-emerald-400">
                  <Wallet size={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <ArrowUpRight size={16} />
                    <span className="text-xs font-bold uppercase">Entradas</span>
                  </div>
                  <p className="text-lg font-bold">{showBalance ? formatCurrency(summary.total) : '•••'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase">Pendentes</span>
                  </div>
                  <p className="text-lg font-bold">{showBalance ? formatCurrency(summary.revenuePending) : '•••'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Filters */}
          <div className="space-y-4">
            {showFilters && (
              <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in-down">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'pago', label: 'Pago' },
                  { key: 'pendente', label: 'Pendente' },
                  { key: 'atrasado', label: 'Atrasado' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setStatusFiltro(item.key as typeof statusFiltro)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${statusFiltro === item.key
                      ? isDark ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-900 border-slate-900 text-white shadow-md'
                      : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setTypeFiltro('DESPESA');
                  setExpenseModalOpen(true);
                }}
                className={`flex-1 border rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:border-rose-200 group transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200'}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                  <ArrowDownRight size={18} />
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Nova Despesa</span>
              </button>
              <button
                onClick={handleExportar}
                className={`px-4 border rounded-2xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          {/* Chart Section */}
          <div className={`p-6 rounded-3xl border shadow-sm space-y-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Fluxo de Caixa</h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Evolução do mês atual</p>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#94a3b8', fontWeight: 600 }}
                    dy={10}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: isDark ? '1px solid #334155' : 'none',
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      color: isDark ? '#fff' : '#000',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 3.5, fill: '#f43f5e' }}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pending Clients Section */}
          {pendingTransactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Aguardando Pagamento</h3>
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pendingTransactions.length} clientes</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {pendingTransactions.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTransaction(t)}
                    className={`shrink-0 w-48 p-4 rounded-2xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:shadow-lg hover:border-slate-300'}`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cliente</p>
                    <p className={`font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{t.appointment?.customer?.name || 'Venda'}</p>
                    <p className={`text-lg font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(t.amount)}</p>
                    <button
                      onClick={() => handleStatusToggle(t)}
                      className={`w-full mt-3 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      Marcar como Pago
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Histórico</h3>
              <button
                onClick={() => setResetModalOpen(true)}
                className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 size={14} /> Limpar
              </button>
            </div>

            {orderedTransactions.length === 0 ? (
              <div className={`text-center py-12 rounded-3xl border border-dashed ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-300'}`}>
                  <DollarSign size={24} />
                </div>
                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Nenhuma transação</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Comece registrando seus ganhos e gastos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderedTransactions.slice(0, 50).map((t) => {
                  const isExpense = t.type === 'DESPESA';
                  const isPaid = t.status === 'PAGO';

                  return (
                    <div
                      key={t.id}
                      className={`group p-4 rounded-2xl border shadow-sm transition-all flex items-center justify-between gap-4 ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${isExpense ? (isDark ? 'bg-rose-900/20 text-rose-400' : 'bg-rose-50 text-rose-500') : (isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          }`}>
                          {isExpense ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isExpense ? t.description || 'Despesa' : t.appointment?.customer?.name || 'Receita'}
                          </p>
                          <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {format(new Date(t.dueDate), 'dd MMM yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-bold text-sm ${isExpense ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
                          {isExpense ? '-' : '+'} {formatCurrency(t.amount)}
                        </p>
                        <button
                          onClick={() => handleStatusToggle(t)}
                          className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full transition-colors ${isPaid
                            ? (isDark ? 'bg-slate-800 text-slate-400 group-hover:bg-slate-700' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200')
                            : (isDark ? 'bg-amber-900/20 text-amber-400 group-hover:bg-amber-900/30' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100')
                            }`}
                        >
                          {isPaid ? 'Pago' : 'Pendente'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais (Expense, Reset, Goal) mantidos com estrutura similar mas classes CSS atualizadas dentro deles se necessário */}
      {/* ... (ExpenseModal, ResetModal e GoalModal podem ser simplificados ou reutilizados do código anterior, apenas garantindo consistência visual) ... */}

      {/* Expense Modal (Simplificado para o exemplo) */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-scale-in ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`text-xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Nova Despesa</h3>
            <div className="space-y-4">
              <div>
                <label className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Descrição</label>
                <input
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className={`w-full mt-1 px-4 py-3 rounded-xl border-none font-medium focus:ring-2 focus:ring-slate-900 ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50'}`}
                  placeholder="Ex: Gasolina"
                />
              </div>
              <div>
                <label className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Valor</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>$</span>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className={`w-full mt-1 pl-8 pr-4 py-3 rounded-xl border-none font-medium focus:ring-2 focus:ring-slate-900 ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50'}`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setExpenseModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl border font-bold ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateExpense}
                  disabled={expenseLoading}
                  className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/20"
                >
                  {expenseLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outros modais seguem o mesmo padrão visual... */}
      {goalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Meta Mensal</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Defina um objetivo de saldo para este mês.</p>
            <input
              type="number"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-none font-bold text-lg mb-6 focus:ring-2 focus:ring-slate-900 ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900'}`}
              placeholder="R$ 0,00"
            />
            <div className="flex gap-3">
              <button onClick={() => setGoalOpen(false)} className={`flex-1 py-3 font-bold rounded-xl ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}>Cancelar</button>
              <button onClick={() => setGoalOpen(false)} className={`flex-1 py-3 font-bold rounded-xl shadow-lg ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-black/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}>Definir Meta</button>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-500'}`}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Resetar Tudo?</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Isso apagará permanentemente todas as transações. Digite <strong>APAGAR</strong> para confirmar.</p>
            <input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border font-bold mb-6 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${isDark ? 'bg-red-900/10 border-red-900/30 text-red-200' : 'bg-red-50/50 border-red-100 text-red-900'}`}
              placeholder="APAGAR"
            />
            <div className="flex gap-3">
              <button onClick={() => setResetModalOpen(false)} className={`flex-1 py-3 font-bold rounded-xl ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}>Cancelar</button>
              <button
                onClick={handleResetFinanceiro}
                disabled={resetConfirmText !== 'APAGAR' || resetLoading}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-red-900/20 disabled:opacity-50"
              >
                {resetLoading ? 'Apagando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Drawer */}
      <InvoiceDrawer
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        isDark={isDark}
      />
    </>
  );
};

export default Financeiro;
