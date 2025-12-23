import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const colorStyles = {
  blue: "bg-blue-50 border-l-blue-500 text-blue-900",
  green: "bg-emerald-50 border-l-emerald-500 text-emerald-900",
  purple: "bg-violet-50 border-l-violet-500 text-violet-900",
  orange: "bg-orange-50 border-l-orange-500 text-orange-900",
  pink: "bg-pink-50 border-l-pink-500 text-pink-900",
  cyan: "bg-cyan-50 border-l-cyan-500 text-cyan-900",
};

const dotColors = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

export default function EventCard({ event, onEdit, onDelete, compact = false }) {
  const color = event.color || 'blue';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer hover:opacity-80 transition-opacity ${colorStyles[color]}`}
        onClick={() => onEdit?.(event)}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />
        <span className="truncate font-medium">{event.title}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 rounded-2xl border-l-4 ${colorStyles[color]} shadow-sm hover:shadow-md transition-all duration-300`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{event.title}</h3>
          
          <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{event.start_time}{event.end_time && ` - ${event.end_time}`}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{event.location}</span>
              </div>
            )}
          </div>
          
          {event.description && (
            <p className="mt-1 text-xs opacity-60 line-clamp-1">{event.description}</p>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(event)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(event)}
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