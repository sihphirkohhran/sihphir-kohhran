export const FIXED_INDICATORS = [
  { key: 'familiesChurch', label: 'Kohhran mi awm hlangna chhungkaw zat', group: 'Chhungkaw zat', path: ['households', 'church'] },
  { key: 'familiesMixed', label: 'Inawm pawlhna chhungkaw zat', group: 'Chhungkaw zat', path: ['households', 'mixed'] },
  { key: 'familiesTotal', label: 'Chhungkua zawng zawng zat', group: 'Chhungkaw zat', path: ['households', 'total'] },
  { key: 'membersMale', label: 'Member zat — Mipa', group: 'Member zat', path: ['members', 'male'] },
  { key: 'membersFemale', label: 'Member zat — Hmeichhia', group: 'Member zat', path: ['members', 'female'] },
  { key: 'membersTotal', label: 'Member zat — Total', group: 'Member zat', path: ['members', 'total'] },
  { key: 'communicantsMale', label: 'Dan Zawh Kim — Mipa', group: 'Dan Zawh Kim', path: ['communicants', 'male'] },
  { key: 'communicantsFemale', label: 'Dan Zawh Kim — Hmeichhia', group: 'Dan Zawh Kim', path: ['communicants', 'female'] },
  { key: 'communicantsTotal', label: 'Dan Zawh Kim — Total', group: 'Dan Zawh Kim', path: ['communicants', 'total'] },
  { key: 'birthMale', label: 'Nau piang — Mipa', group: 'Nau piang', path: ['births', 'male'] },
  { key: 'birthFemale', label: 'Nau piang — Hmeichhia', group: 'Nau piang', path: ['births', 'female'] },
  { key: 'birthTotal', label: 'Nau piang — Total', group: 'Nau piang', path: ['births', 'total'] },
  { key: 'deathMale', label: 'Mitthi — Mipa', group: 'Mitthi', path: ['deaths', 'male'] },
  { key: 'deathFemale', label: 'Mitthi — Hmeichhia', group: 'Mitthi', path: ['deaths', 'female'] },
  { key: 'deathTotal', label: 'Mitthi — Total', group: 'Mitthi', path: ['deaths', 'total'] },
];

export const OVERVIEW_GROUPS = [
  { id: 'households', title: 'Chhungkaw zat', rows: [['Kohhran mi awm hlangna', 'church'], ['Inawm pawlhna', 'mixed'], ['Chhungkua zawng zawng', 'total']] },
  { id: 'members', title: 'Member zat', rows: [['Mipa', 'male'], ['Hmeichhia', 'female'], ['Total', 'total']] },
  { id: 'communicants', title: 'Dan Zawh Kim', rows: [['Mipa', 'male'], ['Hmeichhia', 'female'], ['Total', 'total']] },
  { id: 'births', title: 'Nau piang', rows: [['Mipa', 'male'], ['Hmeichhia', 'female'], ['Total', 'total']] },
  { id: 'deaths', title: 'Mitthi', rows: [['Mipa', 'male'], ['Hmeichhia', 'female'], ['Total', 'total']] },
];
export const GROUPS = ['households', 'members', 'communicants', 'births', 'deaths'];
export const REPORTING_STATUS = ['draft', 'published'];
const isCount = value => value === null || value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 0);
const get = (record, group, key) => record?.[group]?.[key] ?? null;


export function getReportingPeriod(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1800 || y > 9999) return null;
  return { start: `1 September ${y - 1}`, end: `31 August ${y}`, label: `1 September ${y - 1} – 31 August ${y}` };
}

