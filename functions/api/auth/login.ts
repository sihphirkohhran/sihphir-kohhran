import { authenticate, createSession, sessionCookie, type SessionEnv } from '../../_lib/session';

export const onRequestPost = async ({ request, env }: { request: Request; env: SessionEnv }) => {
  try {
    const { username, password } = await request.json() as { username?: string; password?: string };
    if (!username || !password || !(await authenticate(username, password, env))) return Response.json({ error: 'Invalid username or password.' }, { status: 401 });
    const session = await createSession(username, env);
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(session), 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Unable to sign in.' }, { status: 400 }); }
};
