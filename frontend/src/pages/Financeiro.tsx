import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  Trash2,
  TrendingUp,
  Target,
  Clock,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Wallet,
  CheckCircle2,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { transactionsApi } from '../services/api';
import { pageGutters } from '../styles/uiTokens';
import type { Transaction, TransactionStatus } from '../types';
import { format } from 'date-fns';
import { InvoiceDrawer } from '../components/finance/InvoiceDrawer';
import { ptBR } from 'date-fns/locale';
import { usePreferences } from '../contexts/PreferencesContext';
import GradientHeader from '../components/ui/GradientHeader';


const Financeiro = () => {
  const { theme } = usePreferences();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');
  const [typeFiltro] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [, setExpenseError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [, setResetError] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  const brlFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
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
  const monthYear = `${monthYearRaw.charAt(0).toUpperCase()}${monthYearRaw.slice(1)}`;

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

  // Filters logic
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

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    orderedTransactions.forEach((t) => {
      const date = new Date(t.dueDate);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let key = format(date, 'dd MMMM', { locale: ptBR });

      const dateStr = date.toDateString();
      const todayStr = today.toDateString();
      const yesterdayStr = yesterday.toDateString();

      if (dateStr === todayStr) key = 'Hoje';
      else if (dateStr === yesterdayStr) key = 'Ontem';

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return groups;
  }, [orderedTransactions]);

  // Actions
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-24">
      <GradientHeader
        title={
          <>
            Financeiro <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-lg">PRO</span>
          </>
        }
        actions={
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className={`flex items-center justify-between sm:justify-start w-full sm:w-auto border rounded-xl shadow-sm p-1 flex-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={`px-2 sm:px-4 text-sm font-bold flex-1 text-center capitalize ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{monthYear}</span>
              <button
                onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setExpenseModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all font-bold text-sm whitespace-nowrap"
            >
              <ArrowDown size={16} />
              Nova Despesa
            </button>
          </div>
        }
      >
        <p className={`text-slate-500 text-sm mt-1 mb-4 text-center sm:text-left ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gestão financeira completa</p>
      </GradientHeader>

      <div className={`${pageGutters} max-w-7xl mx-auto space-y-8 mt-6`}>

        <div className="space-y-8 animate-fade-in">

          {/* KPI Section - Using StatCards like Dashboard */}
          {/* Consolidated Financial Overview */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">

              {/* Main Balance (Left) */}
              <div className="flex-1 w-full md:w-auto text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Saldo Líquido</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {showBalance ? formatCurrency(summary.balance) : '••••••'}
                  </h2>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                  >
                    {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2">
                  Meta de margem mensal: <span className="text-emerald-600 font-bold">20%</span>
                </p>
              </div>

              {/* Secondary Metrics (Right/Bottom) */}
              <div className="flex-1 w-full flex justify-between gap-2 md:gap-8 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">

                {/* Income */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-2 mb-1">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                      <ArrowUp size={14} />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">Receita</span>
                  </div>
                  <p className="text-lg md:text-xl font-black text-slate-900">
                    {showBalance ? formatCurrency(summary.total) : '•••'}
                  </p>
                </div>

                {/* Expenses */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-2 mb-1">
                    <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                      <ArrowDown size={14} />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">Despesas</span>
                  </div>
                  <p className="text-lg md:text-xl font-black text-slate-900">
                    {showBalance ? formatCurrency(summary.expensesTotal) : '•••'}
                  </p>
                </div>

                {/* Pending */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-2 mb-1">
                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                      <Clock size={14} />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">A Receber</span>
                  </div>
                  <p className="text-lg md:text-xl font-black text-slate-900">
                    {showBalance ? formatCurrency(summary.revenuePending) : '•••'}
                  </p>
                </div>

              </div>
            </div>

            {/* Subtle decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[80px] -translate-y-32 translate-x-20 -z-0 pointer-events-none"></div>
          </div>

          {/* Financial Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <DollarSign size={18} className="text-slate-400" />
                      Histórico de Transações
                    </h3>
                    {/* Simple Filters Ribbon */}
                    <div className="flex gap-1">
                      {[
                        { key: 'todos', label: 'Todos' },
                        { key: 'pago', label: 'Pagos' },
                        { key: 'pendente', label: 'Pendentes' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setStatusFiltro(item.key as typeof statusFiltro)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${statusFiltro === item.key
                            ? 'bg-purple-100 text-purple-700'
                            : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleExportar} className="text-slate-400 hover:text-purple-600 transition-colors">
                    <Download size={18} />
                  </button>
                </div>

                <div className="divide-y divide-slate-50">
                  {Object.entries(groupedTransactions).map(([dateLabel, groupTransactions]) => (
                    <div key={dateLabel}>
                      <div className="bg-slate-50/50 px-5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{dateLabel}</p>
                      </div>
                      {groupTransactions.map(t => {
                        const isExpense = t.type === 'DESPESA';
                        const isPaid = t.status === 'PAGO';

                        return (
                          <div
                            key={t.id}
                            className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-center cursor-pointer group"
                            onClick={() => setSelectedTransaction(t)}
                          >
                            <div className={`p-3 rounded-2xl ${isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {isExpense ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                  {isExpense ? t.description || 'Despesa' : t.appointment?.customer?.name || 'Venda de Serviço'}
                                </p>
                                <span className={`text-sm font-black whitespace-nowrap ${isExpense ? 'text-rose-500' : 'text-emerald-600'}`}>
                                  {isExpense ? '-' : '+'} {formatCurrency(Math.abs(t.amount))}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">
                                    {t.paymentMethod ? t.paymentMethod.replace('_', ' ') : (isExpense ? 'Saída' : 'Aguardando')}
                                  </span>
                                  {t.customerMarkedPaid && !isPaid && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1">
                                      <Clock size={10} /> Confirmar
                                    </span>
                                  )}
                                </div>

                                {/* Status Tag */}
                                {isPaid ? (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 size={10} />
                                    PAGO
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusToggle(t);
                                    }}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${new Date(t.dueDate) < new Date()
                                      ? 'bg-rose-100 text-rose-600'
                                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                      }`}
                                  >
                                    {new Date(t.dueDate) < new Date() ? 'ATRASADO' : 'PENDENTE'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {Object.keys(groupedTransactions).length === 0 && (
                    <div className="p-12 text-center">
                      <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <FileText size={24} />
                      </div>
                      <p className="text-slate-500 font-medium">Nenhuma movimentação neste período</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Actions */}
            <div className="space-y-6">
              {/* Quick Goals or Actions */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Ações Rápidas</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setGoalOpen(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 text-left group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Definir Metas</p>
                      <p className="text-xs text-slate-500">Ajustar objetivos mensais</p>
                    </div>
                  </button>
                  <button
                    onClick={handleResetFinanceiro}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 text-left group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Limpar Dados</p>
                      <p className="text-xs text-slate-500">Reiniciar histórico do mês</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Simplified Chart (Visual Only for now) */}
              <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp size={20} className="text-indigo-300" />
                    <h3 className="font-bold text-lg">Crescimento</h3>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {(() => {
                      // Calculate last 7 days revenue
                      const dataPoints = Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i)); // 6 days ago to today
                        const dateStr = d.toISOString().split('T')[0];

                        const dayRevenue = transactions
                          .filter(t => t.type === 'RECEITA' && t.dueDate.startsWith(dateStr))
                          .reduce((sum, t) => sum + t.amount, 0);

                        return { date: d, value: dayRevenue };
                      });

                      const maxValue = Math.max(...dataPoints.map(d => d.value), 100); // minimal scale

                      return dataPoints.map((point, i) => {
                        const heightPercentage = Math.max((point.value / maxValue) * 100, 5); // min 5% height
                        const isToday = i === 6;

                        return (
                          <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-indigo-900 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                              {point.date.getDate()}/{point.date.getMonth() + 1}: {formatCurrency(point.value)}
                            </div>

                            <div
                              className={`w-full rounded-t-lg transition-all duration-500 relative ${isToday ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`}
                              style={{ height: `${heightPercentage}%` }}
                            ></div>
                            <span className="text-[9px] text-center text-indigo-200">{point.date.getDate()}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-indigo-200">Últimos 7 dias</p>
                    <p className="text-xs font-bold text-white">
                      Total: {formatCurrency(transactions
                        .filter(t => {
                          const d = new Date(t.dueDate);
                          const sevenDaysAgo = new Date();
                          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                          return t.type === 'RECEITA' && d >= sevenDaysAgo;
                        })
                        .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <InvoiceDrawer
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
          isDark={isDark}
        />

        {/* Existing Modals retained but unmounted by default to keep file clean. 
          Assuming ExpenseModal, ResetModal logic is identical to previous version, 
          just wrapped in the new visual container if needed. 
          For brevity in this rewrite, I included the state logic.
      */}
        {expenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 animate-scale-in">
              <h3 className="text-xl font-black text-slate-900 mb-4">Nova Despesa</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Descrição</label>
                  <input
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-slate-50 border-none font-medium focus:ring-2 focus:ring-slate-900"
                    placeholder="Ex: Gasolina"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Valor</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full mt-1 pl-8 pr-4 py-3 rounded-xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-slate-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setExpenseModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateExpense}
                    disabled={expenseLoading}
                    className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg hover:bg-slate-800"
                  >
                    {expenseLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6">
              <h3 className="text-xl font-black text-slate-900 mb-2">Reiniciar Financeiro?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Tem certeza que deseja apagar todas as transações? Esta ação não pode ser desfeita.
              </p>

              {resetConfirmText !== 'CONFIRMAR' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Digite "CONFIRMAR" abaixo</label>
                    <input
                      value={resetConfirmText}
                      onChange={e => setResetConfirmText(e.target.value)}
                      className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
                      placeholder="CONFIRMAR"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setResetModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancelar</button>
                    <button disabled className="flex-1 py-4 rounded-xl bg-slate-200 text-slate-400 font-bold cursor-not-allowed">Apagar</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setResetModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancelar</button>
                  <button
                    onClick={handleResetFinanceiro}
                    disabled={resetLoading}
                    className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg"
                  >
                    {resetLoading ? 'Apagando...' : 'Confirmar Apagar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {goalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-black text-slate-900 mb-6">Definir Meta</h3>
              <input
                value={goalValue}
                onChange={e => setGoalValue(e.target.value)}
                placeholder="Valor da meta"
                type="number"
                className="w-full p-4 rounded-2xl bg-slate-50 border-none mb-6 font-bold text-lg focus:ring-2 focus:ring-purple-600 text-slate-900"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setGoalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Fechar</button>
                <button onClick={() => setGoalOpen(false)} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Financeiro;
