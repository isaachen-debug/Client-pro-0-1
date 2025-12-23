import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Phone, Mail, MapPin, User, Building2, Home, FileDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ClienteForm from '@/components/clientes/ClienteForm';
import ClienteCard from '@/components/clientes/ClienteCard';

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);

  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      setEditingCliente(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      setEditingCliente(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  const handleSave = (data) => {
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleDelete = (cliente) => {
    if (confirm(`Excluir cliente ${cliente.nome}?`)) {
      deleteMutation.mutate(cliente.id);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(clientes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone?.includes(searchTerm)
  );

  const activeClientes = filteredClientes.filter(c => c.status === 'ativo');
  const inactiveClientes = filteredClientes.filter(c => c.status === 'inativo');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Exportar clientes"
              >
                <FileDown className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">Exportar</span>
              </button>
              <div className="text-sm text-gray-500">
                {activeClientes.length} ativos
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : filteredClientes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6"
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {searchTerm ? 'Nenhum resultado' : 'Nenhum cliente'}
            </h3>
            <p className="text-gray-500 text-center text-sm">
              {searchTerm ? 'Tente buscar com outro termo' : 'Adicione seu primeiro cliente'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Active Clients */}
            {activeClientes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">
                  Ativos
                </h2>
                <AnimatePresence>
                  {activeClientes.map((cliente) => (
                    <ClienteCard
                      key={cliente.id}
                      cliente={cliente}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Inactive Clients */}
            {inactiveClientes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">
                  Inativos
                </h2>
                <AnimatePresence>
                  {inactiveClientes.map((cliente) => (
                    <ClienteCard
                      key={cliente.id}
                      cliente={cliente}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setEditingCliente(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition-colors z-30"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Form */}
      <ClienteForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCliente(null);
        }}
        onSave={handleSave}
        cliente={editingCliente}
      />
    </div>
  );
}