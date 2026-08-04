import { getCollection } from 'astro:content';
import { normalizePdfUrl, resolveDocumentUrl } from './documents-url';
import { renderMarkdown } from './markdown';

function parseYearMonthFromId(id: string): { year: number | null; month: number | null } {
  const m = id.match(/(\d{4})-(\d{2})/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
  return { year: null, month: null };
}

function weeklyStartTimestamp(value: unknown, id: string): number {
  const date = String(value ?? '').trim();
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const legacyMatch = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const normalized = isoMatch
    ? date
    : legacyMatch
      ? `${legacyMatch[3]}-${legacyMatch[2].padStart(2, '0')}-${legacyMatch[1].padStart(2, '0')}`
      : id;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function weeklyStatusPriority(status: string | undefined): number {
  if (status === 'current') return 0;
  if (status === 'archived') return 2;
  return 1;
}

function monthlyTimestamp(value: unknown, id: string): number {
  const month = String(value ?? '').trim();
  const match = month.match(/^(\d{4})-(\d{2})$/);
  const normalized = match ? `${month}-01` : id;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function getWeeklySchedules() {
  const entries = await getCollection('notices');
  return entries
    .filter((e) => e.id.startsWith('weekly/'))
    .map((e) => ({
      id: e.id.replace(/^weekly\//, ''),
      ...e.data,
      body: e.body,
    }))
    .sort((a, b) => {
      const statusDifference = weeklyStatusPriority(a.status) - weeklyStatusPriority(b.status);
      if (statusDifference) return statusDifference;
      return weeklyStartTimestamp(b.week_start, b.id) - weeklyStartTimestamp(a.week_start, a.id);
    });
}

export async function getMonthlyDuties() {
  const entries = await getCollection('notices');
  return entries
    .filter((e) => e.id.startsWith('monthly/'))
    .map((e) => ({
      id: e.id.replace(/^monthly\//, ''),
      ...e.data,
      body: e.body,
    }))
    .sort((a, b) => {
      const statusDifference = weeklyStatusPriority(a.status) - weeklyStatusPriority(b.status);
      if (statusDifference) return statusDifference;
      return monthlyTimestamp(b.month, b.id) - monthlyTimestamp(a.month, a.id);
    });
}

export async function getAnnouncements() {
  const entries = await getCollection('notices');
  return entries
    .filter((e) => e.id.startsWith('announcements/'))
    .map((e) => ({
      id: e.id.replace(/^announcements\//, ''),
      ...e.data,
      body: e.body,
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export type KtpInlengDoc = {
  id: string;
  year: number | null;
  month: number | null;
  name: string;
  date?: string;
  pdf_url: string;
  pinned?: boolean;
  body: string;
};

export async function getKtpInlengDocs(): Promise<KtpInlengDoc[]> {
  const entries = await getCollection('documents');
  return entries
    .filter((e) => e.id.startsWith('ktp-inleng/'))
    .map((e) => {
      const id = e.id.replace(/^ktp-inleng\//, '');
      const fromId = parseYearMonthFromId(id);
      const year =
        e.data.year ??
        fromId.year ??
        (parseInt(String(e.data.date ?? '').split(/[.\-/]/).pop() ?? '0', 10) || null);
      const month = e.data.month ?? fromId.month;
      return {
        id,
        year,
        month,
        name: e.data.name,
        date: e.data.date,
        pdf_url: resolveDocumentUrl(e.data.pdf_url, e.data.pdf_external),
        pinned: e.data.pinned,
        body: e.body,
      };
    })
    .filter((d) => Boolean(d.pdf_url))
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

export async function getOtherDocuments() {
  const entries = await getCollection('documents');
  return entries
    .filter((e) => e.id.startsWith('other/'))
    .map((e) => ({
      id: e.id.replace(/^other\//, ''),
      year: e.data.year ?? null,
      month: e.data.month ?? null,
      pinned: e.data.pinned,
      ...e.data,
      pdf_url: resolveDocumentUrl(e.data.pdf_url, e.data.pdf_external),
      body: e.body,
    }))
    .filter((d) => Boolean(d.pdf_url))
    .sort((a, b) => String(b.date ?? b.id).localeCompare(String(a.date ?? a.id)));
}

/** @deprecated Use renderMarkdown from ./markdown — kept as alias for fellowship pages */
export function fellowshipHistoryToHtml(text: string): string {
  return renderMarkdown(text);
}
