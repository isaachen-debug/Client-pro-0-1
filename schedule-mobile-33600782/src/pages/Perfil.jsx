import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, LogOut, Bell, Moon, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Perfil() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = () => {
    if (confirm('Deseja sair da sua conta?')) {
      base44.auth.logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.full_name || 'Usuário'}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              Administrador
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Configurações</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Notificações</div>
                  <div className="text-xs text-gray-500">Receber alertas</div>
                </div>
              </div>
              <button 
                onClick={() => setNotifications(!notifications)} 
                className={notifications ? 'relative w-12 h-7 rounded-full transition-colors bg-slate-900' : 'relative w-12 h-7 rounded-full transition-colors bg-gray-300'}
              >
                <div className={notifications ? 'absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform translate-x-5' : 'absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform'} />
              </button>
            </div>
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  {darkMode ? <Moon className="w-5 h-5 text-purple-600" /> : <Sun className="w-5 h-5 text-purple-600" />}
                </div>
                <div>
                  <div className="font-medium text-gray-900">Modo Escuro</div>
                  <div className="text-xs text-gray-500">Aparência do app</div>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={darkMode ? 'relative w-12 h-7 rounded-full transition-colors bg-slate-900' : 'relative w-12 h-7 rounded-full transition-colors bg-gray-300'}
              >
                <div className={darkMode ? 'absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform translate-x-5' : 'absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform'} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Sobre</h3>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-gray-600 mb-2">Sistema de Gestão</p>
            <p className="text-xs text-gray-400">Versão 1.0.0</p>
          </div>
        </motion.div>

        <Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </main>
    </div>
  );
}