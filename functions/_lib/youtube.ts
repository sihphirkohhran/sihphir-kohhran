export function channelReference(value:string){
 try{const u=new URL(value);if(!['www.youtube.com','youtube.com'].includes(u.hostname)||u.protocol!=='https:')return '';
 const p=u.pathname.split('/').filter(Boolean);
 return p[0]?.startsWith('@')?p[0]:p[0]==='channel'&&/^UC[A-Za-z0-9_-]{22}$/.test(p[1]||'')?p[1]:'';
 }catch{return ''}
}
export async function fetchVideos(key:string,channel:string,page='',request=fetch,minimum=6){
 const get=async(resource:string,params:Record<string,string>)=>{
 const url=new URL('https://www.googleapis.com/youtube/v3/'+resource);
 url.search=new URLSearchParams({...params,key}).toString();
 const response=await request(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('YouTube unavailable');return response.json() as Promise<any>;
 };
 const channels=await get('channels',{part:'contentDetails',...(channel.startsWith('@')?{forHandle:channel}:{id:channel})});
 const uploads=channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
 if(!uploads)throw Error('Channel unavailable');
 const collected=new Map<string,any>(); const visited=new Set<string>(); let nextPage=page;
 for(let i=0;i<5;i++){
 if(visited.has(nextPage)){nextPage='';break;}visited.add(nextPage);
 const list=await get('playlistItems',{part:'contentDetails',playlistId:uploads,maxResults:'24',...(nextPage?{pageToken:nextPage}:{})});
 const ids=(list.items||[]).map((x:any)=>x.contentDetails?.videoId).filter((id:unknown)=>typeof id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(id));
 const details=ids.length?await get('videos',{part:'snippet,status',id:ids.join(',')}):{items:[]};
 const videos=(details.items||[]).filter((v:any)=>ids.includes(v.id)&&v.status?.privacyStatus==='public'&&v.status?.uploadStatus==='processed').map((v:any)=>({id:v.id,title:String(v.snippet?.title||'Video'),date:String(v.snippet?.publishedAt||''),thumbnail:'https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg',url:'https://www.youtube.com/watch?v='+v.id,embeddable:v.status?.embeddable!==false})).sort((a:any,b:any)=>b.date.localeCompare(a.date));
 for(const video of videos)collected.set(video.id,video);
 nextPage=typeof list.nextPageToken==='string'?list.nextPageToken:'';
 if(visited.has(nextPage))nextPage='';
 if(!nextPage||collected.size>=minimum)break;
 }
 return {videos:[...collected.values()].sort((a,b)=>b.date.localeCompare(a.date)),nextPage};
}
