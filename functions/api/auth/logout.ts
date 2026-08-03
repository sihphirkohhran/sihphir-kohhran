import { clearSessionCookie } from '../../_lib/session';

export const onRequestPost = async () => Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } });
