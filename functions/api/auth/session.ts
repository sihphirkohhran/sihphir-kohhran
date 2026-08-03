import { getSession, type SessionEnv } from '../../_lib/session';

export const onRequestGet = async ({ request, env }: { request: Request; env: SessionEnv }) => {
  const session = await getSession(request, env);
  return session ? Response.json({ authenticated: true, username: session.username }, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
};
