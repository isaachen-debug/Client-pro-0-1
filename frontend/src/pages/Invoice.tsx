import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { invoicesApi } from '../services/api';
import type { Invoice as InvoiceType } from '../services/api';

const statusClassMap: Record<string, string> = {
  PAGO: 'bg-green-100 text-green-700',
  PENDENTE: 'bg-amber-100 text-amber-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const data = await invoicesApi.get(id);
        setInvoice(data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Não foi possível carregar a fatura.');
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [id]);

  const handleCopyLink = async () => {
    if (!invoice) return;
    const url = `${window.location.origin}/invoice/${invoice.id}`;
    await navigator.clipboard.writeText(url);
    alert('Link da fatura copiado para a área de transferência.');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando fatura...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4 text-center">
        <p className="text-gray-700">{error || 'Fatura não encontrada.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  const formattedDate = format(new Date(invoice.date), "dd 'de' MMMM yyyy", { locale: ptBR });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4 print:bg-white">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: invoice.company.primaryColor || '#22c55e' }}
            >
              {invoice.company.companyName?.charAt(0) || 'CP'}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{invoice.company.companyName || invoice.company.name}</p>
              <p className="text-sm text-gray-500">{invoice.company.email}</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs uppercase text-gray-500 tracking-wide">Fatura</p>
            <p className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</p>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                statusClassMap[invoice.status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {invoice.status === 'PAGO' ? 'Pago' : invoice.status === 'PENDENTE' ? 'Pendente' : invoice.status}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <section className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Faturar para</p>
              <div className="mt-2 text-gray-800">
                <p className="font-semibold">{invoice.customer.name}</p>
                {invoice.customer.email && <p className="text-sm text-gray-500">{invoice.customer.email}</p>}
                {invoice.customer.address && <p className="text-sm text-gray-500">{invoice.customer.address}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalhes do serviço</p>
              <div className="mt-2 text-gray-800 space-y-1">
                <p>
                  <span className="text-gray-500">Serviço: </span>
                  {invoice.serviceType ?? 'Serviço contratado'}
                </p>
                <p>
                  <span className="text-gray-500">Data: </span>
                  {formattedDate}
                </p>
                <p>
                  <span className="text-gray-500">Horário: </span>
                  {invoice.startTime}
                  {invoice.endTime ? ` - ${invoice.endTime}` : ''}
                </p>
                {invoice.estimatedDurationMinutes && (
                  <p>
                    <span className="text-gray-500">Duração: </span>
                    {invoice.estimatedDurationMinutes} min
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Resumo</div>
            <div className="px-6 py-4 flex items-center justify-between text-lg font-semibold text-gray-900">
              <span>Total</span>
              <span>R$ {invoice.price.toFixed(2)}</span>
            </div>
          </section>

          {invoice.notes && (
            <section className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase">Observações</p>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{invoice.notes}</p>
            </section>
          )}

          <section className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={handlePrint}
              className="px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={handleCopyLink}
              className="px-5 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
            >
              Copiar link da fatura
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Voltar
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Invoice;

