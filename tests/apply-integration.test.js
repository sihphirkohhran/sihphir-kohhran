import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
const script=fileURLToPath(new URL('../apply-integration.mjs',import.meta.url));

test('integration script safely patches collection, CMS route/menu and navigation', async()=>{
 const root=await mkdtemp(join(tmpdir(),'statistics-integration-'));
 const files={
  'src/content/config.ts':"import { defineCollection } from 'astro:content'; import { z } from 'astro/zod';\nconst fellowship = defineCollection({type:'data',schema:z.object({name:z.string()})});\nexport const collections = {\n  settings,\n  fellowship,\n  committee,\n};\n",
  'functions/api/admin/[[path]].ts':"const areas = {\n  settings: ['src/content/settings/'],\n};\n",
  'src/pages/admin.astro':"    <link rel=\"stylesheet\" href=\"/admin/ui-text-manager.css\" />\n    <script is:inline src=\"/admin/app.js?v=pes-cms-20261118\"></script>\n",
  'public/admin/app.js':"const menuGroups = [\n  ['Church', [['committee','Committee','♙'],['fellowship','Fellowship','◌']]],\n];\nconst paths = { fellowship:'src/content/fellowship/' };\nasync function render() { layout(); try { if(area==='committee') return committeeManager(); if(['documents','gallery','pastors','elders','missionaries'].includes(area)) return load(); } catch(e) {} }\n",
  'src/content/settings/navigation.json':JSON.stringify({items:[{label:'Document',href:'/document',key:'document',visible:true,order:9,parent:''},{label:'Nested',href:'/nested',key:'nested',visible:true,order:10,parent:'Rawngbawltu'}]},null,2)+'\n',
 };
 for(const [file,content] of Object.entries(files)){const dest=join(root,file);await mkdir(join(dest,'..'),{recursive:true});await writeFile(dest,content);}
 const {stdout}=await exec('node',[script],{cwd:root});assert.ok(stdout.includes('Integrated statistics collection'));
 const config=await readFile(join(root,'src/content/config.ts'),'utf8');assert.ok(config.includes('const statistics = defineCollection'));assert.ok(config.includes('  statistics,\n  fellowship'));
 const api=await readFile(join(root,'functions/api/admin/[[path]].ts'),'utf8');assert.ok(api.includes("statistics: ['src/content/statistics/']"));
 const admin=await readFile(join(root,'src/pages/admin.astro'),'utf8');assert.ok(admin.includes('/admin/statistics-manager.css'));assert.ok(admin.includes('/admin/statistics-manager.js'));
 const app=await readFile(join(root,'public/admin/app.js'),'utf8');assert.ok(app.includes("['statistics','Kohhran Inchhiarna','▥']"));assert.ok(app.includes('SihphirStatisticsManager'));
 const nav=JSON.parse(await readFile(join(root,'src/content/settings/navigation.json'),'utf8'));assert.ok(nav.items.some(item=>item.key==='statistics'&&item.href==='/statistics/'));assert.equal(nav.items.find(item=>item.key==='nested').order,11);
});
