'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  amount?: number;
}

// --- Public API: call from anywhere ---
export function showGlobalToast(message: string, type: 'success' | 'error' | 'info' = 'success', amount?: number) {
  console.log('[Toast] showGlobalToast called:', { message, type, amount, hasWindow: typeof window !== 'undefined' });
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('__toast', { detail: { message, type, amount } }));
  console.log('[Toast] CustomEvent dispatched');
}

// --- Standalone component: mount once in layout ---
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[Toast] ToastContainer mounted');
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('[Toast] Registering event listener on window');
    const handler = (e: Event) => {
      const { message, type, amount } = (e as CustomEvent).detail;
      console.log('[Toast] Event received:', { message, type, amount });
      const id = Date.now().toString() + Math.random().toString(36).slice(2);
      setToasts(prev => {
        const next = [...prev, { id, message, type, amount }];
        console.log('[Toast] Toasts state updated, count:', next.length);
        return next;
      });
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };
    window.addEventListener('__toast', handler);
    return () => {
      console.log('[Toast] Removing event listener');
      window.removeEventListener('__toast', handler);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
}

// Keep backward compat — ToastProvider just passes children through + renders container
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

const toastStyles = {
  success: 'bg-gradient-to-br from-[#9B61DB] to-[#7457CC]',
  error: 'bg-gradient-to-br from-red-500 to-red-700',
  info: 'bg-gradient-to-br from-blue-500 to-blue-700',
} as const;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  return (
    <div
      className={`
        pointer-events-auto cursor-pointer
        ${toastStyles[toast.type]}
        text-white px-5 py-4 rounded-xl shadow-2xl
        min-w-[300px] max-w-[400px]
        animate-slide-in
        border border-white/10
        backdrop-blur-sm
      `}
      onClick={() => onRemove(toast.id)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          {toast.type === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : toast.type === 'error' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{toast.message}</p>
          {toast.amount !== undefined && (
            <p className="text-white/80 text-xs mt-1">
              +{toast.amount.toFixed(4)} XLM
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white/60 rounded-full animate-toast-progress" />
      </div>
    </div>
  );
}
