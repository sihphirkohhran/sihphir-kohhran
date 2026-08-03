import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Render CMS markdown (bold, italic, links, lists, headings, images) to HTML. */
export function renderMarkdown(text: string | undefined | null): string {
  if (!text?.trim()) return '';
  return marked.parse(text.trim()) as string;
}
