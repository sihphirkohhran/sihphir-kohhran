// Cloudflare Pages optional catch-all route: /api/admin and /api/admin/*.
import { getSession, type SessionEnv } from '../../_lib/session';

type R2Bucket = { put(key: string, value: ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };

type Env = SessionEnv & {
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
  R2_PUBLIC_URL?: string;
  MEDIA_BUCKET?: R2Bucket;
};

type Context = { request: Request; env: Env };

const areas: Record<string, string[]> = {
  pages: ['src/content/pages/'], gallery: ['src/content/gallery/'],
  documents: ['src/content/documents/'], committee: ['src/content/committee/'],
  pastors: ['src/content/pastoral/'], elders: ['src/content/elders/'],
  missionaries: ['src/content/missionaries/'], highlights: ['src/content/settings/highlights.json'],
  navigation: ['src/content/settings/navigation.json'],
  settings: ['src/content/settings/'], fellowship: ['src/content/fellowship/'],
  'hun-ruatna': ['src/content/notices/weekly/'],
  'thlabi-mawhphurtu': ['src/content/notices/monthly/'],
  media: ['public/images/', 'public/documents/'],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

class GitHubError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function configuration(env: Env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error('Admin API is not configured. Set GITHUB_TOKEN and GITHUB_REPOSITORY.');
  return { repo: env.GITHUB_REPOSITORY, branch: env.GITHUB_BRANCH || 'main', token: env.GITHUB_TOKEN };
}

function allowedPath(path: string) {
  return !path.includes('..') && Object.values(areas).flat().some(prefix => path === prefix || path.startsWith(prefix));
}

async function github(env: Env, path: string, init: RequestInit = {}) {
  const { repo, token } = configuration(env);
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init, cache: 'no-store', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'sihphir-admin', ...(init.headers || {}) },
  });
  if (!response.ok) {
    await response.text();
    throw new GitHubError(response.status, response.status === 409
      ? 'The content changed while you were editing.'
      : `GitHub request failed (${response.status}).`);
  }
  return response;
}

async function readFile(env: Env, path: string) {
  const { branch } = configuration(env);
  const response = await github(env, `/contents/${path}?ref=${encodeURIComponent(branch)}&cache_bust=${Date.now()}`);
  const data = await response.json() as { content: string; sha: string };
  return { sha: data.sha, content: atob(data.content.replace(/\n/g, '')) };
}

async function latestFileSha(env: Env, path: string) {
  try { return (await readFile(env, path)).sha; }
  catch (error) {
    if (error instanceof GitHubError && error.status === 404) return undefined;
    throw error;
  }
}

async function writeGitHubFile(env: Env, path: string, content: string, message: string) {
  const { branch } = configuration(env);
  for (let attempt = 0; attempt < 2; attempt++) {
    const sha = await latestFileSha(env, path);
    try {
      await github(env, `/contents/${path}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, content, branch, sha }),
      });
      return { retried: attempt > 0 };
    } catch (error) {
      if (!(error instanceof GitHubError && error.status === 409 && attempt === 0)) {
        if (error instanceof GitHubError && error.status === 409) {
          throw new GitHubError(409, 'The gallery changed while you were editing. The save was retried with the latest version but could not be completed. Your edits are still in the editor; please try saving again.');
        }
        throw error;
      }
    }
  }
  throw new GitHubError(409, 'The gallery could not be saved. Your edits are still in the editor; please try again.');
}

async function writeFile(env: Env, path: string, content: string, message: string) {
  return writeGitHubFile(env, path, btoa(unescape(encodeURIComponent(content))), message);
}

async function writeBase64File(env: Env, path: string, base64: string, message: string) {
  return writeGitHubFile(env, path, base64, message);
}

async function removeFile(env: Env, path: string, message: string) {
  const { branch } = configuration(env);
  const { sha } = await readFile(env, path);
  await github(env, `/contents/${path}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, sha, branch }) });
}

async function readBase64File(env: Env, path: string) {
  const { branch } = configuration(env);
  const response = await github(env, `/contents/${path}?ref=${encodeURIComponent(branch)}`);
  const data = await response.json() as { content: string; sha: string };
  return { sha: data.sha, content: data.content.replace(/\n/g, '') };
}

