import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, AlignLeft } from 'lucide-react';
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

const colors = [
  { id: 'blue', bg: 'bg-blue-500' },
  { id: 'green', bg: 'bg-emerald-500' },
  { id: 'purple', bg: 'bg-violet-500' },
  { id: 'orange', bg: 'bg-orange-500' },
  { id: 'pink', bg: 'bg-pink-500' },
  { id: 'cyan', bg: 'bg-cyan-500' },
];

export default function EventForm({ open, onClose, onSave, event, selectedDate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    color: 'blue',
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        location: event.location || '',
        color: event.color || 'blue',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: selectedDate || new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        location: '',
        color: 'blue',
      });
    }
  }, [event, selectedDate, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pb-8">
          <div className="space-y-2">
            <Input
              placeholder="Título do evento"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-lg font-medium h-12 border-0 border-b-2 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500"
              required
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Data</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Início</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Término</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Local</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Adicionar local"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Descrição</Label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                placeholder="Adicionar descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="pl-10 min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Cor</Label>
            <div className="flex gap-3">
              {colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.id })}
                  className={`w-8 h-8 rounded-full ${color.bg} transition-all duration-200 ${
                    formData.color === color.id 
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                      : 'hover:scale-105'
                  }`}
                />
              ))}
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
              {event ? 'Salvar' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}