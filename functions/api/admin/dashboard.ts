import { getSession, type SessionEnv } from '../../_lib/session';

type Env = SessionEnv & {
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
};

type Context = { request: Request; env: Env };

type DashboardMetadata = {
  latestCommit: { hash: string; message: string; date: string } | null;
  repository: { name: string; branch: string; connected: boolean };
  api: { status: 'ok' };
  storage: { bytes: number; source: 'repository-media' } | null;
  counts: Record<'pages' | 'gallery' | 'documents' | 'pastors' | 'elders' | 'missionaries' | 'fellowship' | 'navigation', number>;
};

let cache: { expires: number; key: string; value: DashboardMetadata } | undefined;
const CACHE_MS = 30_000;

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { 'cache-control': 'no-store' },
});

function configuration(env: Env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error('Admin API is not configured.');
  return { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY, branch: env.GITHUB_BRANCH || 'main' };
}

async function github(config: ReturnType<typeof configuration>, path: string) {
  const response = await fetch(`https://api.github.com/repos/${config.repo}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'sihphir-admin',
    },
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  return response;
}

function count(tree: Array<{ path: string; type: string }>, prefix: string) {
  return tree.filter(item => item.type === 'blob' && item.path.startsWith(prefix)).length;
}

function mediaBytes(tree: Array<{ path: string; type: string; size?: number }>) {
  return tree
    .filter(item => item.type === 'blob' && (item.path.startsWith('public/images/') || item.path.startsWith('public/documents/')))
    .reduce((total, item) => total + (item.size || 0), 0);
}

export const onRequestGet = async ({ request, env }: Context) => {
  if (!(await getSession(request, env))) return json({ error: 'Authentication is required.' }, 401);

  try {
    const config = configuration(env);
    const cacheKey = `${config.repo}:${config.branch}`;
    if (cache && cache.key === cacheKey && cache.expires > Date.now()) return json(cache.value);

    const [commitResponse, treeResponse, navigationResponse] = await Promise.all([
      github(config, `/commits/${encodeURIComponent(config.branch)}`),
      github(config, `/git/trees/${encodeURIComponent(config.branch)}?recursive=1`),
      github(config, `/contents/src/content/settings/navigation.json?ref=${encodeURIComponent(config.branch)}`),
    ]);
    const commit = await commitResponse.json() as { sha: string; commit: { message: string; author?: { date?: string } } };
    const treePayload = await treeResponse.json() as { tree: Array<{ path: string; type: string; size?: number }> };
    const navigationPayload = await navigationResponse.json() as { content: string };
    let navigationCount = 0;
    try {
      const navigation = JSON.parse(atob(navigationPayload.content.replace(/\n/g, '')));
      navigationCount = Array.isArray(navigation) ? navigation.length : Array.isArray(navigation.items) ? navigation.items.length : 0;
    } catch { /* Keep a safe zero value for malformed navigation content. */ }

    const tree = treePayload.tree;
    const value: DashboardMetadata = {
      latestCommit: {
        hash: commit.sha,
        message: commit.commit.message.split('\n')[0] || 'No commit message',
        date: commit.commit.author?.date || '',
      },
      repository: { name: config.repo, branch: config.branch, connected: true },
      api: { status: 'ok' },
      storage: { bytes: mediaBytes(tree), source: 'repository-media' },
      counts: {
        pages: count(tree, 'src/content/pages/'),
        gallery: count(tree, 'src/content/gallery/'),
        documents: count(tree, 'src/content/documents/'),
        pastors: count(tree, 'src/content/pastoral/'),
        elders: count(tree, 'src/content/elders/'),
        missionaries: count(tree, 'src/content/missionaries/'),
        fellowship: count(tree, 'src/content/fellowship/'),
        navigation: navigationCount,
      },
    };
    cache = { key: cacheKey, value, expires: Date.now() + CACHE_MS };
    return json(value);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to load dashboard metadata.' }, 500);
  }
};
