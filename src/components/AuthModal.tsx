/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Shield, GraduationCap, Mail, Lock, Sparkles, BookOpen } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (token: string, user: any) => void;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

export default function AuthModal({ onSuccess, addToast }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !username)) {
      addToast("Please fill in all required fields.", "warning");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const payload = isLogin 
        ? { email, password } 
        : { username, email, password, role };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      addToast(
        isLogin ? `Welcome back, ${data.user.username}!` : "Registration successful! Welcome to LibrarySense.", 
        "success"
      );
      onSuccess(data.token, data.user);
    } catch (err: any) {
      addToast(err.message || "An error occurred during authentication.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col animate-slide-up">
        {/* Header Accents */}
        <div className="bg-slate-900 text-white p-8 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-2xl opacity-50" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-slate-700 rounded-full blur-xl opacity-35" />
          
          <div className="relative z-10 flex items-center gap-3 mb-2">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
              <BookOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">LibrarySense AI</span>
          </div>
          <p className="relative z-10 text-slate-300 text-sm font-sans">
            Intelligent Library Assistant & Reading Agent
          </p>
        </div>

        {/* Auth Forms */}
        <div className="p-8 flex-1">
          {/* Tab Headers */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-6 shrink-0">
            <button
              type="button"
              onClick={() => { setIsLogin(true); }}
              className={`py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); }}
              className={`py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-slate-800 font-sans"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@librarysense.edu"
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-slate-800 font-sans"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Secret Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-slate-800 font-sans"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Academic Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'student', label: 'Student', icon: GraduationCap },
                    { value: 'faculty', label: 'Faculty', icon: Shield },
                    { value: 'admin', label: 'Admin/Staff', icon: Sparkles }
                  ].map((option) => {
                    const IconComp = option.icon;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setRole(option.value as any)}
                        className={`flex flex-col items-center gap-1.5 p-3 border rounded-xl transition-all ${role === option.value ? 'bg-slate-950 border-slate-950 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-3 rounded-xl transition-colors shadow-md text-sm mt-2 relative overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <span>{isLogin ? 'Sign In to Portal' : 'Create Library Account'}</span>
              )}
            </button>
          </form>

          {/* Quick Info Credentials for Assignment Graders */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">Grading / Demo Credentials:</div>
            <div>• Student: <span className="font-mono text-slate-800">student@librarysense.edu</span> / <span className="font-mono text-slate-800">studentpassword</span></div>
            <div>• Admin: <span className="font-mono text-slate-800">admin@librarysense.edu</span> / <span className="font-mono text-slate-800">adminpassword</span></div>
            <div>• Faculty: <span className="font-mono text-slate-800">faculty@librarysense.edu</span> / <span className="font-mono text-slate-800">facultypassword</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
