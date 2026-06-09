const PUBLIC_PATH_PREFIXES = [
  '/assets/',
  '/public/',
  '/documents/',
  '/favicon',
  '/manifest',
  '/robots.txt',
];

const isPublicPath = (pathname) => {
  if (pathname === '/login.html') return true;
  if (pathname === '/api/auth') return true;
  if (pathname === '/_vercel/insights/script.js') return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

const getCookieValue = (request, cookieName) => {
  const rawCookie = request.headers.get('cookie') || '';
  if (!rawCookie) return '';

  const cookieEntries = rawCookie.split(';');
  for (const entry of cookieEntries) {
    const [name, ...valueParts] = entry.trim().split('=');
    if (name === cookieName) {
      return valueParts.join('=');
    }
  }

  return '';
};

const hasValidAuthCookie = (request, authSecret) => {
  const authCookie = getCookieValue(request, 'auth-token');
  return !!authCookie && authCookie === authSecret;
};

export default function middleware(request) {
  const requestUrl = new URL(request.url);
  const { pathname, search } = requestUrl;
  const authSecret = process.env.AUTH_SECRET;

  if (isPublicPath(pathname)) {
    return fetch(request);
  }

  if (!authSecret) {
    return new Response(
      'Authentication is not configured. Please set AUTH_SECRET and SITE_PASSWORD in Vercel.',
      {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (hasValidAuthCookie(request, authSecret)) {
    return fetch(request);
  }

  const returnTo = `${pathname}${search || ''}`;
  const loginUrl = new URL('/login.html', request.url);
  loginUrl.searchParams.set('returnTo', returnTo);
  return Response.redirect(loginUrl.toString(), 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
