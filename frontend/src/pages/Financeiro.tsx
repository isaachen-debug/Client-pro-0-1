import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, DollarSign, Download, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { transactionsApi } from '../services/api';
import { pageGutters } from '../styles/uiTokens';
import type { Transaction, TransactionStatus } from '../types';
import { format } from 'date-fns';

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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

  const pendingTransactions = useMemo(
    () => transactions.filter((t) => t.status === 'PENDENTE'),
    [transactions],
  );
  const paidTransactions = useMemo(
    () => transactions.filter((t) => t.status === 'PAGO'),
    [transactions],
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
        return transactions;
    }
  }, [statusFiltro, paidTransactions, pendingTransactions, overdueTransactions, transactions]);
  const orderedTransactions = useMemo(
    () =>
      [...filteredTransactions].sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
      ),
    [filteredTransactions],
  );

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
    <div className={`${pageGutters} max-w-3xl mx-auto space-y-5 pb-2`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Financeiro</p>
          <h1 className="text-xl font-semibold text-slate-900">Financeiro</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold text-slate-700">{monthYear}</span>
            <button
              type="button"
              onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="h-7 w-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
              aria-label="Próximo mês"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportar}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} />
            Exportar
          </button>
          <button
            onClick={() => setResetModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Resetar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: 'Receitas',
            value: formatCurrency(summary.total),
            tone: 'text-emerald-700 bg-emerald-50',
            icon: TrendingUp,
            iconTone: 'text-emerald-600 bg-emerald-100',
          },
          {
            label: 'Despesas',
            value: formatCurrency(summary.expensesTotal),
            tone: 'text-rose-700 bg-rose-50',
            icon: TrendingDown,
            iconTone: 'text-rose-600 bg-rose-100',
          },
          {
            label: 'Saldo',
            value: formatCurrency(summary.balance),
            tone: 'text-blue-700 bg-blue-50',
            icon: Wallet,
            iconTone: 'text-blue-600 bg-blue-100',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`rounded-[22px] border border-slate-100 px-3 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.06)] ${item.tone}`}
            >
              <div className={`h-9 w-9 rounded-[14px] flex items-center justify-center ${item.iconTone}`}>
                <Icon size={16} />
              </div>
              <p className="mt-2 text-[11px] font-semibold">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
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
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpenseModalOpen(true)}
        className="rounded-2xl border border-rose-300 px-4 py-3 text-left text-white shadow-[0_12px_24px_rgba(244,63,94,0.35)]"
        style={{ background: 'linear-gradient(90deg, #ef4444 0%, #f43f5e 45%, #ec4899 100%)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">Adicionar Despesa</p>
              <p className="text-xs text-white/85">Carro, Helper, e outras despesas</p>
            </div>
          </div>
          <span className="text-2xl leading-none">+</span>
        </div>
      </button>

      <div className="space-y-3">
        {orderedTransactions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
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
              return (
                <div
                  key={transaction.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {isExpense
                        ? transaction.description || 'Despesa'
                        : transaction.appointment?.customer?.name ?? 'Receita'}
                    </p>
                    <p className="text-xs text-slate-500">{format(new Date(transaction.dueDate), 'dd/MM/yyyy')}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isPaid ? 'Pago' : 'Pendente'}
                    </span>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {isExpense ? 'Despesa' : 'Receita'}
                    </span>
                  </div>
                  <div className="text-right space-y-2">
                    <p className={`text-sm font-semibold ${isExpense ? 'text-rose-700' : 'text-slate-900'}`}>
                      {isExpense ? '-' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <button
                      onClick={() => handleStatusToggle(transaction)}
                      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                        isPaid
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isPaid ? 'Marcar pendente' : 'Marcar pago'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    </div>
  );
};

export default Financeiro;
