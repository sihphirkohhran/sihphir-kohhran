import type { CollectionEntry } from 'astro:content';

export type NoticeRecord = ReturnType<typeof normalizeNotice>;

const dateValue = (value: string) => {
  const parts=value.split(/[.\/-]/).map(Number);
  return parts.length===3 && value.includes('.') ? new Date(parts[2],parts[1]-1,parts[0]).getTime() : Date.parse(value)||0;
};

export function normalizeNotice(entry: CollectionEntry<'notices'>) {
  const data=entry.data as any;
  const publishDate=String(data.publish_date||data.date||entry.id.slice(0,10));
  const normalizedSlug=(entry.slug||entry.id).replace(/^announcements\//,'').replace(/^\d{4}-\d{2}-\d{2}-/,'').replace(/\.md$/,'');
  return {
    id: entry.id.replace(/^announcements\//,'').replace(/\.md$/,''),
    slug: normalizedSlug,
    title:data.title||'Untitled Notice', summary:data.summary||data.short_summary||'', category:data.category||'General',
    published:data.published!==false&&data.status!=='draft'&&data.status!=='archived', pinned:data.pinned===true, publishDate,
    expiryDate:String(data.expiry_date||''), order:Number(data.display_order||0), featuredImage:data.featured_image||data.cover_image||'',
    attachments:Array.isArray(data.attachments)?data.attachments:(data.pdf_url?[{title:'Attachment',url:data.pdf_url}]:[]), entry,
  };
}

export function noticeIsActive(notice: NoticeRecord, now=Date.now()) { return notice.published && (!notice.expiryDate || dateValue(notice.expiryDate)+86_400_000>now); }
export function sortNotices(a: NoticeRecord,b: NoticeRecord,oldest=false) { const pinned=Number(b.pinned)-Number(a.pinned);if(pinned)return pinned;const dates=dateValue(b.publishDate)-dateValue(a.publishDate);return oldest?-dates:dates||a.order-b.order; }
