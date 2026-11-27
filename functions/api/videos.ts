import general from '../../src/content/settings/general.json';
import { fetchVideos, channelReference } from '../_lib/youtube';
type Context={request:Request;env:{YOUTUBE_API_KEY?:string}};
export async function onRequestGet({request,env}:Context){
 const url=new URL(request.url), token=url.searchParams.get('page')||'';
 if(token&&!/^[A-Za-z0-9_=-]{1,256}$/.test(token))return new Response('Invalid page',{status:400});
 const channel=channelReference(general.youtube_url);
 const key=new Request(url.origin+'/api/videos?channel='+encodeURIComponent(channel)+'&page='+encodeURIComponent(token));
 const cache=(caches as unknown as {default:Cache}).default;
 const cached=await cache.match(key);
 if(cached&&Date.now()-Number(cached.headers.get('X-Fetched-At'))<3600000)return new Response(cached.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}});
 try{
  if(!env.YOUTUBE_API_KEY||!channel)throw Error('Configuration unavailable');
  const result=await fetchVideos(env.YOUTUBE_API_KEY,channel,token);
  const response=Response.json(result,{headers:{'Cache-Control':'public, max-age=86400','X-Fetched-At':String(Date.now())}});
  await cache.put(key,response.clone());
  return new Response(response.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}});
 }catch{
  if(cached)return new Response(cached.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=60'}});
  return Response.json({error:'Videos are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
