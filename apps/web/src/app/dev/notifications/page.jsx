"use client";
import { useCallback } from 'react';
import { useNotifications } from '../../../components/notifications/NotificationProvider';
export default function NotificationsDevPage() {
    const { showNotification } = useNotifications();
    const show = useCallback((variant) => {
        const id = Math.random().toString(36).slice(2, 8);
        showNotification({ id: `dev-${variant}-${id}`, message: `Demo ${variant} notification — ${id}`, variant, autoHideMs: 5000 });
    }, [showNotification]);
    const flood = useCallback(() => {
        for (let i = 0; i < 6; i++) {
            showNotification({ id: `dev-flood-${i}`, message: `Flood message ${i + 1}`, variant: 'info', autoHideMs: 6000 });
        }
    }, [showNotification]);
    const showWithAction = useCallback((variant) => {
        const id = Math.random().toString(36).slice(2, 8);
        let setResult = null;
        const placeholderId = `dev-action-result`;
        // show a notification with an action that will update the DOM by dispatching an event
        showNotification({ id: `dev-action-${variant}-${id}`, message: `Actionable ${variant} — ${id}`, variant, autoHideMs: 10000, action: { label: 'Do it', onAction: () => { window.dispatchEvent(new CustomEvent('dev:action', { detail: `${variant}-done` })); } } });
    }, [showNotification]);
    return (<div className="p-12 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Dev page — Notification snapshots</h2>
      <p className="mb-4 text-sm text-slate-300">Use these buttons to trigger the global NotificationProvider to show visual toasts (used by E2E snapshot tests).</p>

      <div className="flex gap-2 items-center mb-4">
        <button onClick={() => show('info')} className="px-3 py-2 rounded bg-indigo-600 text-white">Show info</button>
        <button onClick={() => show('success')} className="px-3 py-2 rounded bg-green-600 text-white">Show success</button>
        <button onClick={() => show('error')} className="px-3 py-2 rounded bg-red-600 text-white">Show error</button>
        <button onClick={flood} className="px-3 py-2 rounded border border-slate-700 hover:bg-slate-900">Flood toasts (6)</button>
        <button onClick={() => showWithAction('info')} className="px-3 py-2 rounded border border-slate-700 hover:bg-slate-900">Show actionable</button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded p-6">
        <p className="text-sm">This page exists only for local/dev testing of notifications and visual snapshots.</p>
        <div id="dev-action-result" data-testid="dev-action-result" className="mt-4 text-sm text-slate-200"/>
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('dev:action', function(e){
            const el = document.getElementById('dev-action-result');
            if (el) el.textContent = 'actioned:' + (e.detail || 'ok');
          });
        ` }}/>
      </div>
    </div>);
}
