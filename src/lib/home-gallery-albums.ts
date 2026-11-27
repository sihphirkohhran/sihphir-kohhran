import { ownedBy } from './content-ownership';
import { uniqueGalleryPhotos, shouldOpenExternalAlbum } from './gallery-navigation';
import { normalizeContentEntryId } from './content-deep-links';
import { resolveHistoricalYearType } from './historical-year';

type Entry = {id:string;data:{caption:string;category:string;photo?:string;photos?:(string|{src?:string;photo?:string})[];album_url?:string;year?:number|null;yearType?:'known'|'approximate'|'unspecified';date?:string;owner?:string|null;owners?:string[]|null;status?:string;published?:boolean}};
const placeholder='/images/profile-placeholder.svg';
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return h>>>0;}
export function selectHomeAlbums(entries:Entry[],limit=6,category='',order='',seed=''){
 const seen=new Set<string>();
 const albums=ownedBy(entries,'kohhran').flatMap(({id,data})=>{
  const key=normalizeContentEntryId(id);
  if(!key||seen.has(key)||(category&&data.category!==category))return [];
  seen.add(key);
  const featured=String(data.photo||'').trim();
  const photos=uniqueGalleryPhotos([...(featured?[featured]:[]),...(data.photos||[])]);
  const external=shouldOpenExternalAlbum(photos.length,data.album_url);
  const year=resolveHistoricalYearType(data.year,data.yearType)==='unspecified'?null:data.year??null;
  return [{id:key,title:data.caption,category:data.category,year,date:String(data.date||''),cover:featured||photos[0]?.src||placeholder,coverFallback:photos.find(p=>p.src!==featured)?.src||placeholder,external,href:external?String(data.album_url).trim():'/gallery?album='+encodeURIComponent(key)}];
 }).sort((a,b)=>(b.year??-Infinity)-(a.year??-Infinity)||b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const count=Math.max(0,Math.min(6,Math.floor(limit)||0));
 if(order==='oldest')return [...albums].sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).slice(0,count);
 const recent=albums.slice(0,Math.ceil(count/2));
 const stableSeed=seed||albums.map(a=>a.id).join('|');
 return [...recent,...albums.slice(recent.length).sort((a,b)=>hash(stableSeed+'|'+a.id)-hash(stableSeed+'|'+b.id)||a.id.localeCompare(b.id)).slice(0,count-recent.length)];
}
