import { timingSafeEqual } from 'node:crypto';

const safeCompare = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const getCookieValue = (cookieHeader, key) => {
  if (!cookieHeader) return null;
  const cookies = String(cookieHeader).split(';');
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split('=');
    if (name === key) return decodeURIComponent(parts.join('='));
  }
  return null;
};

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authSecret = process.env.AUTH_SECRET;
  const sitePassword = process.env.SITE_PASSWORD;

  if (!authSecret || !sitePassword) {
    return res.status(503).json({
      authenticated: false,
      error: 'Authentication is not configured. Missing SITE_PASSWORD or AUTH_SECRET.',
    });
  }

  const authToken = getCookieValue(req.headers.cookie, 'auth-token');
  const authenticated = safeCompare(authToken, authSecret);
  return res.status(200).json({ authenticated });
}
