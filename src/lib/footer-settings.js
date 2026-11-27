export const defaultGroups = [
  { heading: 'QUICK LINKS', links: [{label:'Home',url:'/'},{label:'Gallery',url:'/gallery/'},{label:'Documents',url:'/document/'},{label:'Contact',url:'/#contact'}] },
  { heading: 'KOHHRAN', links: [{label:'Pastor',url:'/bialtu-pastor/'},{label:'Committee',url:'/committee/'},{label:'Fellowship',url:'/fellowship/'},{label:'Kohhran Inchhiarna',url:'/statistics/'}] }
];
export const platforms = [['facebook_url','Facebook','f'],['instagram_url','Instagram','◎'],['youtube_url','YouTube','▶'],['twitter_url','X','X'],['telegram_url','Telegram','➤'],['whatsapp_channel_url','WhatsApp','☎']];
export function safeFooterLink(value) {
  const url=String(value??'').trim();
  if (/^\/(?![\/\\])/.test(url) && !/[\\\s]/.test(url)) return url;
  try { const parsed=new URL(url); return parsed.protocol==='https:' && !parsed.username && !parsed.password ? parsed.href : ''; } catch { return ''; }
}
export function socialUrl(value) {
  const url=safeFooterLink(value);
  if (!url.startsWith('https://')) return '';
  const parsed=new URL(url);
  return parsed.pathname.replace(/\//g,'') || parsed.searchParams.has('id') ? url : '';
}
export function resolveFooter(general={},legacy={}) {
  const stored=general.footer && typeof general.footer==='object'?general.footer:{};
  const affiliation=String(legacy.footer_description||'').split('·').map(s=>s.trim());
  return {
    name:stored.name??legacy.footer_heading??'Sihphir Kohhran',
    affiliation1:stored.affiliation1??(affiliation[0]||'MIZORAM PRESBYTERIAN KOHHRAN'),
    affiliation2:stored.affiliation2??(affiliation[1]||'PRESBYTERIAN CHURCH OF INDIA'),
    location:stored.location??general.address??'Sihphir, Mizoram',
    emblem:safeFooterLink(stored.emblem),
    groups:(Array.isArray(stored.groups)?stored.groups:defaultGroups).slice(0,2).map(group=>({heading:String(group.heading??''),links:(Array.isArray(group.links)?group.links:[]).filter(link=>link.enabled!==false&&String(link.label??'').trim()&&safeFooterLink(link.url)).map(link=>({label:link.label,url:safeFooterLink(link.url)}))})),
    socials:platforms.filter(([key])=>stored.socials?.[key]!==false&&socialUrl(general[key])).map(([key,label,icon])=>({key,label,icon,url:socialUrl(general[key])}))
  };
}
