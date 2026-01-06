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
  Calendar,
  Trash2,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { transactionsApi } from '../services/api';
import { pageGutters } from '../styles/uiTokens';
import type { Transaction, TransactionStatus } from '../types';
import { format } from 'date-fns';

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');
  const [typeFiltro, setTypeFiltro] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState<string>('');

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
      <div className="bg-slate-50/70">
        <div className={`${pageGutters} max-w-3xl mx-auto space-y-6 pb-10`}>
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white text-slate-700 shadow-sm flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <button
                type="button"
                onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="h-9 w-9 rounded-full bg-white text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-50"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-900">{monthYear}</span>
              <button
                type="button"
                onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="h-9 w-9 rounded-full bg-white text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-50"
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGoalOpen(true)}
                className="h-10 px-3 rounded-full bg-white text-slate-700 shadow-sm border border-slate-100 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2"
              >
                Meta
                {goalValue && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">
                    R$ {goalValue || '0'}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="h-10 w-10 rounded-full bg-white text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-50"
                aria-label="Filtros"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-[#111827] text-white p-6 space-y-5 shadow-[0_28px_80px_-40px_rgba(17,24,39,0.9)] ring-1 ring-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/30 rounded-full mix-blend-overlay blur-[68px] translate-x-10 -translate-y-16" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-sky-500/25 rounded-full mix-blend-overlay blur-[60px] -translate-x-8 translate-y-10" />
            <div className="relative flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Saldo total</p>
                <p className="text-4xl font-bold tracking-tight">
                  {showBalance ? formatCurrency(summary.balance) : '•••••'}
                </p>
                <p className="text-sm text-white/60">
                  Receitas {formatCurrency(summary.total)} • Despesas {formatCurrency(summary.expensesTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBalance((prev) => !prev)}
                className="h-10 w-10 rounded-full bg-white/10 backdrop-blur text-white flex items-center justify-center hover:bg-white/15 transition"
                aria-label="Alternar visibilidade do saldo"
              >
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
          <button
                type="button"
                onClick={() => setTypeFiltro('RECEITA')}
                className={`flex items-center justify-between rounded-2xl px-4 py-4 shadow-sm transition ${
                  typeFiltro === 'RECEITA'
                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200'
                    : 'bg-white/10 text-emerald-200 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center">
                    <ArrowUpRight size={18} />
                  </span>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-wide">Nova Receita</p>
                    <p className="text-sm font-semibold">{formatCurrency(summary.total)}</p>
                  </div>
                </div>
          </button>
          <button
                type="button"
                onClick={() => {
                  setTypeFiltro('DESPESA');
                  setExpenseModalOpen(true);
                }}
                className={`flex items-center justify-between rounded-2xl px-4 py-4 shadow-sm transition ${
                  typeFiltro === 'DESPESA'
                    ? 'bg-rose-100 text-rose-800 ring-2 ring-rose-200'
                    : 'bg-white/10 text-rose-200 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center">
                    <ArrowDownRight size={18} />
                  </span>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-wide">Nova Despesa</p>
                    <p className="text-sm font-semibold">{formatCurrency(summary.expensesTotal)}</p>
                  </div>
                </div>
          </button>
        </div>
      </div>

          {showFilters && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'pago', label: 'Pago' },
          { key: 'pendente', label: 'Pendente' },
          { key: 'atrasado', label: 'Atrasado' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFiltro(item.key as typeof statusFiltro)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              statusFiltro === item.key
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
          )}

          <div className="rounded-3xl bg-white p-5 shadow-sm border border-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Fluxo de caixa</p>
                <p className="text-xs text-slate-500">Saldo acumulado</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportar}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-slate-800"
                >
                  <Download size={14} />
                  Exportar
                </button>
      <button
                  onClick={() => setResetModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Resetar
                </button>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef2f6" strokeDasharray="6 6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                    fillOpacity={1}
                    fill="url(#balanceGradient)"
                    animationDuration={2000}
                    animationEasing="ease-in-out"
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

      <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Transações</p>
                <p className="text-xs text-slate-500">
                  {orderedTransactions.length ? `${orderedTransactions.length} movimentações` : 'Nenhum registro'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-slate-800"
              >
                <DollarSign size={14} />
                Registrar despesa
              </button>
            </div>

        {orderedTransactions.length === 0 ? (
              <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-sm border border-white">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhum registro</p>
            <p className="text-xs text-slate-500">Adicione receitas e despesas para acompanhar seu financeiro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderedTransactions.slice(0, 8).map((transaction) => {
              const isPaid = transaction.status === 'PAGO';
              const isExpense = transaction.type === 'DESPESA';
                  const iconTone = isExpense
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-700';
                  const Icon = isExpense ? ArrowDownRight : ArrowUpRight;
                  const title = isExpense
                    ? transaction.description || 'Despesa'
                    : transaction.appointment?.customer?.name ?? 'Receita';
                  const subtitle =
                    transaction.description && !isExpense
                      ? transaction.description
                      : format(new Date(transaction.dueDate), 'dd/MM/yyyy');

              return (
                <div
                  key={transaction.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm border border-white"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-11 w-11 rounded-full flex items-center justify-center ${iconTone}`}>
                          <Icon size={18} />
                    </span>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900">{title}</p>
                          <p className="text-xs text-slate-500">
                            {isExpense ? 'Despesa' : 'Receita'} • {subtitle}
                          </p>
                        </div>
                  </div>
                      <div className="text-right space-y-1">
                        <p className={`text-sm font-bold ${isExpense ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {isExpense ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <button
                      onClick={() => handleStatusToggle(transaction)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                        >
                          {isPaid ? 'Pago' : 'Marcar pago'}
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

      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">Adicionar despesa</p>
              <p className="text-xs text-slate-600">Descrição e valor.</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Descrição</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Ex: Carro, Helper"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Valor</label>
                <input
                  type="text"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0,00"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              {expenseError && <p className="text-sm text-rose-600">{expenseError}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpenseModalOpen(false);
                  setExpenseError(null);
                }}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={expenseLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateExpense}
                className="px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-rose-700"
                disabled={expenseLoading}
              >
                {expenseLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-lg font-semibold text-slate-900">Resetar dados financeiros</p>
                <p className="text-sm text-slate-600">
                  Esta ação apaga todas as transações deste workspace. Não pode ser desfeita. Digite <strong>APAGAR</strong> para confirmar.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Digite APAGAR para confirmar"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                disabled={resetLoading}
              />
              {resetError && <p className="text-sm text-red-600">{resetError}</p>}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmText('');
                  setResetError(null);
                }}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={resetLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetFinanceiro}
                disabled={resetConfirmText !== 'APAGAR' || resetLoading}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-700"
              >
                {resetLoading ? 'Apagando...' : 'Apagar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {goalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">Meta mensal</p>
              <p className="text-xs text-slate-600">Defina a meta de saldo para acompanhar no mês.</p>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  placeholder="Ex: 5000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGoalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => setGoalOpen(false)}
                className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold shadow-sm hover:bg-slate-800"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Financeiro;
