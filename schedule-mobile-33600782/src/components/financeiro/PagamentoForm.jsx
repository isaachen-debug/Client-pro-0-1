import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, CreditCard, FileText, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PagamentoForm({ open, onClose, onSave, pagamento }) {
  const [formData, setFormData] = useState({
    cliente_nome: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'receita',
    metodo: 'pix',
    status: 'pendente',
    descricao: '',
  });

  useEffect(() => {
    if (pagamento) {
      setFormData({
        cliente_nome: pagamento.cliente_nome || '',
        valor: pagamento.valor || '',
        data: pagamento.data || '',
        tipo: pagamento.tipo || 'receita',
        metodo: pagamento.metodo || 'pix',
        status: pagamento.status || 'pendente',
        descricao: pagamento.descricao || '',
      });
    } else {
      setFormData({
        cliente_nome: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        tipo: 'receita',
        metodo: 'pix',
        status: 'pendente',
        descricao: '',
      });
    }
  }, [pagamento, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      valor: parseFloat(formData.valor),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold">
            {pagamento ? 'Editar Pagamento' : 'Novo Pagamento'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pb-8">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Tipo</Label>
            <Select 
              value={formData.tipo} 
              onValueChange={(value) => setFormData({ ...formData, tipo: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Cliente/Descrição *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Nome do cliente ou descrição"
                value={formData.cliente_nome}
                onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                className="pl-10 h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Valor *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="pl-10 h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Data *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="pl-10 h-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Método</Label>
              <Select 
                value={formData.metodo} 
                onValueChange={(value) => setFormData({ ...formData, metodo: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Observações</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                placeholder="Detalhes adicionais"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="pl-10 min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
            >
              {pagamento ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}