export function createEmptyRecord(year) {
  return {
    schemaVersion: 1, year: Number(year), status: 'draft', reportingPeriod: getReportingPeriod(year),
    households: { church: null, mixed: null, total: null },
    members: { male: null, female: null, total: null },
    communicants: { male: null, female: null, total: null },
    births: { male: null, female: null, total: null },
    deaths: { male: null, female: null, total: null },
    additionalIndicators: [],
    source: { title: '', reportYear: Number(year), reference: '', notes: '', verificationStatus: 'unverified' },
    notes: '', comparabilityNotes: '', revisionMetadata: { updatedAt: '' },
  };
}
export function validateAnnualRecord(record, existingYears = []) {
  const errors = [], warnings = [];
  const year = Number(record?.year);
  if (!Number.isInteger(year) || year < 1800 || year > 9999) errors.push('Reporting year must be a valid year from 1800 to 9999.');
  if (existingYears.map(Number).includes(year)) errors.push(`A record for ${year} already exists.`);
  if (!REPORTING_STATUS.includes(record?.status)) errors.push('Status must be Draft or Published.');
  for (const group of GROUPS) {
    if (!record?.[group] || typeof record[group] !== 'object') { errors.push(`Missing ${group} group.`); continue; }
    for (const key of Object.keys(record[group])) if (!isCount(record[group][key])) errors.push(`${group}.${key} must be a non-negative integer or blank.`);
  }
  for (const [key, value] of [['households.church', record?.households?.church], ['households.mixed', record?.households?.mixed], ['households.total', record?.households?.total]]) if (!isCount(value)) errors.push(`${key} must be a non-negative integer or blank.`);
  const check = (group, parts, totalKey='total') => {
    const values = parts.map(key => record?.[group]?.[key]);
    const total = record?.[group]?.[totalKey];
    if (values.every(v => typeof v === 'number') && typeof total === 'number' && values.reduce((a,b)=>a+b,0) !== total) warnings.push(`${group}: breakdown sums to ${values.reduce((a,b)=>a+b,0)}, reported total is ${total}.`);
  };
  check('members', ['male','female']); check('communicants',['male','female']); check('births',['male','female']); check('deaths',['male','female']);
  if (record?.households && [record.households.church,record.households.mixed,record.households.total].every(v=>typeof v==='number') && record.households.church+record.households.mixed!==record.households.total) warnings.push(`households: breakdown sums to ${record.households.church+record.households.mixed}, reported total is ${record.households.total}.`);
  const extraKeys=new Set();
  (record?.additionalIndicators||[]).forEach((indicator,index)=>{
    if (!indicator?.key || !/^[a-z][a-zA-Z0-9_-]*$/.test(indicator.key)) errors.push(`Additional statistic ${index+1} needs a stable key.`);
    if (extraKeys.has(indicator.key)) errors.push(`Duplicate additional statistic key: ${indicator.key}.`);
    extraKeys.add(indicator.key);
    if (typeof indicator.label!=='string'||!indicator.label.trim()) errors.push(`Additional statistic ${index+1} needs a label.`);
    if (!isCount(indicator.value)) errors.push(`${indicator.label||indicator.key} must be a non-negative integer or blank.`);
    if (indicator.comparable !== undefined && typeof indicator.comparable !== 'boolean') errors.push(`${indicator.key||`Additional statistic ${index+1}`} comparability must be true or false.`);
  });
  if (record?.source?.reportYear !== undefined && record?.source?.reportYear !== null && year !== Number(record.source.reportYear)) warnings.push('Source reporting year differs from the record year.');
  if (record?.status==='published') {
    if (!record?.source?.title?.trim()) errors.push('Source document title is required before publishing.');
    if (record?.source?.verificationStatus!=='verified') errors.push('Source must be marked Verified before publishing.');
    if (year!==Number(record?.source?.reportYear)) errors.push('Source reporting year must match the record year.');
    const recorded = FIXED_INDICATORS.some(item => typeof get(record,item.path[0],item.path[1]) === 'number') || (record?.additionalIndicators||[]).some(item=>typeof item.value==='number');
    if (!recorded) errors.push('At least one statistic must be recorded before publishing.');
  }
  const missing=FIXED_INDICATORS.filter(item=>get(record,item.path[0],item.path[1])===null);
  if(missing.length)warnings.push(`${missing.length} standard values are missing.`);
  return {valid:errors.length===0,errors,warnings};
}
export function getPublishedRecords(records) {
  const eligible=(records||[]).filter(r=>r?.status==='published'&&r?.source?.verificationStatus==='verified'&&r?.source?.title?.trim()&&Number(r?.source?.reportYear)===Number(r?.year)&&(FIXED_INDICATORS.some(item=>typeof get(r,item.path[0],item.path[1])==='number')||(r?.additionalIndicators||[]).some(item=>typeof item.value==='number')));
  eligible.sort((a,b)=>String(b?.revisionMetadata?.updatedAt||'').localeCompare(String(a?.revisionMetadata?.updatedAt||''))||Number(a.year)-Number(b.year));
  const seen=new Set();return eligible.filter(record=>{const year=Number(record.year);if(seen.has(year))return false;seen.add(year);return true;}).sort((a,b)=>Number(a.year)-Number(b.year));
}
export function getValue(record, indicator) {
  const definition=FIXED_INDICATORS.find(i=>i.key===indicator);
  if(definition)return record?.[definition.path[0]]?.[definition.path[1]]??null;
  return (record?.additionalIndicators||[]).find(i=>i.key===indicator)?.value??null;
}
export function listIndicators(records) {
  const extra=new Map();
  for(const record of records||[]) for(const item of record.additionalIndicators||[]) {
    if(!extra.has(item.key))extra.set(item.key,{key:item.key,label:item.label,group:item.group||'Other Statistics',custom:true,comparable:item.comparable!==false});
    else if(item.comparable===false)extra.get(item.key).comparable=false;
  }
  return [...FIXED_INDICATORS.map(i=>({key:i.key,label:i.label,group:i.group,custom:false,comparable:true})),...extra.values()];
}
export function compareIndicator(a,b,indicator) {
  const from=getValue(a,indicator),to=getValue(b,indicator);
  if(typeof from!=='number'||typeof to!=='number')return {from,to,difference:null,percentage:null};
  const difference=to-from;
  return {from,to,difference,percentage:from===0?null:(difference/from)*100};
}
export function getTrendSeries(records,indicator,fromYear,toYear) {
  const from=Number(fromYear),to=Number(toYear);
  if(!Number.isInteger(from)||!Number.isInteger(to)||to<from)return [];
  const years=Array.from({length:to-from+1},(_,i)=>from+i);
  const indexed=new Map((records||[]).map(r=>[Number(r.year),r]));
  return years.map(year=>({year,value:getValue(indexed.get(year),indicator)}));
}
export function csvRows(record,indicators=listIndicators([record])) {
  const rows=[['Year',record.year],['Reporting period',getReportingPeriod(record.year)?.label],['Source document',record.source?.title||''],['Source reference',record.source?.reference||''],['Verification',record.source?.verificationStatus||''],[],['Category','Indicator','Value']];
  for(const indicator of indicators)rows.push([indicator.group,indicator.label,getValue(record,indicator.key)]);
  if(record.notes)rows.push(['Notes','',record.notes]);if(record.comparabilityNotes)rows.push(['Comparability notes','',record.comparabilityNotes]);
  return rows;
}
export function csvString(record,indicators=listIndicators([record])) {
  const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
  return '\ufeff'+csvRows(record,indicators).map(row=>row.map(quote).join(',')).join('\r\n');
}

/** Apply the latest eligible annual report to the existing homepage cards. */
export function getHomepageStatistics(fallbackStats, records) {
  const eligible = getPublishedRecords(records);
  const latest = eligible.at(-1);
  if (!latest) return fallbackStats;
  const mapping = [
    [/^chhungkaw zat$/i, latest.households?.total],
    [/^member zat$/i, latest.members?.total],
    [/^dan zawh kim$/i, latest.communicants?.total],
  ];
  return fallbackStats.map(stat => {
    const match = mapping.find(([pattern]) => pattern.test(String(stat.label || '').trim()));
    if (!match) return stat;
    const value = match[1];
    return { ...stat, value: typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value.toLocaleString('en-IN') : 'Unavailable' };
  });
}
