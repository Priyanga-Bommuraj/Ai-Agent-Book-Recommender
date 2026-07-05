/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Book, Clock, AlertCircle, Coins, Users, Search, ChevronRight, FileText, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';

interface AdminTabProps {
  token: string;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  refreshTrigger: number;
}

export default function AdminTab({ token, addToast, refreshTrigger }: AdminTabProps) {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/reports', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const statsData = await statsRes.json();
      const reportsData = await reportsRes.json();

      if (statsRes.ok) setStats(statsData);
      if (reportsRes.ok) setReports(reportsData);
    } catch (err) {
      addToast("Failed to compile administrative records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [refreshTrigger]);

  const filteredReports = reports.filter(r => {
    // 1. Status Filter
    if (filter === 'active' && r.status !== 'active') return false;
    if (filter === 'overdue' && r.status !== 'overdue') return false;
    if (filter === 'returned' && r.status !== 'returned') return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.bookTitle.toLowerCase().includes(q) ||
        r.bookAuthor.toLowerCase().includes(q) ||
        r.borrowerName.toLowerCase().includes(q) ||
        r.borrowerEmail.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-900" />
            <span>Administrative Librarian Panel</span>
          </h2>
          <p className="text-sm text-slate-500 font-sans mt-0.5">Global audit reports, dynamic inventory tracking, overdue penalty logs, and user balances</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm text-slate-500 font-medium font-sans">Compiling university ledger logs...</p>
          </div>
        ) : stats ? (
          <>
            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Core Inventory Catalog', value: `${stats.totalBooks} volumes`, sub: 'Physical books catalog', icon: Book, bg: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
                { label: 'Currently Out on Loan', value: `${stats.borrowedBooks} active`, sub: 'Pending student returns', icon: Clock, bg: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                { label: 'Unpaid Penalty Items', value: `${stats.overdueBooksCount} overdue`, sub: 'Accruing dynamic fines', icon: AlertCircle, bg: 'bg-rose-50 border-rose-100 text-rose-700' },
                { label: 'Collected Fines Revenue', value: `$${stats.totalFinesCollected.toFixed(2)}`, sub: 'Processed cleared balances', icon: Coins, bg: 'bg-amber-50 border-amber-100 text-amber-700' }
              ].map((card, idx) => {
                const IconComp = card.icon;
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex items-center gap-5">
                    <div className={`p-4 rounded-xl border ${card.bg} shrink-0`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium font-sans uppercase tracking-wider">{card.label}</p>
                      <h3 className="font-display font-bold text-slate-800 text-xl tracking-tight mt-1">{card.value}</h3>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">{card.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Master Loans Log & Audits */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-800">Master Circulation Ledger</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">Track, audit, and inspect student transaction cards across campus</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Filters */}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-medium font-sans border border-slate-200/50">
                    {[
                      { id: 'all', label: 'All Audits' },
                      { id: 'active', label: 'Active' },
                      { id: 'overdue', label: 'Overdue' },
                      { id: 'returned', label: 'Returned' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filter === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search borrower or book..."
                      className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Loans Table */}
              {filteredReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-sans border border-dashed border-slate-200 rounded-xl max-w-lg mx-auto my-6">
                  No matching transaction audits registered under this current query filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Borrower Info</th>
                        <th className="px-6 py-4">Book Details</th>
                        <th className="px-6 py-4">Contract Dates</th>
                        <th className="px-6 py-4">Status & Fine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredReports.map((log) => {
                        const isOverdue = log.status === 'overdue';
                        const isReturned = log.status === 'returned';

                        const statusBadge = isOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : (isReturned ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100');

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-mono font-semibold text-slate-400">
                              #{log.id.slice(7, 14)}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{log.borrowerName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{log.borrowerEmail}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{log.bookTitle}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">by {log.bookAuthor}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <p className="text-slate-500">Borrowed: <strong>{new Date(log.borrowDate).toLocaleDateString()}</strong></p>
                                <p className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                                  {isReturned ? 'Returned: ' : 'Expected: '}
                                  <strong>{isReturned ? new Date(log.returnDate).toLocaleDateString() : new Date(log.dueDate).toLocaleDateString()}</strong>
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <span className={`w-fit text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}`}>
                                  {log.status}
                                </span>
                                {log.fineAmount > 0 && (
                                  <span className="font-mono text-[10px] font-bold text-slate-800">
                                    Fee: ${log.fineAmount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400 font-sans">
            Librarian parameters could not load correctly. Try refreshing.
          </div>
        )}
      </div>
    </div>
  );
}
