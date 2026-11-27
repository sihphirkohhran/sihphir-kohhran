import { ownedBy } from './content-ownership';
import { uniqueGalleryPhotos, shouldOpenExternalAlbum } from './gallery-navigation';
import { normalizeContentEntryId } from './content-deep-links';
import { resolveHistoricalYearType } from './historical-year';

type Entry = {id:string;data:{caption:string;category:string;photo?:string;photos?:(string|{src?:string;photo?:string})[];album_url?:string;year?:number|null;yearType?:'known'|'approximate'|'unspecified';date?:string;owner?:string|null;owners?:string[]|null;status?:string;published?:boolean}};
const placeholder='/images/profile-placeholder.svg';
export function selectHomeAlbums(entries:Entry[]){
 const seen=new Set<string>();
 const albums=ownedBy(entries,'kohhran').flatMap(({id,data})=>{
  const key=normalizeContentEntryId(id);
  if(!key||seen.has(key))return [];
  seen.add(key);
  const featured=String(data.photo||'').trim();
  const photos=uniqueGalleryPhotos([...(featured?[featured]:[]),...(data.photos||[])]);
  const external=shouldOpenExternalAlbum(photos.length,data.album_url);
  const year=resolveHistoricalYearType(data.year,data.yearType)==='unspecified'?null:data.year??null;
  return [{id:key,title:data.caption,category:data.category,year,date:String(data.date||''),cover:featured||photos[0]?.src||placeholder,coverFallback:photos.find(p=>p.src!==featured)?.src||placeholder,external,href:external?String(data.album_url).trim():'/gallery?album='+encodeURIComponent(key)}];
 }).sort((a,b)=>(b.year??-Infinity)-(a.year??-Infinity)||b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 return albums;
}
