import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  FileText,
  AlertOctagon,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Toilets',
      icon: Compass,
      exact: true,
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: FileText,
    },
    {
      to: '/report',
      label: 'Report',
      icon: AlertOctagon,
      isAction: true,
    },
    {
      to: '/hygiene',
      label: 'Pads',
      icon: Sparkles,
    },
    {
      to: '/campaigns',
      label: 'Donate',
      icon: HeartHandshake,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 sm:px-6 py-1.5 transition-all md:hidden"
      aria-label="Mobile Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === '/' || location.pathname === '/find'
            : location.pathname.startsWith(item.to);

          if (item.isAction) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-5 group touch-manipulation"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isActive
                      ? 'bg-rose-700 text-white ring-4 ring-rose-200'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-rose-700 mt-1">
                  {item.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all touch-manipulation active:scale-95 ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-transparent text-slate-500'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-emerald-600' : 'text-slate-500'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight truncate max-w-[64px] text-center ${
                  isActive ? 'font-extrabold text-emerald-800' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
