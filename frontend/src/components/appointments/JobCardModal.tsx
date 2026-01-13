import React from 'react';
import {
  X, Clock, Phone, MessageCircle, CheckCircle2, Navigation
} from 'lucide-react';
import { Appointment, User } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JobCardModalProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: (status: any) => void;
  onEdit?: () => void;
  helpers?: User[];
}

export const JobCardModal = ({ appointment, onClose, onStatusChange, onEdit, helpers = [] }: JobCardModalProps) => {
  const helper = appointment.assignedHelperId
    ? helpers.find(h => h.id === appointment.assignedHelperId)
    : null;

  const getInitials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const handleWhatsApp = () => {
    if (appointment.customer.phone) {
      window.open(`https://wa.me/${appointment.customer.phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleCall = () => {
    if (appointment.customer.phone) {
      window.location.href = `tel:${appointment.customer.phone}`;
    }
  };

  // Helper Icon
  const UsersIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );

  const handleNavigate = () => {
    if (appointment.customer.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(appointment.customer.address)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:justify-end sm:items-stretch p-0 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full sm:w-[400px] sm:max-w-none h-auto sm:h-full rounded-t-[32px] sm:rounded-none sm:rounded-l-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up-bottom sm:animate-slide-in-right">

        {/* Drag Handle for mobile - visual cue */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
        </div>

        {/* Header with Initials and Name */}
        <div className="px-6 pt-2 pb-2 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md bg-purple-500`}>
              {getInitials(appointment.customer.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {appointment.customer.name}
              </h2>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
                <Clock size={14} />
                <span>
                  {appointment.startTime}
                  {appointment.endTime ? ` • ${getDuration(appointment.startTime, appointment.endTime)}` : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 -mr-2 -mt-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                title="Editar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">

          {/* Team Assigned Section - Matches Reference Image */}
          {helper && (
            <div className="bg-[#F0F4FF] dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-50 dark:border-indigo-800/30">
              <div className="flex items-center gap-2 mb-3">
                <UsersIcon className="text-indigo-500" size={14} />
                <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">EQUIPE ESCALADA</h3>
              </div>
              <div className="flex items-center gap-3">
                {helper.avatarUrl ? (
                  <img src={helper.avatarUrl} alt={helper.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                    {getInitials(helper.name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{helper.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Green Style as per image */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (appointment.customer.phone) {
                  window.location.href = `sms:${appointment.customer.phone.replace(/\D/g, '')}`;
                }
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <MessageCircle size={18} />
              SMS
            </button>
            <button
              onClick={handleNavigate}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <Navigation size={18} />
              Navegar
            </button>
          </div>

          {/* Address */}
          {appointment.customer.address && (
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ENDEREÇO</h3>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-200 leading-snug">
                  {appointment.customer.address}
                </p>
                <button
                  onClick={handleNavigate}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 mt-1"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Ver no mapa
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Button - Added extensive padding bottom to handle iPhone home indicator area safely */}
        <div className="p-6 pt-2 mt-auto pb-10 sm:pb-6 shrink-0 bg-white dark:bg-slate-900 z-10">
          <button
            onClick={() => onStatusChange && onStatusChange('CONCLUIDO')}
            className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Concluir Serviço (R$ {appointment.price})
          </button>
        </div>

      </div>
    </div>
  );
};

// Helper for duration
const getDuration = (start: string, end: string) => {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};
