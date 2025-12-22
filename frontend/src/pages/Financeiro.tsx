import { useEffect, useMemo, useState } from 'react';
import { Download, Clock, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { transactionsApi } from '../services/api';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';
import type { Transaction } from '../types';
import { format } from 'date-fns';

const PERIOD_OPTIONS = [
  { value: 'mesAtual', label: 'Mês atual' },
  { value: 'ultimos7dias', label: 'Últimos 7 dias' },
  { value: 'ultimos30dias', label: 'Últimos 30 dias' },
] as const;

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<(typeof PERIOD_OPTIONS)[number]['value']>('mesAtual');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );
  const formatCurrency = (value: number) => usdFormatter.format(value);

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
      case 'mesAtual':
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end };
      }
    }
  };

  const period = resolvePeriod();
  const periodLabel = `${format(period.start, 'dd MMM')} – ${format(period.end, 'dd MMM')}`;
  const periodFullLabel = `${format(period.start, 'dd/MM/yyyy')} - ${format(period.end, 'dd/MM/yyyy')}`;

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
  }, [periodo]);

  const summary = useMemo(() => {
    const receipts = transactions.filter((t) => t.type === 'RECEITA');
    const paid = receipts.filter((t) => t.status === 'PAGO');
    const pending = receipts.filter((t) => t.status === 'PENDENTE');

    const revenuePaid = paid.reduce((sum, t) => sum + t.amount, 0);
    const revenuePending = pending.reduce((sum, t) => sum + t.amount, 0);
    const total = revenuePaid + revenuePending;

    return {
      revenuePaid,
      revenuePending,
      total,
      paidCount: paid.length,
      pendingCount: pending.length,
    };
  }, [transactions]);

  const pendingTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'RECEITA' && t.status === 'PENDENTE'),
    [transactions],
  );
  const paidTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'RECEITA' && t.status === 'PAGO'),
    [transactions],
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`${pageGutters} max-w-4xl mx-auto space-y-6`}>
      <PageHeader
        label="FINANCEIRO"
        title="Financeiro"
        subtitle="Recebimentos e pendências em um painel simples."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone="neutral">{periodLabel}</StatusBadge>
            <button
              onClick={handleExportar}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              <Download size={16} />
              Exportar CSV
            </button>
            <button
              onClick={() => setResetModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
            >
              <Trash2 size={16} />
              Resetar dados
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'A receber', value: formatCurrency(summary.revenuePending), tone: 'text-amber-600' },
          { label: 'Recebido (mês)', value: formatCurrency(summary.revenuePaid), tone: 'text-emerald-600' },
          { label: 'Pendentes', value: `${summary.pendingCount}`, tone: 'text-amber-600' },
          { label: 'Próximos', value: `${pendingTransactions.length}`, tone: 'text-primary-600' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-slate-100 bg-white shadow-sm px-4 py-4 flex flex-col gap-1.5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className={`text-xl font-bold text-slate-900 ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setPeriodo(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              periodo === option.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200 hover:text-primary-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 owner-grid-tight">
        <SurfaceCard className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Recebido</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary.revenuePaid)}</p>
          <p className="text-xs text-slate-500">{summary.paidCount} pagamentos</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Pendente</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary.revenuePending)}</p>
          <p className="text-xs text-slate-500">{summary.pendingCount} aguardando</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Total monitorado</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary.total)}</p>
          <p className="text-xs text-slate-500">{periodFullLabel}</p>
        </SurfaceCard>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Recebimentos pendentes</p>
            <p className="text-xs text-slate-500">Marque como pago para atualizar o saldo.</p>
          </div>
          <StatusBadge tone="warning">{pendingTransactions.length}</StatusBadge>
        </div>
        {pendingTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 text-center">
            Nenhuma cobrança pendente neste período.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-start justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {transaction.appointment?.customer?.name ?? 'Serviço'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    Vence em {format(new Date(transaction.dueDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(transaction.amount)}</p>
                  <button
                    onClick={() => handleStatusToggle(transaction)}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition"
                  >
                    Marcar como pago
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Recebidos recentes</p>
            <p className="text-xs text-slate-500">Últimos pagamentos confirmados.</p>
          </div>
          <StatusBadge tone="success">{paidTransactions.length}</StatusBadge>
        </div>
        {paidTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 text-center">
            Nenhum pagamento confirmado neste período.
          </div>
        ) : (
          <div className="space-y-3">
            {paidTransactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-start justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {transaction.appointment?.customer?.name ?? 'Serviço'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    Pago em {format(new Date(transaction.dueDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(transaction.amount)}</p>
                  <button
                    onClick={() => handleStatusToggle(transaction)}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Marcar como pendente
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de reset financeiro */}
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
