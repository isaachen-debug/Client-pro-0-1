
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, DollarSign, UserCircle } from 'lucide-react';
import { createPageUrl } from './utils';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Schedule', label: 'Agenda', icon: Calendar },
  { name: 'Clientes', label: 'Clientes', icon: Users },
  { name: 'Financeiro', label: 'Financeiro', icon: DollarSign },
  { name: 'Perfil', label: 'Perfil', icon: UserCircle },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.name;

            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                  isActive ? "text-slate-900" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className={cn(
                  "text-xs",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
