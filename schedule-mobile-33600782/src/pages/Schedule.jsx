import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarDays, CalendarRange, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import DayView from '@/components/schedule/DayView';
import WeekView from '@/components/schedule/WeekView';
import MonthView from '@/components/schedule/MonthView';
import EventForm from '@/components/schedule/EventForm';
import ChatBot from '@/components/schedule/ChatBot';

const views = [
  { id: 'day', label: 'Hoje', icon: Calendar },
  { id: 'week', label: 'Semana', icon: CalendarDays },
  { id: 'month', label: 'Mês', icon: CalendarRange },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export default function Schedule() {
  const [activeView, setActiveView] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleNavigate = (direction) => {
    if (activeView === 'day') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
    } else if (activeView === 'week') {
      setSelectedDate(direction === 'next' ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(direction === 'next' ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1));
    }
  };

  const handleSaveEvent = (data) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDeleteEvent = (event) => {
    if (confirm('Excluir este evento?')) {
      deleteMutation.mutate(event.id);
    }
  };

  const getHeaderTitle = () => {
    if (activeView === 'day') {
      return format(selectedDate, "d 'de' MMMM", { locale: ptBR });
    } else if (activeView === 'week') {
      return format(selectedDate, "MMMM yyyy", { locale: ptBR });
    } else {
      return format(selectedDate, "MMMM yyyy", { locale: ptBR });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="px-4 py-4">
          {activeView !== 'chat' && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleNavigate('prev')}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <motion.h1 
                  key={getHeaderTitle()}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-bold text-gray-900 capitalize min-w-[160px] text-center"
                >
                  {getHeaderTitle()}
                </motion.h1>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleNavigate('next')}
                  className="h-9 w-9"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-blue-600 font-medium"
              >
                Hoje
              </Button>
            </div>
          )}

          {/* View Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{view.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'day' && (
                <DayView
                  events={events}
                  selectedDate={selectedDate}
                  onEditEvent={handleEditEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              )}
              {activeView === 'week' && (
                <WeekView
                  events={events}
                  selectedDate={selectedDate}
                  onEditEvent={handleEditEvent}
                />
              )}
              {activeView === 'month' && (
                <MonthView
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onEditEvent={handleEditEvent}
                />
              )}

              {activeView === 'chat' && (
                <ChatBot
                  onEventCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ['events'] });
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Floating Action Button */}
      {activeView !== 'chat' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setEditingEvent(null);
            setShowForm(true);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition-colors z-50"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Event Form */}
      <EventForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        event={editingEvent}
        selectedDate={format(selectedDate, 'yyyy-MM-dd')}
      />
    </div>
  );
}