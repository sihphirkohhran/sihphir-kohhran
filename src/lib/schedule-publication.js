/** Legacy schedule publication semantics shared by CMS and public pages. */
export const scheduleIsPublic = record => record?.published !== false && record?.status !== 'draft';
export const schedulePublication = record => scheduleIsPublic(record) ? 'published' : 'draft';
export const kolkataToday = (now=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const scheduleMonth = value => {
  const raw=String(value||'').trim();
  if(/^\d{4}-(0[1-9]|1[0-2])$/.test(raw))return raw;
  const match=raw.match(/^([A-Za-z]+)\s+(\d{4})$/);
  const names=['january','february','march','april','may','june','july','august','september','october','november','december'];
  const index=match?names.indexOf(match[1].toLowerCase()):-1;
  return index<0?'':match[2]+'-'+String(index+1).padStart(2,'0');
};
export const scheduleDate = value => {
  const raw=String(value||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const match=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return match?match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0'):'';
};
export function selectWeekly(records,today=kolkataToday()){
  const sorted=records.filter(scheduleIsPublic).map(r=>({...r,_start:scheduleDate(r.week_start),_end:scheduleDate(r.week_end)||scheduleDate(r.week_start)})).filter(r=>r._start)
    .sort((a,b)=>a._start.localeCompare(b._start)||a._end.localeCompare(b._end)||String(a.id||'').localeCompare(String(b.id||'')));
  return sorted.find(r=>r._start<=today&&r._end>=today)
    ||sorted.find(r=>r._start>today)
    ||sorted.at(-1)||null;
}
export function selectMonthly(records,today=kolkataToday()){
  const month=today.slice(0,7);
  const sorted=records.filter(scheduleIsPublic).map(r=>({...r,_month:scheduleMonth(r.month)})).filter(r=>r._month)
    .sort((a,b)=>a._month.localeCompare(b._month)||String(a.id||'').localeCompare(String(b.id||'')));
  return sorted.find(r=>r._month===month)||sorted.find(r=>r._month>month)||sorted.at(-1)||null;
}
