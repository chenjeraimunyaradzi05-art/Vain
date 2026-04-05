import crypto from 'crypto';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const PROTOTYPE_AI_URL = process.env.PROTOTYPE_AI_URL || 'http://localhost:3000';

// Configurable limits
const DEFAULT_TIMEOUT = Number(process.env.AI_REQUEST_TIMEOUT_MS || 5000);
const CACHE_TTL = Number(process.env.AI_CACHE_TTL_MS || 1000 * 60 * 5); // 5 minutes
const RATE_LIMIT_CAP = Number(process.env.AI_RATE_LIMIT_CAP || 10); // tokens
const RATE_LIMIT_WINDOW = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60000); // refill window in ms

interface CacheEntry {
    text: string;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function makeKey(prompt: string) {
    return crypto.createHash('sha1').update(prompt).digest('hex');
}

export function getCached(prompt: string) {
    const key = makeKey(prompt);
    const e = cache.get(key);
    if (!e)
        return null;
    if (Date.now() > e.expiresAt) {
        cache.delete(key);
        return null;
    }
    return e.text;
}

export function setCached(prompt: string, text: string) {
    const key = makeKey(prompt);
    cache.set(key, { text, expiresAt: Date.now() + CACHE_TTL });
}

interface BucketState {
    tokens: number;
    lastRefill: number;
}

// Simple in-memory token bucket rate limiter keyed by userId or ip
const buckets = new Map<string, BucketState>();

function refillBucket(state: BucketState) {
    const now = Date.now();
    const elapsed = Math.max(0, now - state.lastRefill);
    const refill = Math.floor(elapsed / RATE_LIMIT_WINDOW) * RATE_LIMIT_CAP;
    if (refill > 0) {
        state.tokens = Math.min(RATE_LIMIT_CAP, state.tokens + refill);
        state.lastRefill = now;
    }
}

export function allowRequest(key: string) {
    let state = buckets.get(key);
    if (!state) {
        state = { tokens: RATE_LIMIT_CAP, lastRefill: Date.now() };
        buckets.set(key, state);
    }
    refillBucket(state);
    if (state.tokens <= 0)
        return false;
    state.tokens -= 1;
    return true;
}

// Basic prompt / response safety checks. These are intentionally conservative.
const SAFETY_TERMS = [
    'kill myself', 'suicide', 'self-harm', 'how to kill', 'how to shoot', 'how to hang myself', 'bomb', 'explode', 'make a weapon'
];

export function safetyCheckPrompt(prompt: string) {
    const p = String(prompt || '').toLowerCase();
    for (const t of SAFETY_TERMS)
        if (p.includes(t))
            return { safe: false, reason: 'self-harm' };
    return { safe: true };
}

export function safetySanitizeResponse(text: string) {
    const t = String(text || '').toLowerCase();
    for (const s of SAFETY_TERMS)
        if (t.includes(s))
            return { safe: false, sanitized: true, text: 'I’m sorry — I can’t provide instructions on that topic. If you or someone is in immediate danger, please contact emergency services or a local crisis line.' };
    return { safe: true, sanitized: false, text };
}

async function timeoutFetch(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...init, signal: ctrl.signal });
        return res;
    }
    finally {
        clearTimeout(id);
    }
}

async function callOpenAI(prompt: string) {
    if (!OPENAI_KEY)
        return null;
    const payload = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
    };
    try {
        const res = await timeoutFetch(OPENAI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` }, body: JSON.stringify(payload) });
        if (!res.ok) {
            return null;
        }
        const j: any = await res.json();
        const text = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || j?.text || null;
        return String(text || '').trim();
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn('OpenAI call failed', err);
        return null;
    }
}

async function callPrototype(prompt: string) {
    try {
        const res = await timeoutFetch(`${PROTOTYPE_AI_URL}/ai/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        if (!res.ok)
            return null;
        const j: any = await res.json();
        return j?.text || null;
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Prototype AI call failed', err);
        return null;
    }
}

export interface AskAIOptions {
    userId?: string;
    ip?: string;
    temperature?: number;
    maxTokens?: number;
    feature?: string;
}

export interface AskAIResult {
    ok: boolean;
    error?: string;
    status?: number;
    source?: string;
    text?: string;
}

export async function askAI(prompt: string, opts?: AskAIOptions): Promise<AskAIResult> {
    // Rate limit key: prefer userId else ip else generic
    const key = opts?.userId || opts?.ip || 'anon';
    if (!allowRequest(key)) {
        return { ok: false, error: 'rate_limited', status: 429 };
    }
    // Safety: If prompt clearly requests self-harm instructions, refuse early
    const safePrompt = safetyCheckPrompt(prompt);
    if (!safePrompt.safe) {
        return { ok: true, source: 'safety', text: 'I’m sorry — I can’t assist with that request. If you are in immediate danger, contact local emergency services or a crisis hotline.' };
    }
    // Cache key
    const cached = getCached(prompt);
    if (cached)
        return { ok: true, source: 'cache', text: cached };
    // Try production provider (OpenAI) → prototype → fallback
    let text: string | null = null;
    let source = 'fallback';
    if (OPENAI_KEY) {
        text = await callOpenAI(prompt);
        if (text) source = 'openai';
    }
    if (!text) {
        text = await callPrototype(prompt);
        if (text) source = 'prototype';
    }
    
    // Safety check response
    if (text) {
        const safeRes = safetySanitizeResponse(text);
        if (!safeRes.safe) {
            return { ok: true, source: 'safety', text: safeRes.text };
        }
        text = safeRes.text;
        setCached(prompt, text!);
    }

    return { ok: true, source, text: text || undefined };
}

export function _resetInMemoryState() {
    cache.clear();
    buckets.clear();
}
