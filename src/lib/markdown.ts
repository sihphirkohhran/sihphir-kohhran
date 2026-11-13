import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/** Render CMS Markdown to HTML. Kept unchanged for existing non-elder modules. */
export function renderMarkdown(text: string | undefined | null): string {
  if (!text?.trim()) return '';
  return marked.parse(text.trim()) as string;
}

const allowedTags = new Set([
  'p', 'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 'del',
  'ul', 'ol', 'li', 'div', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'code', 'pre',
]);
const voidTags = new Set(['br', 'hr']);
const escapeAttribute = (value: string) => value
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

function safeHref(value: string): string {
  const href = value.trim().replace(/[\u0000-\u0020\u007f]/g, '');
  const decoded = href
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&colon;/gi, ':').replace(/&tab;/gi, '\t').replace(/&newline;/gi, '\n');
  const normalized = decoded.replace(/[\u0000-\u0020\u007f]/g, '');
  if (!href || href.startsWith('//') || href.startsWith('\\\\')) return '';
  if (/^(https?:|mailto:)/i.test(normalized)) return href;
  if (/^(?:[/?#]|\.\.?\/)/.test(normalized) && !normalized.startsWith('//')) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return '';
  return href;
}

/** Allow only semantic rich-text markup and safe links from elder biographies. */
export function sanitizeRichText(html: string): string {
  const withoutActiveContent = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|video|audio|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|video|audio|template)\b[^>]*\/?>/gi, '');

  return withoutActiveContent.replace(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi, (whole, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!allowedTags.has(name)) return '';
    const closing = /^<\//.test(whole);
    if (closing) return voidTags.has(name) ? '' : `</${name}>`;
    if (name !== 'a') return `<${name}>`;
    const hrefMatch = rawAttrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '');
    return href ? `<a href="${escapeAttribute(href)}" rel="nofollow noopener noreferrer">` : '<a>';
  });
}

/** Render Markdown or editor HTML through the elder biography allowlist. */
export function renderSafeRichText(text: string | undefined | null): string {
  if (!text?.trim()) return '';
  return sanitizeRichText(renderMarkdown(text));
}
