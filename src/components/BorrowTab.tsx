/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Undo2, AlertTriangle, CheckCircle, Clock, Info, Loader2 } from 'lucide-react';
import { BorrowRecord } from '../types';

interface BorrowTabProps {
  token: string;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  refreshTrigger: number;
  onActionComplete: () => void;
}

export default function BorrowTab({ token, addToast, refreshTrigger, onActionComplete }: BorrowTabProps) {
  const [history, setHistory] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      addToast("Failed to retrieve your borrowing logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const handleReturn = async (borrowId: string) => {
    setProcessingId(borrowId);
    try {
      const response = await fetch('/api/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ borrowId })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.fineAmount > 0) {
          addToast(`Book returned! An overdue fine of $${data.fineAmount.toFixed(2)} has been charged to your account.`, "warning");
        } else {
          addToast(`Book returned successfully! Thank you.`, "success");
        }
        fetchHistory();
        onActionComplete();
      } else {
        addToast(data.error || "Failed to return book.", "error");
      }
    } catch (err) {
      addToast("Failed to complete return request.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRenew = async (borrowId: string) => {
    setProcessingId(borrowId);
    try {
      const response = await fetch('/api/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ borrowId })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Successfully extended your due date to ${new Date(data.dueDate).toLocaleDateString()} (Renewals left: ${2 - data.renewCount})`, "success");
        fetchHistory();
        onActionComplete();
      } else {
        addToast(data.error || "Failed to renew book.", "error");
      }
    } catch (err) {
      addToast("Failed to complete renewal request.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const calculateDaysLeft = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const activeBorrows = history.filter(h => h.status !== 'returned');
  const pastBorrows = history.filter(h => h.status === 'returned');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header Panel */}
      <div className="p-8 border-b border-slate-200 bg-white shrink-0">
        <h2 className="font-display font-bold text-2xl text-slate-800">My Borrowing & Loans</h2>
        <p className="text-sm text-slate-500 font-sans mt-0.5">Track checked-out books, renew standard loan contracts, and observe accrued fees</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm text-slate-500 font-medium font-sans">Syncing library card logs...</p>
          </div>
        ) : (
          <>
            {/* Active Borrows Section */}
            <div>
              <h3 className="font-display font-bold text-lg text-slate-850 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                <span>Active Loans ({activeBorrows.length})</span>
              </h3>

              {activeBorrows.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200/60 rounded-2xl text-center max-w-lg">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="font-display font-semibold text-slate-700">No active book loans</p>
                  <p className="text-xs text-slate-400 mt-1 font-sans">You have zero pending returns. Find your next reading venture in the catalog!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeBorrows.map((record) => {
                    const daysLeft = calculateDaysLeft(record.dueDate);
                    const isOverdue = daysLeft <= 0;
                    
                    // ProgressBar logic
                    let percent = Math.max(0, Math.min(100, (daysLeft / 14) * 100));
                    if (isOverdue) percent = 100;

                    const progressColor = isOverdue 
                      ? 'bg-rose-500' 
                      : (daysLeft <= 3 ? 'bg-amber-500' : 'bg-emerald-500');

                    return (
                      <div key={record.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
                        <div>
                          {/* Alert Row */}
                          <div className="flex justify-between items-start mb-3 shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">TRANSACTION: {record.id.slice(7, 13)}</span>
                            {isOverdue ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full font-sans">
                                <AlertTriangle className="w-3 h-3" />
                                <span>OVERDUE ({Math.abs(daysLeft)} Days)</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-sans">
                                {daysLeft} Days Remaining
                              </span>
                            )}
                          </div>

                          {/* Book Header */}
                          <h4 className="font-display font-semibold text-slate-900 text-base leading-snug">{record.bookTitle}</h4>
                          <p className="text-xs text-slate-400 font-sans mt-0.5">by {record.bookAuthor}</p>

                          {/* Time Ledger */}
                          <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-sans text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-slate-400 font-medium">Checked Out</p>
                              <p className="font-semibold mt-0.5 text-slate-700">{new Date(record.borrowDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-medium">Expected Return</p>
                              <p className={`font-semibold mt-0.5 ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{new Date(record.dueDate).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {/* Accrued Fine warning */}
                          {isOverdue && (
                            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs text-rose-800">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                              <span className="font-sans">
                                Overdue fine accruing: <strong className="font-mono text-rose-700 font-bold">${record.fineAmount.toFixed(2)}</strong> ($0.50/day rate)
                              </span>
                            </div>
                          )}

                          {/* Progress countdown visualizer */}
                          <div className="mt-5 shrink-0">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-sans font-medium">
                              <span>Checked Out</span>
                              <span>Due Date</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                              <div className={`h-full ${progressColor} transition-all`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex gap-2.5 border-t border-slate-100 pt-4 mt-6 shrink-0">
                          <button
                            onClick={() => handleRenew(record.id)}
                            disabled={processingId === record.id || isOverdue || record.renewCount >= 2}
                            className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 transition-colors cursor-pointer"
                            title={record.renewCount >= 2 ? "Maximum 2 renewals reached." : "Extend by 14 days"}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${processingId === record.id ? 'animate-spin' : ''}`} />
                            <span>Renew ({2 - record.renewCount} left)</span>
                          </button>
                          <button
                            onClick={() => handleReturn(record.id)}
                            disabled={processingId === record.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Return Volume</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Borrow History */}
            <div>
              <h3 className="font-display font-bold text-lg text-slate-850 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-slate-500" />
                <span>Historic Returns ({pastBorrows.length})</span>
              </h3>

              {pastBorrows.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl max-w-lg font-sans">
                  No previous returned items in our records database.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-sans">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Book Details</th>
                          <th className="px-6 py-4">Borrow Date</th>
                          <th className="px-6 py-4">Return Date</th>
                          <th className="px-6 py-4">Fines Paid</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {pastBorrows.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{record.bookTitle}</p>
                              <p className="text-xs text-slate-400 mt-0.5">by {record.bookAuthor}</p>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                              {new Date(record.borrowDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                              {record.returnDate ? new Date(record.returnDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-medium text-slate-600">
                              {record.fineAmount > 0 ? `$${record.fineAmount.toFixed(2)}` : '$0.00'}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-sans">
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
