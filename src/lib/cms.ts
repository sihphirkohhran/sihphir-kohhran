type MarkdownModule = {
  frontmatter: Record<string, unknown>;
  file?: string;
  rawContent?: () => string;
};

type Frontmatter = Record<string, unknown>;

function parseMarkdownModule(mod: MarkdownModule) {
  const { frontmatter, file } = mod;
  const id = file?.split('/').pop()?.replace(/\.md$/, '') ?? '';
  const raw = mod.rawContent?.() ?? '';
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
  return { id, ...frontmatter, body };
}

const weeklyModules = import.meta.glob<MarkdownModule>(
  '../content/notices/weekly/*.md',
  { eager: true },
);

const monthlyModules = import.meta.glob<MarkdownModule>(
  '../content/notices/monthly/*.md',
  { eager: true },
);

const announcementModules = import.meta.glob<MarkdownModule>(
  '../content/notices/announcements/*.md',
  { eager: true },
);

const ktpInlengModules = import.meta.glob<MarkdownModule>(
  '../content/documents/ktp-inleng/*.md',
  { eager: true },
);

const otherDocModules = import.meta.glob<MarkdownModule>(
  '../content/documents/other/*.md',
  { eager: true },
);

export function getWeeklySchedules() {
  return Object.values(weeklyModules)
    .map(parseMarkdownModule)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

export function getMonthlyDuties() {
  return Object.values(monthlyModules)
    .map(parseMarkdownModule)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

export function getAnnouncements() {
  return Object.values(announcementModules)
    .map(parseMarkdownModule)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function getKtpInlengDocs() {
  return Object.values(ktpInlengModules)
    .map(parseMarkdownModule)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

export function getOtherDocuments() {
  return Object.values(otherDocModules)
    .map(parseMarkdownModule)
    .sort((a, b) => String(b.date ?? b.id).localeCompare(String(a.date ?? a.id)));
}

/** Convert markdown history_full to HTML paragraphs (CMS stores plain markdown text). */
export function fellowshipHistoryToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => `<p class='mb-3'>${p.trim()}</p>`)
    .join('');
}
