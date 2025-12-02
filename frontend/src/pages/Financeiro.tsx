import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, DollarSign, Clock, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { teamApi, transactionsApi } from '../services/api';
import type { HelperCostSummary, HelperPayoutMode, Transaction, User } from '../types';
import { format } from 'date-fns';

const COST_CATEGORIES = ['Gasolina', 'Pedágio', 'Material', 'Bônus', 'Outros'] as const;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Financeiro</h1>
        <button
          onClick={handleExportar}
          className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download size={20} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPeriodo('ultimos7dias')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodo === 'ultimos7dias'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 7 dias
              </button>
              <button
                onClick={() => setPeriodo('ultimos30dias')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodo === 'ultimos30dias'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 30 dias
              </button>
              <button
                onClick={() => setPeriodo('mesAtual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodo === 'mesAtual'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mês atual
              </button>
              <button
                onClick={() => setPeriodo('mesPassado')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodo === 'mesPassado'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mês passado
              </button>
              <button
                onClick={() => setPeriodo('personalizado')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodo === 'personalizado'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {periodo === 'personalizado' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {period && (
            <div className="text-sm text-gray-500">
              {format(period.start, 'dd/MM/yyyy')} - {format(period.end, 'dd/MM/yyyy')}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {(
            [
              { key: 'receitas', label: 'Receitas e cobranças' },
              { key: 'custos', label: 'Custos e despesas' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                activeTab === tab.key ? 'bg-primary-600 text-white shadow' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'receitas' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Recebido',
                value: formatCurrency(summary.revenuePaid),
                detail: `${summary.paidCount} pagamentos recebidos`,
                icon: <DollarSign size={20} className="text-green-600" />,
                iconBg: 'bg-green-50',
              },
              {
                label: 'Pendente',
                value: formatCurrency(summary.revenuePending),
                detail: `${summary.pendingCount} aguardando pagamento`,
                icon: <Clock size={20} className="text-orange-600" />,
                iconBg: 'bg-orange-50',
              },
              {
                label: 'Concluídos',
                value: summary.concludedCount.toString(),
                detail: period
                  ? `${format(period.start, 'dd/MM')} - ${format(period.end, 'dd/MM')}`
                  : 'Período selecionado',
                icon: <CheckCircle size={20} className="text-blue-600" />,
                iconBg: 'bg-blue-50',
              },
              {
                label: 'Ticket médio',
                value: formatCurrency(summary.ticket),
                detail: 'Por serviço concluído',
                icon: <TrendingUp size={20} className="text-purple-600" />,
                iconBg: 'bg-purple-50',
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">{card.label}</span>
                  <div className={`p-2 rounded-lg ${card.iconBg}`}>{card.icon}</div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">{card.value}</h2>
                <p className="text-sm text-gray-500">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transações do período</h3>
                {period && (
                  <p className="text-sm text-gray-500">
                    {format(period.start, 'dd/MM/yyyy')} - {format(period.end, 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">
                Nenhuma transação encontrada para o período selecionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-3 text-sm text-gray-700">
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
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'PAGO'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {transaction.status === 'PAGO' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleStatusToggle(transaction)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              transaction.status === 'PAGO'
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
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

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">Total do período</span>
              <span className="text-xl font-bold text-primary-600">
                {formatCurrency(summary.total)}
              </span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'custos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Despesas registradas', value: costSummary.count.toString() },
              { label: 'Total de despesas', value: formatCurrency(costSummary.totalExpenses) },
              { label: 'Pagas', value: formatCurrency(costSummary.paidExpenses) },
              { label: 'Pendentes', value: formatCurrency(costSummary.pendingExpenses) },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Custos das helpers</p>
                <h3 className="text-xl font-bold text-gray-900">Pagamentos e gastos extras</h3>
                <p className="text-sm text-gray-500">
                  Ajuste quanto cada helper recebe por serviço e registre despesas como gasolina, pedágio ou bônus. Tudo fica
                  centralizado no Financeiro.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedHelperId}
                  onChange={(e) => handleHelperChange(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
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
              <p className="text-sm text-gray-500">
                Nenhuma helper cadastrada. Vá até a aba Equipe para adicionar e então controle os custos por aqui.
              </p>
            ) : helperCosts.error ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 flex items-center justify-between gap-3">
                <span>{helperCosts.error}</span>
                <button
                  onClick={() => fetchHelperCosts()}
                  className="text-xs font-semibold text-red-600 underline"
                >
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
                    <div key={card.label} className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
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
                        Defina valor fixo ou percentual que será usado nas agendas futuras desta helper.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] uppercase text-gray-500 font-semibold">Modo</label>
                          <select
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
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
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
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
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
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
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                            value={expenseDraft.amount}
                            onChange={(e) => handleExpenseDraftChange('amount', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] uppercase text-gray-500 font-semibold">Anotações</label>
                        <textarea
                          rows={2}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                          placeholder="Ex: Gasolina extra para a rota de segunda"
                          value={expenseDraft.notes}
                          onChange={(e) => handleExpenseDraftChange('notes', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddExpense}
                        disabled={savingExpense}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-semibold border border-primary-100 disabled:opacity-50"
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
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 text-xs text-gray-600 space-y-1">
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
        </div>
      )}
    </div>
  );
};

export default Financeiro;

