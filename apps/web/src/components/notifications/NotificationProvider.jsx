"use client";
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import AiCooldownToast from '../AiCooldownToast';
const NotificationsContext = createContext(null);
export function useNotifications() {
    const ctx = useContext(NotificationsContext);
    if (!ctx)
        throw new Error('useNotifications must be used inside NotificationProvider');
    return ctx;
}
export default function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const MAX_VISIBLE = 3;
    const showNotification = useCallback((n) => {
        const id = n.id || `notif_${Math.random().toString(36).slice(2, 9)}`;
        setNotifications((s) => {
            // prevent duplicates with same id
            if (s.find((x) => x.id === id))
                return s;
            const next = [...s, { id, message: n.message, autoHideMs: n.autoHideMs || 3000, testId: n.testId, variant: n.variant || 'info', action: n.action }];
            // cap visible notifications to MAX_VISIBLE
            if (next.length <= MAX_VISIBLE)
                return next;
            // drop the oldest (FIFO)
            return next.slice(next.length - MAX_VISIBLE);
        });
        return id;
    }, []);
    const hideNotification = useCallback((id) => setNotifications((s) => s.filter((x) => x.id !== id)), []);
    const dismissLastNotification = useCallback(() => setNotifications((s) => {
        if (s.length === 0)
            return s;
        const next = s.slice(0, s.length - 1); // drop the most recent
        return next;
    }), []);
    const ctx = useMemo(() => ({ showNotification, hideNotification }), [showNotification, hideNotification]);
    useEffect(() => {
        // listen for Escape key globally and dismiss the most recent notification
        const onKey = (e) => { if (e.key === 'Escape')
            dismissLastNotification(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dismissLastNotification]);
    return (<NotificationsContext.Provider value={ctx}>
      {children}
      {/* Notification container - top-right stacked toasts */}
      <div aria-live="polite" aria-atomic="true" className="fixed inset-0 pointer-events-none z-50 flex items-start justify-end p-6">
          <div className="w-full max-w-sm space-y-2 pointer-events-auto">
            {notifications.map((n) => (<div key={n.id} className="animate-fade-in-down">
                {/* ensure each toast has predictable test-id when provided */}
                <AiCooldownToast show={true} message={n.message} autoHideMs={n.autoHideMs} variant={n.variant || 'info'} onClose={() => hideNotification(n.id)} action={n.action}/>
              </div>))}
          </div>
      </div>
      {/* provider-level key handling is implemented in React useEffect (Escape -> dismiss last) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .animate-fade-in-down { animation: fadeInDown 260ms ease-out; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </NotificationsContext.Provider>);
}
