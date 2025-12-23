import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Plus, Calendar, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PagamentoForm from '@/components/financeiro/PagamentoForm';
import PagamentoCard from '@/components/financeiro/PagamentoCard';

export default function Financeiro() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const queryClient = useQueryClient();

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ['pagamentos'],
    queryFn: () => base44.entities.Pagamento.list('-data', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pagamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      setShowForm(false);
      setEditingPagamento(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pagamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      setShowForm(false);
      setEditingPagamento(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pagamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    },
  });

  const handleSave = (data) => {
    if (editingPagamento) {
      updateMutation.mutate({ id: editingPagamento.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pagamento) => {
    setEditingPagamento(pagamento);
    setShowForm(true);
  };

  const handleDelete = (pagamento) => {
    if (confirm('Excluir este pagamento?')) {
      deleteMutation.mutate(pagamento.id);
    }
  };

  const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const filteredPagamentos = pagamentos.filter(p => {
    const inMonth = p.data >= monthStart && p.data <= monthEnd;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return inMonth && matchesStatus;
  });

  const receitas = filteredPagamentos.filter(p => p.tipo === 'receita');
  const despesas = filteredPagamentos.filter(p => p.tipo === 'despesa');

  const totalReceitas = receitas.reduce((sum, p) => sum + (p.valor || 0), 0);
  const totalDespesas = despesas.reduce((sum, p) => sum + (p.valor || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Financeiro</h1>

          {/* Month Selector */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ←
            </button>
            <span className="text-lg font-semibold capitalize min-w-[140px] text-center">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              →
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Receitas</span>
              </div>
              <div className="text-lg font-bold text-green-700">
                R$ {totalReceitas.toFixed(2)}
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-red-600" />
                <span className="text-xs text-red-600 font-medium">Despesas</span>
              </div>
              <div className="text-lg font-bold text-red-700">
                R$ {totalDespesas.toFixed(2)}
              </div>
            </div>

            <div className={`rounded-xl p-3 ${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className={`w-3 h-3 ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                <span className={`text-xs font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Saldo
                </span>
              </div>
              <div className={`text-lg font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                R$ {saldo.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {['all', 'pago', 'pendente', 'atrasado'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : filteredPagamentos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6"
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <DollarSign className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum registro</h3>
            <p className="text-gray-500 text-center text-sm">
              Adicione receitas e despesas para controlar seu financeiro
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredPagamentos.map((pagamento) => (
                <PagamentoCard
                  key={pagamento.id}
                  pagamento={pagamento}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setEditingPagamento(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition-colors z-30"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Form */}
      <PagamentoForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPagamento(null);
        }}
        onSave={handleSave}
        pagamento={editingPagamento}
      />
    </div>
  );
}