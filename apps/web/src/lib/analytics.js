import { API_BASE } from '@/lib/apiBase';
import { getAccessToken } from '@/lib/tokenStore';

function isAnalyticsEnabled() {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('analytics_consent') === 'true';
  } catch {
    return false;
  }
}

export async function trackEvent({ eventType, metadata = {} } = {}) {
  try {
    if (!eventType) return;
    if (!isAnalyticsEnabled()) return;
    const token = getAccessToken();
    await fetch(`${API_BASE}/analytics/employer/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ eventType, metadata }),
    });
  } catch (err) {
    // swallow errors - analytics should not block UX
     
    console.warn('trackEvent failed', err);
  }
}
