'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

/* ─── Context ───────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

/* ─── Provider ──────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast]);
  const error = useCallback((msg: string) => toast(msg, 'error', 6000), [toast]);
  const warning = useCallback((msg: string) => toast(msg, 'warning'), [toast]);
  const info = useCallback((msg: string) => toast(msg, 'info'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ─── Toast Container ───────────────────────────────────────────────────── */
const VARIANT_CONFIG: Record<ToastVariant, { icon: React.ReactNode; bg: string; border: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle size={16} />,
    bg: 'rgba(17, 24, 39, 0.96)',
    border: 'rgba(34, 197, 94, 0.4)',
    iconColor: '#22c55e',
  },
  error: {
    icon: <XCircle size={16} />,
    bg: 'rgba(17, 24, 39, 0.96)',
    border: 'rgba(239, 68, 68, 0.4)',
    iconColor: '#ef4444',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'rgba(17, 24, 39, 0.96)',
    border: 'rgba(245, 158, 11, 0.4)',
    iconColor: '#f59e0b',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'rgba(17, 24, 39, 0.96)',
    border: 'rgba(99, 102, 241, 0.4)',
    iconColor: '#6366f1',
  },
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const cfg = VARIANT_CONFIG[t.variant];
        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: cfg.bg,
              border: `1px solid ${cfg.border}`,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              minWidth: '280px',
              maxWidth: '420px',
              pointerEvents: 'auto',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            <span style={{ color: cfg.iconColor, flexShrink: 0 }}>{cfg.icon}</span>
            <span style={{
              fontSize: '13px', fontWeight: 500, color: '#f9fafb',
              fontFamily: 'var(--font-data)', flex: 1, lineHeight: '1.4',
            }}>
              {t.message}
            </span>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6b7280', padding: '2px', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
