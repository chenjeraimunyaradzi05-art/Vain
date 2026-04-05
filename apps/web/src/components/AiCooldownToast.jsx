"use client";
import { useEffect, useState } from 'react';
export default function AiCooldownToast({ message = 'AI suggestions are ready — try again for fresh tips.', show, onClose, autoHideMs = 3000, variant = 'info', action = null }) {
    const [visible, setVisible] = useState(show);
    const [mounted, setMounted] = useState(show);
    useEffect(() => {
        if (show)
            setMounted(true);
        setVisible(show);
    }, [show]);
    useEffect(() => {
        if (!visible || !autoHideMs)
            return;
        const t = setTimeout(() => setVisible(false), autoHideMs);
        return () => clearTimeout(t);
    }, [visible, autoHideMs]);
    // when visible becomes false, wait a short exit animation before unmounting and calling onClose
    useEffect(() => {
        if (visible)
            return undefined;
        const t = setTimeout(() => {
            setMounted(false);
            onClose?.();
        }, 220); // match small animation duration
        return () => clearTimeout(t);
    }, [visible, onClose]);
    function handleClose() {
        setVisible(false);
        onClose?.();
    }
    function handleAction() {
        try {
            action?.onAction();
        }
        catch { }
        // optionally close the toast after an action
        setVisible(false);
        onClose?.();
    }
    if (!mounted)
        return null;
    const base = 'mt-2 p-2 rounded text-sm flex items-start justify-between gap-3 transition-transform transition-opacity duration-180';
    const styleMap = {
        info: 'bg-indigo-500/15 border border-indigo-400/30 text-indigo-100',
        success: 'bg-green-500/15 border border-green-400/30 text-green-100',
        error: 'bg-red-500/15 border border-red-400/30 text-red-100',
    };
    const ringMap = {
        info: 'focus-visible:ring-indigo-500',
        success: 'focus-visible:ring-green-500',
        error: 'focus-visible:ring-red-500',
    };
    // make toast keyboard-focusable and show a subtle ring when focused for actor-friendly visuals
    const cls = `${base} ${styleMap[variant]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringMap[variant]}`;
    const iconMap = {
        info: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6a1 1 0 110 2 1 1 0 010-2zm0 4a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z',
        success: 'M10 15.172l-3.95-3.95a1 1 0 10-1.414 1.414l4.657 4.657a1 1 0 001.414 0L19.364 8.83a1 1 0 00-1.414-1.414L10 15.172z',
        error: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM13 17h-2v-2h2v2zm0-4h-2V7h2v6z',
    };
    const btnHoverMap = {
        info: 'hover:bg-indigo-500/20 focus-visible:ring-indigo-500',
        success: 'hover:bg-green-500/20 focus-visible:ring-green-500',
        error: 'hover:bg-red-500/20 focus-visible:ring-red-500',
    };
    const btnClass = `px-2 py-1 rounded border border-transparent text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${btnHoverMap[variant]}`;
    return (<div data-testid="ai-cooldown-toast" role="status" aria-live="polite" aria-atomic="true" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') {
        handleClose();
    } }} className={cls}>
      <div className="flex items-start gap-3 flex-1">
                <div data-testid="ai-cooldown-toast-icon" aria-hidden="true" className={`shrink-0 mt-0.5 w-5 h-5 ${variant === 'info' ? 'text-indigo-200' : variant === 'success' ? 'text-green-200' : 'text-red-200'}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d={iconMap[variant]}/>
          </svg>
        </div>
        <div className="flex-1">{message}</div>
      </div>
      <div className="flex gap-2 items-center">
                {action && (<button data-testid="ai-cooldown-action" onClick={handleAction} className={`px-3 py-1 rounded text-xs font-medium border ${variant === 'info' ? 'bg-indigo-500/20 text-indigo-100 border-indigo-400/30' : variant === 'success' ? 'bg-green-500/20 text-green-100 border-green-400/30' : 'bg-red-500/20 text-red-100 border-red-400/30'}`}>{action.label}</button>)}
        <button aria-label="Dismiss" title="Dismiss" onClick={handleClose} className={btnClass}>Dismiss</button>
      </div>
    </div>);
}
