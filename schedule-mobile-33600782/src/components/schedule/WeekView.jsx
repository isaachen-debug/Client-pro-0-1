import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventCard from './EventCard';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export default function WeekView({ events, selectedDate, onEditEvent }) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selectedDay, setSelectedDay] = useState(selectedDate);

  const getEventsForDate = (date) => {
    return events
      .filter(event => event.date === format(date, 'yyyy-MM-dd'))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const selectedDayEvents = getEventsForDate(selectedDay);

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Week Days Header */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDay);

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center px-4 py-3 rounded-xl min-w-[60px] transition-all",
                selected && "bg-slate-900 text-white shadow-lg scale-105",
                !selected && today && "bg-blue-50 text-blue-600 border-2 border-blue-500",
                !selected && !today && "bg-white border border-gray-200 hover:border-gray-300"
              )}
            >
              <span className={cn(
                "text-xs uppercase font-semibold mb-1",
                selected ? "text-white/70" : today ? "text-blue-500" : "text-gray-500"
              )}>
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={cn(
                "text-2xl font-bold",
                selected && "text-white",
                !selected && today && "text-blue-600",
                !selected && !today && "text-gray-900"
              )}>
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 h-1 rounded-full",
                        selected ? "bg-white/50" : today ? "bg-blue-500" : "bg-gray-400"
                      )}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Day Title */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">
          {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {selectedDayEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="text-base font-semibold text-gray-800 mb-1">Nenhum evento</h4>
            <p className="text-sm text-gray-500 text-center">
              Nenhum evento agendado para este dia
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {selectedDayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={onEditEvent}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}