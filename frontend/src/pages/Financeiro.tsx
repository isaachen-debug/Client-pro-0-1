import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, DollarSign, Clock, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { teamApi, transactionsApi } from '../services/api';
import type { HelperCostSummary, HelperPayoutMode, Transaction, User } from '../types';
import { format } from 'date-fns';

const COST_CATEGORIES = ['Gasolina', 'Pedágio', 'Material', 'Bônus', 'Outros'] as const;

const PERIOD_OPTIONS = [
  { value: 'ultimos7dias', label: 'Últimos 7 dias' },
  { value: 'ultimos30dias', label: 'Últimos 30 dias' },
  { value: 'mesAtual', label: 'Mês atual' },
  { value: 'mesPassado', label: 'Mês passado' },
  { value: 'personalizado', label: 'Personalizado' },
] as const;

const FINANCE_TABS = [
  { key: 'receitas', label: 'Receitas e cobranças' },
  { key: 'custos', label: 'Custos e despesas' },
] as const;

const createExpenseDraft = () => ({
  category: COST_CATEGORIES[0],
  amount: '',
  notes: '',
});

const getDefaultPayoutForm = (helper?: User) => ({
  mode: (helper?.helperPayoutMode as HelperPayoutMode) ?? 'FIXED',
  value:
    helper?.helperPayoutValue !== undefined && helper?.helperPayoutValue !== null
      ? helper.helperPayoutValue.toString()
      : '0',
});

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mesAtual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'receitas' | 'custos'>('receitas');
  const [helpers, setHelpers] = useState<User[]>([]);
  const [helpersLoading, setHelpersLoading] = useState(false);
  const [selectedHelperId, setSelectedHelperId] = useState('');
  const [helperCosts, setHelperCosts] = useState<{
    loading: boolean;
    data: HelperCostSummary | null;
    error: string;
  }>({ loading: false, data: null, error: '' });
  const [payoutForm, setPayoutForm] = useState<{ mode: HelperPayoutMode; value: string }>(getDefaultPayoutForm());
  const [expenseDraft, setExpenseDraft] = useState(createExpenseDraft());
  const [savingPayout, setSavingPayout] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [removingExpenseId, setRemovingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceiroData();
  }, [periodo, dataInicio, dataFim]);

  const loadHelpers = useCallback(async () => {
    try {
      setHelpersLoading(true);
      const data = await teamApi.list();
      const helpersOnly = data.members.filter((member) => member.role === 'HELPER');
      setHelpers(helpersOnly);
    } catch (error) {
      console.error('Erro ao carregar helpers:', error);
    } finally {
      setHelpersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHelpers();
  }, [loadHelpers]);

  useEffect(() => {
    if (helpers.length && !selectedHelperId) {
      const first = helpers[0];
      setSelectedHelperId(first.id);
      setPayoutForm(getDefaultPayoutForm(first));
    }
  }, [helpers, selectedHelperId]);

  const resolvePeriod = () => {
    const now = new Date();
    switch (periodo) {
      case 'ultimos7dias': {
        const end = new Date(now);
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        return { start, end };
      }
      case 'ultimos30dias': {
        const end = new Date(now);
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        return { start, end };
      }
      case 'mesAtual': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end };
      }
      case 'mesPassado': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end };
      }
      case 'personalizado':
        if (dataInicio && dataFim) {
          return { start: new Date(dataInicio), end: new Date(dataFim) };
        }
        return null;
      default: {
        const end = new Date(now);
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        return { start, end };
      }
    }
  };

  const fetchFinanceiroData = async () => {
    try {
      setLoading(true);
      const period = resolvePeriod();
      if (!period) {
        setTransactions([]);
        return;
      }
      const startDate = period.start.toISOString().split('T')[0];
      const endDate = period.end.toISOString().split('T')[0];
      const data = await transactionsApi.listByPeriod(startDate, endDate);
      setTransactions(data);
      setRange({ from: startDate, to: endDate });
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHelperCosts = useCallback(async () => {
    if (!selectedHelperId || !range?.from || !range?.to) {
      return;
    }
    setHelperCosts((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));
    try {
      const data = await teamApi.getHelperCosts(selectedHelperId, {
        from: range.from,
        to: range.to,
      });
      setHelperCosts({
        loading: false,
        data,
        error: '',
      });
      setPayoutForm({
        mode: data.helper.helperPayoutMode,
        value: data.helper.helperPayoutValue.toString(),
      });
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar os custos.';
      setHelperCosts((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, [selectedHelperId, range?.from, range?.to]);

  useEffect(() => {
    if (selectedHelperId && range?.from && range?.to) {
      fetchHelperCosts();
    }
  }, [fetchHelperCosts, selectedHelperId, range?.from, range?.to]);

  const handleExportar = async () => {
    try {
      const period = resolvePeriod();
      if (!period) return;
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

  const summary = useMemo(() => {
    const receipts = transactions.filter((t) => t.type === 'RECEITA');
    const paid = receipts.filter((t) => t.status === 'PAGO');
    const pending = receipts.filter((t) => t.status === 'PENDENTE');

    const revenuePaid = paid.reduce((sum, t) => sum + t.amount, 0);
    const revenuePending = pending.reduce((sum, t) => sum + t.amount, 0);
    const concludedCount = receipts.length;
    const pendingCount = pending.length;
    const ticket = paid.length > 0 ? revenuePaid / paid.length : 0;

    return {
      revenuePaid,
      revenuePending,
      concludedCount,
      pendingCount,
      ticket,
      paidCount: paid.length,
      total: revenuePaid + revenuePending,
    };
  }, [transactions]);

  const helperCostData = helperCosts.data;

  const costSummary = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'DESPESA');
    const paid = expenses.filter((t) => t.status === 'PAGO');
    const pending = expenses.filter((t) => t.status === 'PENDENTE');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const paidExpenses = paid.reduce((sum, t) => sum + t.amount, 0);
    const pendingExpenses = pending.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      count: expenses.length,
    };
  }, [transactions]);

  const period = range
    ? {
        start: new Date(range.from),
        end: new Date(range.to),
      }
    : resolvePeriod();
  const periodLabel = period ? `${format(period.start, "dd MMM")} – ${format(period.end, "dd MMM")}` : 'Período em aberto';
  const periodFullLabel = period
    ? `${format(period.start, 'dd/MM/yyyy')} - ${format(period.end, 'dd/MM/yyyy')}`
    : 'Selecione um intervalo';

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );

  const handleStatusToggle = async (transaction: Transaction) => {
    try {
      const nextStatus = transaction.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
      const updated = await transactionsApi.updateStatus(transaction.id, nextStatus);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (error) {
      console.error('Erro ao atualizar status da transação:', error);
    }
  };

  const handleHelperChange = (helperId: string) => {
    setSelectedHelperId(helperId);
    const helper = helpers.find((item) => item.id === helperId);
    setPayoutForm(getDefaultPayoutForm(helper));
    setExpenseDraft(createExpenseDraft());
  };

  const handlePayoutFormChange = (patch: Partial<{ mode: HelperPayoutMode; value: string }>) => {
    setPayoutForm((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleSavePayoutConfig = async () => {
    if (!selectedHelperId) return;
    const numericValue = Number(payoutForm.value);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      setHelperCosts((prev) => ({
        ...prev,
        error: 'Informe um valor válido maior ou igual a zero.',
      }));
      return;
    }

    setSavingPayout(true);
    try {
      await teamApi.updateHelperPayout(selectedHelperId, payoutForm.mode, numericValue);
      setHelpers((prev) =>
        prev.map((helper) =>
          helper.id === selectedHelperId
            ? { ...helper, helperPayoutMode: payoutForm.mode, helperPayoutValue: numericValue }
            : helper,
        ),
      );
      await fetchHelperCosts();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível salvar a configuração.';
      setHelperCosts((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setSavingPayout(false);
    }
  };

  const handleExpenseDraftChange = (field: 'category' | 'amount' | 'notes', value: string) => {
    setExpenseDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddExpense = async () => {
    if (!selectedHelperId) return;
    const numericValue = Number(expenseDraft.amount);
    if (!expenseDraft.category || Number.isNaN(numericValue) || numericValue <= 0) {
      setHelperCosts((prev) => ({
        ...prev,
        error: 'Informe um valor maior que zero para registrar o custo.',
      }));
      return;
    }

    setSavingExpense(true);
    try {
      await teamApi.addHelperExpense(selectedHelperId, {
        category: expenseDraft.category,
        amount: numericValue,
        notes: expenseDraft.notes?.trim() || undefined,
      });
      setExpenseDraft(createExpenseDraft());
      await fetchHelperCosts();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível registrar o custo.';
      setHelperCosts((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setSavingExpense(false);
    }
  };

  const handleRemoveExpense = async (expenseId: string) => {
    if (!selectedHelperId) return;
    setRemovingExpenseId(expenseId);
    try {
      await teamApi.removeHelperExpense(selectedHelperId, expenseId);
      await fetchHelperCosts();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível remover o custo.';
      setHelperCosts((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setRemovingExpenseId(null);
    }
  };

  const receiptHighlightCards = [
    {
      label: 'Recebido',
      value: formatCurrency(summary.revenuePaid),
      detail: `${summary.paidCount} pagamentos recebidos`,
      icon: DollarSign,
      iconColor: 'text-emerald-400',
      accent: 'from-emerald-500/20 via-transparent to-transparent',
    },
    {
      label: 'Pendente',
      value: formatCurrency(summary.revenuePending),
      detail: `${summary.pendingCount} aguardando pagamento`,
      icon: Clock,
      iconColor: 'text-orange-400',
      accent: 'from-orange-500/15 via-transparent to-transparent',
    },
    {
      label: 'Concluídos',
      value: summary.concludedCount.toString(),
      detail: period ? `${format(period.start, 'dd/MM')} - ${format(period.end, 'dd/MM')}` : 'Período selecionado',
      icon: CheckCircle,
      iconColor: 'text-blue-400',
      accent: 'from-blue-500/15 via-transparent to-transparent',
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(summary.ticket),
      detail: 'Por serviço concluído',
      icon: TrendingUp,
      iconColor: 'text-purple-400',
      accent: 'from-purple-500/20 via-transparent to-transparent',
    },
  ] as const;

  const costOverviewCards = [
    { label: 'Despesas registradas', value: costSummary.count.toString() },
    { label: 'Total de despesas', value: formatCurrency(costSummary.totalExpenses) },
    { label: 'Pagas', value: formatCurrency(costSummary.paidExpenses) },
    { label: 'Pendentes', value: formatCurrency(costSummary.pendingExpenses) },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#05040f] text-white shadow-[0_40px_120px_rgba(5,4,15,0.55)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#312e81] via-[#4c1d95] to-[#0f172a] opacity-90" />
        <div className="relative p-5 md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/70 font-semibold">Finance Hub</p>
            <h1 className="text-3xl md:text-4xl font-semibold">Financeiro FlowOps-style</h1>
            <p className="text-sm text-white/70 max-w-2xl">
              Monitore recebimentos, cobranças pendentes e custos das helpers com visuais consistentes com o novo layout.
            </p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2">
                <Clock size={16} className="text-white/70" />
                {periodLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white/80">
                {transactions.length} transações
              </span>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col gap-3">
            <div className="rounded-3xl border border-white/20 bg-white/10 px-5 py-4 space-y-1">
              <p className="text-sm text-white/70">Total monitorado</p>
              <p className="text-3xl font-semibold">{formatCurrency(summary.total)}</p>
              <p className="text-xs text-white/60">
                Recebido {formatCurrency(summary.revenuePaid)} • Pendente {formatCurrency(summary.revenuePending)}
              </p>
            </div>
            <button
              onClick={handleExportar}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-gray-900 px-5 py-3 text-sm font-semibold shadow-[0_20px_40px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 transition"
            >
              <Download size={18} />
              Exportar CSV
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-5 md:p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">Período e visão</p>
          <p className="text-sm text-gray-500">Escolha o intervalo para atualizar indicadores e alternar as visões.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriodo(option.value)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition ${
                periodo === option.value
                  ? 'bg-primary-600 text-white border-primary-600 shadow-[0_15px_40px_rgba(34,197,94,0.35)]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200 hover:text-primary-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {periodo === 'personalizado' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-500">{periodFullLabel}</p>
          <div className="flex flex-wrap gap-2">
            {FINANCE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition ${
                  activeTab === tab.key
                    ? 'bg-primary-600 text-white border-primary-600 shadow-[0_12px_30px_rgba(34,197,94,0.35)]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200 hover:text-primary-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === 'receitas' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {receiptHighlightCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.06)]"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                  <div className="relative flex items-center justify-between mb-6">
                    <span className="text-sm font-medium text-gray-500">{card.label}</span>
                    <span className="inline-flex items-center justify-center rounded-2xl bg-gray-900/5 p-2">
                      <Icon size={18} className={card.iconColor} />
                    </span>
                  </div>
                  <p className="relative text-3xl font-semibold text-gray-900">{card.value}</p>
                  <p className="relative text-sm text-gray-500 mt-1">{card.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.07)] p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary-500">Transações</p>
                <h3 className="text-lg font-semibold text-gray-900">Entradas do período</h3>
                <p className="text-sm text-gray-500">{periodFullLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1">
                  Recebido {formatCurrency(summary.revenuePaid)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1">
                  Pendente {formatCurrency(summary.revenuePending)}
                </span>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center py-12 text-sm text-gray-500">
                Nenhuma transação encontrada para o período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Descrição</th>
                      <th className="px-4 py-3 text-left">Valor</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="bg-white">
                        <td className="px-4 py-3 text-gray-700">
                          {format(new Date(transaction.dueDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {transaction.appointment?.customer?.name ?? 'Serviço'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.appointment?.customer?.serviceType ?? 'Serviço pontual'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              transaction.status === 'PAGO'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {transaction.status === 'PAGO' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleStatusToggle(transaction)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              transaction.status === 'PAGO'
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {transaction.status === 'PAGO' ? 'Marcar como pendente' : 'Marcar como pago'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700">
              <span>Total do período</span>
              <span className="text-xl text-primary-600">{formatCurrency(summary.total)}</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'custos' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {costOverviewCards.map((card) => (
              <div
                key={card.label}
                className="rounded-3xl border border-gray-100 bg-white/90 backdrop-blur-sm p-4 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.06)] p-5 md:p-6 space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary-600 uppercase tracking-[0.3em]">Custos das helpers</p>
                <h3 className="text-2xl font-semibold text-gray-900">Pagamentos e gastos extras</h3>
                <p className="text-sm text-gray-500 max-w-2xl">
                  Ajuste quanto cada helper recebe por serviço, registre custos variáveis e acompanhe margem e ideias financeiras.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedHelperId}
                  onChange={(e) => handleHelperChange(e.target.value)}
                  className="px-4 py-2 rounded-2xl border border-gray-200 text-sm text-gray-700 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                  disabled={helpersLoading || helpers.length === 0}
                >
                  {helpers.length === 0 ? (
                    <option value="">Nenhuma helper disponível</option>
                  ) : (
                    helpers.map((helper) => (
                      <option key={helper.id} value={helper.id}>
                        {helper.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={() => fetchHelperCosts()}
                  disabled={!selectedHelperId || helperCosts.loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-primary-200 disabled:opacity-60"
                >
                  {helperCosts.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Atualizar
                </button>
              </div>
            </div>

            {helpersLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : helpers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                Nenhuma helper cadastrada. Vá até a aba Equipe para adicionar e então controle os custos por aqui.
              </div>
            ) : helperCosts.error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-600 flex items-center justify-between gap-3">
                <span>{helperCosts.error}</span>
                <button onClick={() => fetchHelperCosts()} className="text-xs font-semibold underline">
                  Tentar novamente
                </button>
              </div>
            ) : helperCostData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Receita bruta', value: usdFormatter.format(helperCostData.summary.revenueTotal) },
                    { label: 'Paga helper', value: usdFormatter.format(helperCostData.summary.payoutTotal) },
                    { label: 'Margem', value: usdFormatter.format(helperCostData.summary.margin) },
                    { label: 'Gastos extras', value: usdFormatter.format(helperCostData.summary.expensesTotal) },
                    { label: 'Líquido', value: usdFormatter.format(helperCostData.summary.netAfterExpenses) },
                  ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{card.label}</p>
                      <p className="text-lg font-semibold text-gray-900">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-[0.9fr,1.1fr] gap-6">
                  <div className="space-y-4">
                    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Regras de pagamento</p>
                        {range && (
                          <span className="text-xs text-gray-500">
                            {format(new Date(range.from), 'dd/MM')} - {format(new Date(range.to), 'dd/MM')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Defina valor fixo ou percentual para as próximas agendas desta helper.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] uppercase text-gray-500 font-semibold">Modo</label>
                          <select
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            value={payoutForm.mode}
                            onChange={(e) =>
                              handlePayoutFormChange({
                                mode: e.target.value as HelperPayoutMode,
                              })
                            }
                          >
                            <option value="FIXED">Valor fixo (USD)</option>
                            <option value="PERCENTAGE">Percentual (%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] uppercase text-gray-500 font-semibold">
                            {payoutForm.mode === 'PERCENTAGE' ? 'Percentual' : 'Valor'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            value={payoutForm.value}
                            onChange={(e) =>
                              handlePayoutFormChange({
                                value: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePayoutConfig}
                        disabled={savingPayout}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Salvar configuração
                      </button>
                      <p className="text-[11px] text-gray-500">
                        Forma atual:{' '}
                        {helperCostData.helper.helperPayoutMode === 'PERCENTAGE' ? 'Percentual' : 'Valor fixo'} (
                        {helperCostData.helper.helperPayoutMode === 'PERCENTAGE'
                          ? `${helperCostData.helper.helperPayoutValue}%`
                          : usdFormatter.format(helperCostData.helper.helperPayoutValue)}
                        )
                      </p>
                    </div>

                    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-900">Registrar gasto rápido</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] uppercase text-gray-500 font-semibold">Categoria</label>
                          <select
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            value={expenseDraft.category}
                            onChange={(e) => handleExpenseDraftChange('category', e.target.value)}
                          >
                            {COST_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] uppercase text-gray-500 font-semibold">Valor (USD)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            value={expenseDraft.amount}
                            onChange={(e) => handleExpenseDraftChange('amount', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] uppercase text-gray-500 font-semibold">Anotações</label>
                        <textarea
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                          placeholder="Ex: Gasolina extra para a rota de segunda"
                          value={expenseDraft.notes}
                          onChange={(e) => handleExpenseDraftChange('notes', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddExpense}
                        disabled={savingExpense}
                        className="inline-flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"
                      >
                        {savingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Adicionar gasto
                      </button>
                    </div>

                    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Histórico de despesas</p>
                        <span className="text-xs text-gray-500">
                          Total {usdFormatter.format(helperCostData.expenses.total)}
                        </span>
                      </div>
                      {helperCostData.expenses.items.length ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="py-2 pr-4">Data</th>
                                <th className="py-2 pr-4">Categoria</th>
                                <th className="py-2 pr-4">Notas</th>
                                <th className="py-2 pr-4">Valor</th>
                                <th className="py-2">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {helperCostData.expenses.items.map((expense) => (
                                <tr key={expense.id}>
                                  <td className="py-2 pr-4 text-gray-700">
                                    {format(new Date(expense.date), 'dd/MM/yyyy')}
                                  </td>
                                  <td className="py-2 pr-4 font-semibold text-gray-900">{expense.category}</td>
                                  <td className="py-2 pr-4 text-gray-500">
                                    {expense.notes || 'Sem observações'}
                                  </td>
                                  <td className="py-2 pr-4 font-semibold text-primary-700">
                                    {usdFormatter.format(expense.amount)}
                                  </td>
                                  <td className="py-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExpense(expense.id)}
                                      disabled={removingExpenseId === expense.id}
                                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                                    >
                                      {removingExpenseId === expense.id ? 'Removendo...' : 'Remover'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum custo extra cadastrado neste período.</p>
                      )}
                    </div>

                    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Serviços analisados</p>
                        <span className="text-xs text-gray-500">
                          {helperCostData.summary.appointments} agendamento
                          {helperCostData.summary.appointments === 1 ? '' : 's'}
                        </span>
                      </div>
                      {helperCostData.appointments.length ? (
                        <div className="space-y-3 max-h-80 overflow-auto pr-1">
                          {helperCostData.appointments.map((appointment) => {
                            const helperPayment = appointment.helperFee ?? appointment.projectedFee ?? 0;
                            const margin = appointment.price - helperPayment;
                            return (
                              <div
                                key={appointment.id}
                                className="border border-gray-100 rounded-xl p-3 text-sm space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-gray-900">{appointment.customer?.name || 'Cliente'}</p>
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(appointment.date), 'dd/MM')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {appointment.startTime}
                                  {appointment.endTime ? ` • ${appointment.endTime}` : ''}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                    Cliente pagou {usdFormatter.format(appointment.price)}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-semibold">
                                    Helper recebe {usdFormatter.format(helperPayment)}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-semibold">
                                    Margem {usdFormatter.format(margin)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum serviço encontrado para o período.</p>
                      )}
                    </div>

                    {helperCostData.inspiration.length > 0 && (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                        <p className="font-semibold text-gray-700 text-sm">Boas ideias</p>
                        <ul className="list-disc list-inside space-y-1">
                          {helperCostData.inspiration.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Selecione uma helper e clique em atualizar para ver os pagamentos e custos do período.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Financeiro;

