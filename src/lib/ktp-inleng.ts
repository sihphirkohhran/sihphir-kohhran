import { ownedBy } from './content-ownership';
import { resolvePreferredDocumentUrl } from './documents-url';
export const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function issueDate(value: unknown): string {
 const s=typeof value==='string'?value.trim():'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
 const d=new Date(s+'T00:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:'';
}
export function buildIssues(entries: any[], categoryName='KTP Inleng') {
 const visible=new Set([...ownedBy(entries,'kohhran'),...ownedBy(entries,'ktp')]);
 return [...visible].filter(({id,data})=>data.status!=='draft'&&!data.archived&&(
 [categoryName,'ktp-inleng'].some(c=>c.toLowerCase()===String(data.category||'').trim().toLowerCase())||(!data.category&&id.startsWith('ktp-inleng/'))
 )).map(({id,data})=>{
 const date=issueDate(data.date);
 const year=date?Number(date.slice(0,4)):data.yearType==='unspecified'?null:Number.isInteger(data.year)&&data.year>0&&data.year<=9999?data.year:null;
 const month=date?Number(date.slice(5,7)):Number.isInteger(data.month)&&data.month>=1&&data.month<=12?data.month:null;
 const label=date?new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')):[month?months[month-1]:'',year?(data.yearType==='approximate'?'Circa ':'')+year:''].filter(Boolean).join(' ')||'Publication date unavailable';
 let url='';
 try {
 const files=data.files?.filter((f:any)=>/\.pdf(?:[?#]|$)/i.test(f.url)||f.type==='application/pdf');
 const pdf_url=data.pdf_url;
 url=resolvePreferredDocumentUrl({...data,files,pdf_url:pdf_url&&(/^https?:\/\//i.test(pdf_url)||/\.pdf(?:[?#]|$)/i.test(pdf_url))?pdf_url:undefined});
 }catch{}
 const cover=typeof data.cover_image==='string'&&/^(https?:\/\/|\/(?!\/))/.test(data.cover_image)?data.cover_image:'';
 return {id,name:data.name,date,year,month,label,url,cover,search:[data.name,data.description,data.author,...(data.tags||[]),label,date].join(' ').toLowerCase(),key:year?String(year).padStart(4,'0')+'-'+String(month||0).padStart(2,'0')+'-'+(date?date.slice(8):'00'):''};
 }).sort((a,b)=>b.key.localeCompare(a.key)||a.id.localeCompare(b.id));
}
export function matchesIssue(issue:{search:string;year:number|null;month:number|null},query:string,year:string,month:string){
 return issue.search.includes(query.trim().toLowerCase())&&(year==='all'||String(issue.year)===year)&&(month==='all'||String(issue.month)===month);
}
