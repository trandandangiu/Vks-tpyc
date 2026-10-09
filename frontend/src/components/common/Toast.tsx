import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((message: string, title = 'Thành công') => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title = 'Lỗi') => showToast(message, 'error', title), [showToast]);
  const info = useCallback((message: string, title = 'Thông báo') => showToast(message, 'info', title), [showToast]);
  const warning = useCallback((message: string, title = 'Cảnh báo') => showToast(message, 'warning', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
              border: 'border-emerald-200',
              bg: 'bg-emerald-50/95',
              titleColor: 'text-emerald-900',
            },
            error: {
              icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
              border: 'border-rose-200',
              bg: 'bg-rose-50/95',
              titleColor: 'text-rose-900',
            },
            warning: {
              icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
              border: 'border-amber-200',
              bg: 'bg-amber-50/95',
              titleColor: 'text-amber-900',
            },
            info: {
              icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
              border: 'border-sky-200',
              bg: 'bg-sky-50/95',
              titleColor: 'text-sky-900',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${typeConfig.bg} ${typeConfig.border}`}
            >
              <div className="mt-0.5">{typeConfig.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && <div className={`text-sm font-semibold ${typeConfig.titleColor}`}>{toast.title}</div>}
                <div className="text-xs text-neutral-700 mt-0.5 leading-relaxed">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-neutral-600 p-1 -mr-1 rounded-lg transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
