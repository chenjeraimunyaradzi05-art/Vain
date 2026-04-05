"use client";
import { useEffect, useState, useRef } from 'react';
const STORAGE_PREFIX = 'ngurra_ai_cooldown';
function keyFor(endpoint, userId) {
    return `${STORAGE_PREFIX}:${endpoint}:${userId || 'anon'}`;
}
export default function useAiCooldown(endpoint = 'concierge', userId) {
    const key = keyFor(endpoint, userId);
    // local storage stores a JSON blob { expiresAt, startedAt, durationMs }
    const [meta, setMeta] = useState(() => {
        try {
            const v = localStorage.getItem(key);
            if (!v)
                return { expiresAt: null, startedAt: null, durationMs: null };
            const parsed = JSON.parse(v || '{}');
            return { expiresAt: parsed.expiresAt || null, startedAt: parsed.startedAt || null, durationMs: parsed.durationMs || null };
        }
        catch {
            return { expiresAt: null, startedAt: null, durationMs: null };
        }
    });
    const [remainingMs, setRemainingMs] = useState(() => Math.max(0, (meta.expiresAt || 0) - Date.now()));
    const [justEnded, setJustEnded] = useState(false);
    const prevRemainingRef = useRef(remainingMs);
    const timerRef = useRef(null);
    useEffect(() => {
        // initialise remaining
        setRemainingMs(Math.max(0, (meta.expiresAt || 0) - Date.now()));
        if (timerRef.current)
            window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            const now = Date.now();
            const r = Math.max(0, (meta.expiresAt || 0) - now);
            setRemainingMs(r);
            if (r <= 0 && timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }, 300);
        return () => { if (timerRef.current)
            window.clearInterval(timerRef.current); };
    }, [meta, key]);
    const startCooldown = (ms) => {
        const now = Date.now();
        const until = now + ms;
        const newMeta = { expiresAt: until, startedAt: now, durationMs: ms };
        setMeta(newMeta);
        setRemainingMs(ms);
        try {
            localStorage.setItem(key, JSON.stringify(newMeta));
        }
        catch { }
        if (timerRef.current)
            window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            const now = Date.now();
            const r = Math.max(0, until - now);
            setRemainingMs(r);
            if (r <= 0 && timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }, 300);
    };
    const clearCooldown = () => {
        setMeta({ expiresAt: null, startedAt: null, durationMs: null });
        setRemainingMs(0);
        try {
            localStorage.removeItem(key);
        }
        catch { }
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        // clear just-ended state
        setJustEnded(false);
    };
    const isCooling = (meta.expiresAt || 0) > Date.now();
    const totalMs = meta.durationMs || 0;
    const elapsedMs = totalMs ? Math.max(0, totalMs - remainingMs) : 0;
    const percent = totalMs ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 0;
    // detect transition from cooling to finished
    useEffect(() => {
        const prev = prevRemainingRef.current;
        if (prev > 0 && remainingMs === 0 && isCooling === false && meta.expiresAt) {
            // mark just ended for a short period to allow announcements and visual toast
            setJustEnded(true);
            // keep it visible longer so visual toasts are noticeable (3s)
            const t = setTimeout(() => setJustEnded(false), 3000);
            return () => clearTimeout(t);
        }
        prevRemainingRef.current = remainingMs;
        return undefined;
    }, [remainingMs, isCooling, meta.expiresAt]);
    return { isCooling, remainingMs, startCooldown, clearCooldown, totalMs, percent, justEnded };
}
