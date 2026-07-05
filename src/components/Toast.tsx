/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export interface ToastProps {
  key?: string;
  message: string;
  type: 'success' | 'warning' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
  }[type];

  const Icon = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  }[type];

  const progressBg = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
  }[type];

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex flex-col max-w-sm w-full border rounded-xl shadow-lg overflow-hidden animate-slide-up ${bgClass}`}>
      <div className="p-4 flex items-start gap-3">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-lg hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 bg-black/5 w-full">
        <div className={`h-full ${progressBg} animate-progress-bar`} />
      </div>
    </div>
  );
}
