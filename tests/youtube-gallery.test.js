import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const result=await build({entryPoints:['functions/_lib/youtube.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {channelReference,fetchVideos}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('resolve configured channel and fetch public uploads with pagination',async()=>{
 assert.equal(channelReference('https://www.youtube.com/@SihphirPresbyterianKohhran'),'@SihphirPresbyterianKohhran');
 assert.equal(channelReference('https://example.org/@fake'),'');
 const calls=[];
 const mock=async url=>{calls.push(url);const resource=url.pathname.split('/').pop();
 return Response.json(resource==='channels'?{items:[{contentDetails:{relatedPlaylists:{uploads:'UUexample'}}}]}:resource==='playlistItems'?{nextPageToken:'next',items:['abcdefghijk','bcdefghijkl','cdefghijklm'].map(videoId=>({contentDetails:{videoId}}))}:{items:[{id:'abcdefghijk',snippet:{title:'Older',publishedAt:'2026-01-01'},status:{privacyStatus:'public',uploadStatus:'processed'}},{id:'bcdefghijkl',snippet:{title:'Newer',publishedAt:'2026-02-01'},status:{privacyStatus:'public',uploadStatus:'processed'}},{id:'cdefghijklm',status:{privacyStatus:'private',uploadStatus:'processed'}}]});};
 const data=await fetchVideos('test-secret','@church','previous',mock,1);
 assert.deepEqual(data.videos.map(v=>v.title),['Newer','Older']);
 assert.equal(data.nextPage,'next');assert.equal(calls[1].searchParams.get('pageToken'),'previous');assert.equal(calls.length,3);
 assert.ok(!JSON.stringify(data).includes('test-secret'));
 await assert.rejects(fetchVideos('key','@church','',async()=>new Response('',{status:503})));
});
test('homepage opt-in and lazy playback contracts',()=>{
 const page=readFileSync('src/pages/index.astro','utf8'), cms=readFileSync('public/admin/app.js','utf8'), gallery=readFileSync('src/components/YouTubeGallery.astro','utf8');
 assert.match(page,/visibility.kohhran_videos === true/);
 assert.ok(cms.includes("['kohhran_videos','Show Kohhran Videos Section']"));
 assert.ok(gallery.includes('slice(0,6)'));assert.ok(gallery.includes("createElement('iframe')"));assert.ok(gallery.includes('scroll-snap-type'));
 assert.ok(!gallery.includes('YOUTUBE_API_KEY'));
});

test('bounded scanning skips unavailable pages and collects six unique public videos',async()=>{
 let pages=0,channels=0;
 const mock=async url=>{
 const resource=url.pathname.split('/').pop();
 if(resource==='channels'){channels++;return Response.json({items:[{contentDetails:{relatedPlaylists:{uploads:'UUexample'}}}]});}
 if(resource==='playlistItems'){pages++;return Response.json({nextPageToken:'p'+pages,items:Array.from({length:6},(_,i)=>({contentDetails:{videoId:String(pages*10+i).padStart(11,'0')}}))});}
 return Response.json({items:pages===1?[]:url.searchParams.get('id').split(',').map(id=>({id,snippet:{title:id,publishedAt:'2026-01-01'},status:{privacyStatus:'public',uploadStatus:'processed'}}))});
 };
 const data=await fetchVideos('secret','@church','',mock);
 assert.equal(data.videos.length,6);assert.equal(pages,2);assert.equal(channels,1);assert.equal(data.nextPage,'p2');
 pages=0;
 const empty=await fetchVideos('secret','@church','',async url=>url.pathname.endsWith('/videos')?Response.json({items:[]}):mock(url));
 assert.equal(empty.videos.length,0);assert.equal(pages,5);assert.equal(empty.nextPage,'p5');
});
test('runtime cache enforces refresh and absolute stale cutoff',async()=>{
 const bundle=await build({entryPoints:['functions/api/videos.ts'],bundle:true,write:false,platform:'node',format:'esm'});
 const {onRequestGet,FRESH,RETENTION}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const old=globalThis.caches;
 let age=FRESH-1000;
 globalThis.caches={default:{match:async()=>Response.json({videos:[]},{headers:{'X-Fetched-At':String(Date.now()-age)}})}};
 try{
 const context={request:new Request('https://example.org/api/videos'),env:{}};
 let response=await onRequestGet(context);assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/max-age=[01]$/);
 age=FRESH+1000;response=await onRequestGet(context);assert.equal(response.status,200);
 age=RETENTION;response=await onRequestGet(context);assert.equal(response.status,503);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 }finally{if(old===undefined)delete globalThis.caches;else globalThis.caches=old;}
});
