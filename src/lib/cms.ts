import { getCollection } from 'astro:content';
import { normalizePdfUrl, resolveDocumentUrl } from './documents-url';
import { renderMarkdown } from './markdown';

function parseYearMonthFromId(id: string): { year: number | null; month: number | null } {
  const m = id.match(/(\d{4})-(\d{2})/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
  return { year: null, month: null };
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
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
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
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
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
