import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4000;

/**
 * App-wide toast notifications. Wrap the app in <ToastProvider> and call
 * useToast() to push messages instead of the native window.alert().
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const show = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
        const id = ++idRef.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        if (duration > 0) {
            setTimeout(() => dismiss(id), duration);
        }
        return id;
    }, [dismiss]);

    const toast = {
        show,
        success: (message, duration) => show(message, 'success', duration),
        error: (message, duration) => show(message, 'error', duration),
        info: (message, duration) => show(message, 'info', duration),
        dismiss,
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-viewport" data-test-id="toast-viewport" aria-live="polite" aria-atomic="false">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast toast-${t.type}`}
                        role="status"
                        data-test-id={`toast-${t.type}`}
                        onClick={() => dismiss(t.id)}
                    >
                        <span className="toast-message">{t.message}</span>
                        <button
                            type="button"
                            className="toast-close"
                            aria-label="Dismiss notification"
                            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return ctx;
};

export default ToastProvider;
