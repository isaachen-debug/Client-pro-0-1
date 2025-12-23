import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MoreVertical, Calendar, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusColors = {
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-yellow-100 text-yellow-700',
  atrasado: 'bg-red-100 text-red-700',
};

const metodoLabels = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão',
  transferencia: 'Transferência',
};

export default function PagamentoCard({ pagamento, onEdit, onDelete }) {
  const isReceita = pagamento.tipo === 'receita';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isReceita ? "bg-green-100" : "bg-red-100"
          )}>
            {isReceita ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {pagamento.cliente_nome}
            </h3>
            <div className={cn(
              "text-2xl font-bold mb-2",
              isReceita ? "text-green-700" : "text-red-700"
            )}>
              {isReceita ? '+' : '-'} R$ {pagamento.valor?.toFixed(2)}
            </div>
            {pagamento.descricao && (
              <p className="text-sm text-gray-600 mb-2">{pagamento.descricao}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", statusColors[pagamento.status])}>
                {pagamento.status?.charAt(0).toUpperCase() + pagamento.status?.slice(1)}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {format(new Date(pagamento.data), "d 'de' MMM", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <CreditCard className="w-3 h-3" />
                {metodoLabels[pagamento.metodo]}
              </div>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(pagamento)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(pagamento)}
              className="text-red-600"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}