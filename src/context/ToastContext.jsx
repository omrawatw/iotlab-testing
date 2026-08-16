import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const toast = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={styles.stack} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} style={{ ...styles.toast, ...styles[t.type] }} onClick={() => dismiss(t.id)}>
            <span className="led" style={{ background: dotColor(t.type), boxShadow: `0 0 8px 1px ${dotColor(t.type)}` }} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function dotColor(type) {
  if (type === 'error') return '#f2685f';
  if (type === 'info') return '#52e5c9';
  return '#4ade80';
}

const styles = {
  stack: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    zIndex: 2000,
    maxWidth: 360,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#101828',
    border: '1px solid #2e4066',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    color: '#e8edf6',
    boxShadow: '0 12px 32px -12px rgba(0,0,0,0.6)',
    cursor: 'pointer',
  },
  success: {},
  error: { borderColor: '#f2685f66' },
  info: {},
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
