import React from 'react';
import { motion } from 'framer-motion';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import EventCard from './EventCard';

const dotColors = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

export default function MonthView({ events, selectedDate, onSelectDate, onEditEvent }) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDate = (date) => {
    return events.filter(event => event.date === format(date, 'yyyy-MM-dd'));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="pb-24">
      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((weekDay) => (
            <div key={weekDay} className="text-center text-xs font-medium text-gray-400 py-2">
              {weekDay}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayItem, index) => {
            const dayEvents = getEventsForDate(dayItem);
            const isSelected = isSameDay(dayItem, selectedDate);
            const isCurrentMonth = isSameMonth(dayItem, selectedDate);
            const today = isToday(dayItem);

            return (
              <motion.button
                key={index}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelectDate(dayItem)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all duration-200",
                  isSelected && "bg-slate-900 text-white shadow-lg",
                  !isSelected && today && "bg-blue-50 text-blue-600",
                  !isSelected && !today && isCurrentMonth && "hover:bg-gray-50",
                  !isCurrentMonth && "text-gray-300"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  isSelected && "text-white",
                  !isCurrentMonth && "text-gray-300"
                )}>
                  {format(dayItem, 'd')}
                </span>
                
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? "bg-white/70" : dotColors[event.color || 'blue']
                        )}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Events for Selected Day */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">
          {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
        </h3>
        
        {selectedDateEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-400"
          >
            <p className="text-sm">Nenhum evento</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {selectedDateEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={onEditEvent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}