function filename(value: string) { return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload'; }

export const onRequestGet = async ({ request, env }: Context) => {
  try {
    if (!(await getSession(request, env))) return json({ error: 'Authentication is required.' }, 401);
    const url = new URL(request.url); const area = url.searchParams.get('area'); const path = url.searchParams.get('path');
    if (path) {
      if (!allowedPath(path)) return json({ error: 'Invalid content path.' }, 400);
      return json({ path, ...(await readFile(env, path)) });
    }
    if (!area || !areas[area]) return json({ areas: Object.keys(areas) });
    const { branch } = configuration(env);
    const response = await github(env, `/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    const tree = await response.json() as { tree: Array<{ path: string; type: string; size?: number }> };
    const prefixes = areas[area];
    const items = tree.tree.filter(item => item.type === 'blob' && prefixes.some(prefix => item.path === prefix || item.path.startsWith(prefix))).map(item => {
      const timestamp = item.path.match(/\/(\d{13})-/)?.[1];
      return { path: item.path, label: item.path.split('/').pop(), type: item.path.split('.').pop(), size: item.size || 0, uploadedAt: timestamp ? new Date(Number(timestamp)).toISOString() : null, kind: item.path.startsWith('public/images/') ? 'image' : 'document' };
    });
    return json({ area, items });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unable to load content.' }, error instanceof GitHubError ? error.status : 500); }
};

export const onRequestPut = async ({ request, env }: Context) => {
  try {
    if (!(await getSession(request, env))) return json({ error: 'Authentication is required.' }, 401);
    const { path, content, message, updates } = await request.json() as { path?: string; content?: string; message?: string; updates?: Array<{ path?: string; content?: string; message?: string }> };
    if (updates) {
      if (!Array.isArray(updates) || !updates.length || updates.some(update => !update.path || typeof update.content !== 'string' || update.content.length > 1_000_000 || !allowedPath(update.path))) return json({ error: 'Invalid content updates.' }, 400);
      let retried = false;
      for (const update of updates) {
        const result = await writeFile(env, update.path!, update.content!, update.message || `admin: update ${update.path}`);
        retried ||= result.retried;
      }
      return json({ ok: true, retried, message: retried ? 'The content changed while you were editing. The save was completed with the latest version.' : undefined });
    }
    if (!path || typeof content !== 'string' || content.length > 1_000_000 || !allowedPath(path)) return json({ error: 'Invalid content update.' }, 400);
    const result = await writeFile(env, path, content, message || `admin: update ${path}`);
    return json({ ok: true, ...result, message: result.retried ? 'The gallery changed while you were editing. The save was completed with the latest version.' : undefined });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unable to save content.' }, error instanceof GitHubError ? error.status : 500); }
};

export const onRequestPost = async ({ request, env }: Context) => {
  try {
    if (!(await getSession(request, env))) return json({ error: 'Authentication is required.' }, 401);
    const { filename: original, data, kind, action, path, folder, paths } = await request.json() as { filename?: string; data?: string; kind?: 'image' | 'document'; action?: 'rename' | 'move' | 'replace' | 'delete'; path?: string; folder?: string; paths?: string[] };
    if (action === 'delete') {
      if (!paths?.length || paths.some(item => !allowedPath(item) || !item.startsWith('public/'))) return json({ error: 'Invalid media delete request.' }, 400);
      await Promise.all(paths.map(item => removeFile(env, item, `admin: remove ${item}`)));
      return json({ ok: true });
    }
    if (action === 'rename' || action === 'move') {
      if (!path || !allowedPath(path) || !path.startsWith('public/') || !original) return json({ error: 'Invalid media move request.' }, 400);
      const base = path.startsWith('public/images/') ? 'public/images/' : 'public/documents/';
      const virtualFolder = (folder || '').split('/').map(filename).filter(Boolean).join('/');
      const target = `${base}${virtualFolder ? `${virtualFolder}/` : ''}${filename(original)}`;
      if (target === path) return json({ ok: true, path, url: `/${path.replace(/^public\//, '')}` });
      const source = await readBase64File(env, path);
      await writeBase64File(env, target, source.content, `admin: ${action} ${path}`);
      await removeFile(env, path, `admin: ${action} ${path}`);
      return json({ ok: true, path: target, url: `/${target.replace(/^public\//, '')}` });
    }
    if (action === 'replace') {
      if (!path || !allowedPath(path) || !path.startsWith('public/') || !data?.startsWith('data:')) return json({ error: 'Invalid media replacement.' }, 400);
      await writeBase64File(env, path, data.split(',').pop() || '', `admin: replace ${path}`);
      return json({ ok: true, path, url: `/${path.replace(/^public\//, '')}` });
    }
    if (!original || !data || !['image', 'document'].includes(kind || '')) return json({ error: 'Invalid upload.' }, 400);
    if (!data.startsWith('data:') || data.length > 15_000_000) return json({ error: 'The upload is invalid or exceeds the 10 MB limit.' }, 400);
    const safe = filename(original); const key = `${kind === 'image' ? 'images' : 'documents'}/${Date.now()}-${safe}`;
    const bytes = Uint8Array.from(atob(data.split(',').pop() || ''), char => char.charCodeAt(0));
    if (env.MEDIA_BUCKET && env.R2_PUBLIC_URL) {
      await env.MEDIA_BUCKET.put(key, bytes, { httpMetadata: { contentType: kind === 'image' ? 'image/*' : 'application/pdf' } });
      return json({ url: `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`, storage: 'r2' });
    }
    const repositoryPath = `public/${key}`;
    await writeBase64File(env, repositoryPath, data.split(',').pop() || '', `admin: upload ${safe}`);
    return json({ url: `/${key}`, storage: 'github' });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unable to upload file.' }, 500); }
};

export const onRequestDelete = async ({ request, env }: Context) => {
  try {
    if (!(await getSession(request, env))) return json({ error: 'Authentication is required.' }, 401);
    const { path } = await request.json() as { path?: string };
    if (!path || !allowedPath(path)) return json({ error: 'Invalid delete request.' }, 400);
    await removeFile(env, path, `admin: remove ${path}`);
    return json({ ok: true });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unable to delete file.' }, 500); }
};
