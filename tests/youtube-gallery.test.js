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
 const data=await fetchVideos('test-secret','@church','previous',mock);
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
