/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Sparkles, History, MessageSquare, Shield, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface NavigationProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  overdueCount: number;
}

export default function Navigation({ user, activeTab, setActiveTab, onLogout, overdueCount }: NavigationProps) {
  const navItems = [
    { id: 'books', label: 'Catalog Books', icon: BookOpen },
    { id: 'chat', label: 'AI Librarian Chat', icon: MessageSquare },
    { id: 'recommend', label: 'AI Smart Match', icon: Sparkles },
    { id: 'history', label: 'Borrow History', icon: History, badge: overdueCount > 0 ? overdueCount : undefined },
    { id: 'profile', label: 'My Library Profile', icon: UserIcon },
  ];

  // Include Admin Panel if user is librarian admin
  if (user.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Librarian Panel', icon: Shield });
  }

  return (
    <aside className="w-68 bg-slate-900 text-white flex flex-col h-screen shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
          <BookOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-tight tracking-tight">LibrarySense AI</h1>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Smart Agent Portal</span>
        </div>
      </div>

      {/* Active User Card */}
      <div className="p-4 mx-4 my-6 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-display font-semibold text-emerald-400 uppercase shrink-0">
          {user.username.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">{user.role}</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{user.username}</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                isActive 
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/50' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
              }`}
            >
              <IconComp className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-100'}`} />
              <span className="truncate">{item.label}</span>
              
              {item.badge !== undefined && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shadow-sm">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-rose-400" />
          <span>Exit Portal</span>
        </button>
      </div>
    </aside>
  );
}
