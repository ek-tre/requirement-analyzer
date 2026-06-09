import { timingSafeEqual } from 'node:crypto';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

const safeCompare = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export default function handler(req, res) {
  // Keep auth responses non-cacheable.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const correctPassword = process.env.SITE_PASSWORD;
  const authToken = process.env.AUTH_SECRET;

  if (!correctPassword || !authToken) {
    return res.status(500).json({
      error: 'Authentication is not configured. Missing SITE_PASSWORD or AUTH_SECRET.',
    });
  }

  const { password } = req.body || {};
  if (!safeCompare(password, correctPassword)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const isHttps =
    req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const secureDirective = isHttps ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `auth-token=${authToken}; Path=/; HttpOnly${secureDirective}; SameSite=Strict; Max-Age=${THIRTY_DAYS_SECONDS}`
  );

  return res.status(200).json({ success: true });
}
