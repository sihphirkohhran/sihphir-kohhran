import general from '../../src/content/settings/general.json';
import { fetchVideos, channelReference } from '../_lib/youtube';
type Context={request:Request;env:{YOUTUBE_API_KEY?:string}};
export const FRESH=3600000, RETENTION=86400000;
export function cacheAge(response:Response|null|undefined,now=Date.now()){
 const stamp=Number(response?.headers.get('X-Fetched-At'));
 return stamp>0&&stamp<=now?now-stamp:Infinity;
}
function deliver(response:Response,age:number){
 const ttl=Math.max(0,Math.min(age<FRESH?300:60,Math.floor(((age<FRESH?FRESH:RETENTION)-age)/1000)));
 return new Response(response.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age='+ttl}});
}
export async function onRequestGet({request,env}:Context){
 const url=new URL(request.url), token=url.searchParams.get('page')||'';
 if(token&&!/^[A-Za-z0-9_=-]{1,256}$/.test(token))return new Response('Invalid page',{status:400,headers:{'Cache-Control':'no-store'}});
 const channel=channelReference(general.youtube_url);
 const key=new Request(url.origin+'/api/videos?v=2&channel='+encodeURIComponent(channel)+'&page='+encodeURIComponent(token));
 const cache=(globalThis.caches as unknown as {default?:Cache}|undefined)?.default;
 let cached:Response|undefined;
 try{cached=await cache?.match(key);}catch{}
 const age=cacheAge(cached);
 if(cached&&age<FRESH)return deliver(cached,age);
 try{
  if(!env.YOUTUBE_API_KEY||!channel)throw Error('Configuration unavailable');
  const result=await fetchVideos(env.YOUTUBE_API_KEY,channel,token);
  const response=Response.json(result,{headers:{'Cache-Control':'public, max-age=86400','X-Fetched-At':String(Date.now())}});
  try{await cache?.put(key,response.clone());}catch{}
  return deliver(response,0);
 }catch{
  const staleAge=cacheAge(cached);
  if(cached&&staleAge<RETENTION)return deliver(cached,staleAge);
  return Response.json({error:'Videos are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
