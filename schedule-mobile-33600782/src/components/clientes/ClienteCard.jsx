import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MoreVertical, Home, Building2, HardHat } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

const tipoIcons = {
  residencial: Home,
  comercial: Building2,
  pos_obra: HardHat,
};

export default function ClienteCard({ cliente, onEdit, onDelete }) {
  const TipoIcon = tipoIcons[cliente.tipo_servico] || Home;
  const isInactive = cliente.status === 'inativo';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "bg-white rounded-2xl p-4 shadow-sm border transition-all",
        isInactive ? "border-gray-200 opacity-60" : "border-gray-100"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
            isInactive ? "bg-gray-100 text-gray-400" : "bg-slate-900 text-white"
          )}>
            {cliente.nome?.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {cliente.nome}
            </h3>
            <div className="flex items-center gap-2 mb-1">
              <TipoIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500 capitalize">
                {cliente.tipo_servico?.replace('_', ' ')}
              </span>
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
            <DropdownMenuItem onClick={() => onEdit(cliente)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(cliente)}
              className="text-red-600"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 text-sm">
        {cliente.telefone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${cliente.telefone}`} className="hover:text-slate-900">
              {cliente.telefone}
            </a>
          </div>
        )}
        
        {cliente.email && (
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <a href={`mailto:${cliente.email}`} className="hover:text-slate-900 truncate">
              {cliente.email}
            </a>
          </div>
        )}
        
        {cliente.endereco && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{cliente.endereco}</span>
          </div>
        )}
      </div>

      {cliente.notas && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 line-clamp-2">{cliente.notas}</p>
        </div>
      )}
    </motion.div>
  );
}