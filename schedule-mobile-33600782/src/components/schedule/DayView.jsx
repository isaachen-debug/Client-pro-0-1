import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Sunrise, Sun, Moon } from 'lucide-react';
import EventCard from './EventCard';

export default function DayView({ events, selectedDate, onEditEvent, onDeleteEvent }) {
  const dayEvents = events
    .filter(event => event.date === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const getTimeOfDay = (time) => {
    if (!time) return 'all';
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const groupedEvents = {
    morning: dayEvents.filter(e => getTimeOfDay(e.start_time) === 'morning'),
    afternoon: dayEvents.filter(e => getTimeOfDay(e.start_time) === 'afternoon'),
    evening: dayEvents.filter(e => getTimeOfDay(e.start_time) === 'evening'),
  };

  const timeSlots = [
    { key: 'morning', label: 'Manhã', icon: Sunrise, color: 'text-amber-500' },
    { key: 'afternoon', label: 'Tarde', icon: Sun, color: 'text-orange-500' },
    { key: 'evening', label: 'Noite', icon: Moon, color: 'text-indigo-500' },
  ];

  if (dayEvents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6"
      >
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <Calendar className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum evento</h3>
        <p className="text-gray-500 text-center text-sm">
          Você não tem eventos agendados para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {timeSlots.map(({ key, label, icon: Icon, color }) => {
        const slotEvents = groupedEvents[key];
        if (slotEvents.length === 0) return null;

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 px-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {label}
              </span>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {slotEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}