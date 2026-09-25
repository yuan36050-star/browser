/**
 * Minimal CORS proxy for Cove — deploy as a Cloudflare Worker (free tier is fine).
 *
 *   1. dash.cloudflare.com → Workers & Pages → Create → "Hello World" worker
 *   2. Replace the code with this file, set ALLOWED_ORIGIN below, Deploy.
 *   3. In Cove: Settings › Network › CORS proxy = https://<your-worker>.workers.dev/?url={url}
 *      then turn on "Use CORS proxy" for the providers / connectors that need it.
 *
 * The proxy sees every request it forwards (including API keys), so only use one you control.
 */
const ALLOWED_ORIGIN = 'https://YOUR-GITHUB-USER.github.io'; // your Cove origin, or '*' (not recommended)

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allow = ALLOWED_ORIGIN === '*' || origin === ALLOWED_ORIGIN ? origin || '*' : '';
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
      'Access-Control-Expose-Headers': '*',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allow) return new Response('Origin not allowed', { status: 403 });

    const target = new URL(request.url).searchParams.get('url');
    if (!target || !/^https?:\/\//.test(target)) return new Response('Missing ?url=', { status: 400, headers: cors });

    const headers = new Headers(request.headers);
    for (const h of ['Origin', 'Referer', 'Host', 'CF-Connecting-IP', 'X-Forwarded-For']) headers.delete(h);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });
    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  },
};
