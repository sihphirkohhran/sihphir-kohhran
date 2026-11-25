import { marked } from 'marked';
import { parseFragment, serialize } from 'parse5';

marked.setOptions({ gfm: true, breaks: true });

/** Render CMS Markdown to HTML. Kept unchanged for existing non-elder modules. */
export function renderMarkdown(text: string | undefined | null): string {
  if (!text?.trim()) return '';
  const html = marked.parse(text.trim()) as string;
  // HTML5 parsing repairs legacy paragraph/list nesting without changing stored records.
  // Only normalize content containing lists; existing sanitization remains downstream.
  return /<(?:ol|ul)\b/i.test(html) ? serialize(parseFragment(html)) : html;
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
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => {
      const point = parseInt(code, 16);
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/&#([0-9]+);?/g, (_, code) => {
      const point = Number(code);
      return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
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
    if (name !== 'a') {
      // Only a canonical alignment value may be emitted; never copy raw CSS.
      if (/^(p|div|h[1-6]|blockquote|li|ul|ol|pre)$/.test(name)) {
        const attrs = [...rawAttrs.matchAll(/(?:^|\s)([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)];
        const style = attrs.find(attr => attr[1].toLowerCase() === 'style');
        const legacy = attrs.find(attr => attr[1].toLowerCase() === 'align');
        const value = (style?.[2] ?? style?.[3] ?? style?.[4] ?? '').match(/^\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*$/i)?.[1]
          ?? (legacy?.[2] ?? legacy?.[3] ?? legacy?.[4] ?? '').match(/^(left|center|right|justify)$/i)?.[1];
        if (value) return `<${name} style="text-align: ${value.toLowerCase()};">`;
      }
      return `<${name}>`;
    }
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
