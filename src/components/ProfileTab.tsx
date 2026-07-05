/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User as UserIcon, BookOpen, Clock, AlertTriangle, CreditCard, Coins, CheckCircle, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { User, BorrowRecord } from '../types';

interface ProfileTabProps {
  user: User;
  token: string;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  refreshTrigger: number;
  onPaymentComplete: () => void;
}

export default function ProfileTab({ user, token, addToast, refreshTrigger, onPaymentComplete }: ProfileTabProps) {
  const [history, setHistory] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Card inputs state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data);
      }
    } catch (err) {
      addToast("Failed to fetch profile statistics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const activeLoans = history.filter(h => h.status !== 'returned');
  const overdueLoans = history.filter(h => h.status === 'overdue');
  const totalFines = history.reduce((sum, h) => sum + h.fineAmount, 0);

  const handlePayFines = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalFines <= 0) return;

    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      addToast("Please fill in card payment details.", "warning");
      return;
    }

    setPaying(true);
    try {
      const response = await fetch('/api/pay-fines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Payment of $${data.totalPaid.toFixed(2)} processed successfully! Your library account is clear.`, "success");
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        fetchHistory();
        onPaymentComplete();
      } else {
        addToast(data.error || "Payment failed.", "error");
      }
    } catch (err) {
      addToast("Payment processor unreachable.", "error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="p-8 border-b border-slate-200 bg-white shrink-0">
        <h2 className="font-display font-bold text-2xl text-slate-800">My Library Profile</h2>
        <p className="text-sm text-slate-500 font-sans mt-0.5">Manage credentials, audit card standing, and settle accumulated library fine invoices</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
        {/* Profile Card & Info */}
        <div className="flex-1 space-y-6">
          {/* Main Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-display font-bold text-3xl uppercase shrink-0">
              {user.username.slice(0, 2)}
            </div>
            <div className="text-center md:text-left">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                {user.role} Member
              </span>
              <h3 className="font-display font-bold text-xl text-slate-900 mt-2.5">{user.username}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.email}</p>
            </div>
          </div>

          {/* Local Statistics Bento */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white border border-slate-200 rounded-2xl gap-2">
              <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
              <span className="text-xs text-slate-400 font-sans">Compiling reading report...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Books Borrowed', value: history.length, desc: 'All-time lifetime read count', icon: BookOpen, color: 'text-slate-800 bg-slate-100 border-slate-200' },
                { label: 'Checked Out', value: activeLoans.length, desc: 'Active student loans count', icon: Clock, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                { label: 'Overdue Items', value: overdueLoans.length, desc: 'Pending returns overdue', icon: AlertTriangle, color: overdueLoans.length > 0 ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-500 bg-slate-50 border-slate-200' },
                { label: 'Outstanding Penalty', value: `$${totalFines.toFixed(2)}`, desc: 'Accrued late fees due', icon: Coins, color: totalFines > 0 ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-500 bg-slate-50 border-slate-200' }
              ].map((stat, idx) => {
                const IconComp = stat.icon;
                return (
                  <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex justify-between items-start shrink-0">
                      <span className="text-[11px] text-slate-400 font-sans uppercase font-semibold tracking-wider">{stat.label}</span>
                      <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-display font-bold text-2xl text-slate-900 tracking-tight">{stat.value}</h4>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">{stat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fine Payment Simulator Portal */}
        <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs shrink-0 flex flex-col h-fit">
          <h3 className="font-display font-bold text-base text-slate-800 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-500" />
            <span>Fines Clearing Portal</span>
          </h3>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : totalFines <= 0 ? (
            <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center space-y-3">
              <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600 w-10 h-10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-slate-800">Clear Card Standing</p>
                <p className="text-xs text-slate-400 mt-1 font-sans">You have zero outstanding fine penalties. Your academic library card is fully in good standing!</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePayFines} className="space-y-4 text-sm font-sans">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800 uppercase font-mono">Invoice Amount:</span>
                <span className="font-mono font-bold text-rose-700 text-lg">${totalFines.toFixed(2)}</span>
              </div>

              {/* Mock Card Form */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Debit / Credit Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                    placeholder="•••• •••• •••• ••••"
                    maxLength={19}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Expiration Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">CVV Code</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      placeholder="•••"
                      maxLength={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-center"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={paying}
                className="w-full bg-slate-950 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors shadow-sm text-xs mt-4 relative overflow-hidden cursor-pointer"
              >
                {paying ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </div>
                ) : (
                  <span>Clear Penalty Fines</span>
                )}
              </button>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[10px] text-slate-400 font-sans text-center">
                This is a mock transaction simulator for sandbox environments. Enter any valid values to immediately clear your balance.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
