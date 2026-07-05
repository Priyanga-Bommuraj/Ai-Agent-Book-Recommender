/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import BooksTab from './components/BooksTab';
import ChatTab from './components/ChatTab';
import RecommendTab from './components/RecommendTab';
import BorrowTab from './components/BorrowTab';
import ProfileTab from './components/ProfileTab';
import AdminTab from './components/AdminTab';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import { User } from './types';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('books');
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [syncingAuth, setSyncingAuth] = useState<boolean>(true);

  // Load user session on boot
  useEffect(() => {
    const savedToken = localStorage.getItem('librarysense_token');
    const savedUserStr = localStorage.getItem('librarysense_user');

    if (savedToken && savedUserStr) {
      try {
        const decodedUser = JSON.parse(savedUserStr);
        setToken(savedToken);
        setUser(decodedUser);
      } catch (err) {
        localStorage.removeItem('librarysense_token');
        localStorage.removeItem('librarysense_user');
      }
    }
    setSyncingAuth(false);
  }, []);

  // Sync personal overdue counts for live side navigation indicators
  const fetchOverdueCount = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Overdue borrows filter
        const overdue = data.filter((h: any) => h.status === 'overdue');
        setOverdueCount(overdue.length);
      }
    } catch (err) {
      console.warn("Could not sync live overdue loan counters.");
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverdueCount();
    }
  }, [token, refreshTrigger]);

  const addToast = (message: string, type: 'success' | 'warning' | 'error') => {
    const id = 'toast-' + Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAuthSuccess = (savedToken: string, savedUser: User) => {
    localStorage.setItem('librarysense_token', savedToken);
    localStorage.setItem('librarysense_user', JSON.stringify(savedUser));
    setToken(savedToken);
    setUser(savedUser);
    setActiveTab('books');
  };

  const handleLogout = () => {
    localStorage.removeItem('librarysense_token');
    localStorage.removeItem('librarysense_user');
    setToken(null);
    setUser(null);
    setOverdueCount(0);
    setActiveTab('books');
    addToast("Logged out successfully. Have a nice day!", "success");
  };

  // Cross-component state sync trigger
  const triggerStateRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (syncingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500 font-sans">Booting Intelligent Portal...</span>
      </div>
    );
  }

  // Not logged in -> Show auth forms
  if (!user || !token) {
    return (
      <>
        <AuthModal onSuccess={handleAuthSuccess} addToast={addToast} />
        
        {/* Render active toasts */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans select-none antialiased">
      {/* Sidebar navigation */}
      <Navigation
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        overdueCount={overdueCount}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'books' && (
          <BooksTab
            user={user}
            token={token}
            addToast={addToast}
            onBorrowSuccess={triggerStateRefresh}
          />
        )}

        {activeTab === 'chat' && (
          <ChatTab
            token={token}
            addToast={addToast}
          />
        )}

        {activeTab === 'recommend' && (
          <RecommendTab
            token={token}
            addToast={addToast}
            onBorrowSuccess={triggerStateRefresh}
          />
        )}

        {activeTab === 'history' && (
          <BorrowTab
            token={token}
            addToast={addToast}
            refreshTrigger={refreshTrigger}
            onActionComplete={triggerStateRefresh}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            token={token}
            addToast={addToast}
            refreshTrigger={refreshTrigger}
            onPaymentComplete={triggerStateRefresh}
          />
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminTab
            token={token}
            addToast={addToast}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>

      {/* Floating System Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}
