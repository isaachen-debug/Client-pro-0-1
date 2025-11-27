import { useEffect, useMemo, useState } from 'react';
import { Download, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { transactionsApi } from '../services/api';
import { Transaction } from '../types';
import { format } from 'date-fns';

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mesAtual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    fetchFinanceiroData();
  }, [periodo, dataInicio, dataFim]);

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

  const period = range
    ? {
        start: new Date(range.from),
        end: new Date(range.to),
      }
    : resolvePeriod();

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleStatusToggle = async (transaction: Transaction) => {
    try {
      const nextStatus = transaction.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
      const updated = await transactionsApi.updateStatus(transaction.id, nextStatus);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (error) {
      console.error('Erro ao atualizar status da transação:', error);
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recebido */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Recebido</span>
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign size={20} className="text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-green-600">{formatCurrency(summary.revenuePaid)}</h2>
            <p className="text-sm text-gray-500">{summary.paidCount} pagamentos recebidos</p>
          </div>
        </div>

        {/* Pendente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Pendente</span>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock size={20} className="text-orange-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-orange-600">{formatCurrency(summary.revenuePending)}</h2>
            <p className="text-sm text-gray-500">{summary.pendingCount} aguardando pagamento</p>
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Concluídos</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCircle size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-gray-900">
              {summary.concludedCount}
            </h2>
            <p className="text-sm text-gray-500">
              {period
                ? `${format(period.start, 'dd/MM')} - ${format(period.end, 'dd/MM')}`
                : 'Período selecionado'}
            </p>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Ticket Médio</span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-purple-600">
              {formatCurrency(summary.ticket)}
            </h2>
            <p className="text-sm text-gray-500">
              Por serviço concluído
            </p>
          </div>
        </div>
      </div>

      {/* Lista de transações */}
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
    </div>
  );
};

export default Financeiro;

