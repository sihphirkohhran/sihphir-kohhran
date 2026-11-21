import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEmptyRecord, getReportingPeriod, validateAnnualRecord, getPublishedRecords, getValue, listIndicators, compareIndicator, getTrendSeries, csvString, getHomepageStatistics } from '../src/lib/statistics.js';

const verified = year => ({ title: 'Presbytery Inkhawmpui Annual Report', reportYear: year, reference: `official-report-${year}`, verificationStatus: 'verified' });
const published = (year, memberTotal, overrides={}) => ({ ...createEmptyRecord(year), status: 'published', source: verified(year), members: { male: null, female: null, total: memberTotal }, ...overrides });

test('reporting year is the ending year of the September–August period', () => {
  assert.deepEqual(getReportingPeriod(2025), { start:'1 September 2024', end:'31 August 2025', label:'1 September 2024 – 31 August 2025' });
  assert.equal(getReportingPeriod('2040').end,'31 August 2040');
  assert.equal(getReportingPeriod(1799),null);
  assert.equal(getReportingPeriod(10000),null);
});
test('new record uses nulls and Draft without sample statistics', () => {
  const record=createEmptyRecord(2026);
  assert.equal(record.status,'draft');
  assert.equal(record.members.total,null);
  assert.equal(record.households.total,null);
  assert.equal(record.schemaVersion,1);
  assert.deepEqual(record.additionalIndicators,[]);
});
test('non-negative integer validation rejects negative, fractional and string counts', () => {
  const record=createEmptyRecord(2026);record.members.male=-1;record.births.female=1.5;record.deaths.total='4';
  const result=validateAnnualRecord(record);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(e=>e.includes('members.male')));
  assert.ok(result.errors.some(e=>e.includes('births.female')));
  assert.ok(result.errors.some(e=>e.includes('deaths.total')));
});
test('communicant male/female breakdown remains optional', () => {
  const record=createEmptyRecord(2026);record.status='published';record.source=verified(2026);record.members.total=1;
  assert.equal(validateAnnualRecord(record).valid,true);
  record.communicants.total=0;
  assert.equal(validateAnnualRecord(record).valid,true);
});
test('duplicate annual record is prevented', () => {
  const record=createEmptyRecord(2025);
  assert.ok(validateAnnualRecord(record,[2025,2026]).errors.some(e=>e.includes('already exists')));
});
test('reported subtotal mismatch is warning and does not alter reported total', () => {
  const record=createEmptyRecord(2026);record.members.male=2;record.members.female=3;record.members.total=10;
  const result=validateAnnualRecord(record);
  assert.ok(result.warnings.some(e=>e.includes('reported total')));
  assert.equal(record.members.total,10);
});
test('missing data remains distinct from a recorded zero', () => {
  const record=createEmptyRecord(2026);record.members.total=0;
  assert.equal(getValue(record,'membersTotal'),0);
  assert.equal(getValue(record,'membersMale'),null);
  assert.ok(csvString(record).includes('"Member zat","Member zat — Mipa",""'));
});
test('public records must be published and source verified', () => {
  const draft=createEmptyRecord(2024);const unverified=published(2025,12);unverified.source.verificationStatus='unverified';const good=published(2026,14);
  const missingSourceYear=published(2028,1);missingSourceYear.source.reportYear=null;
  const emptyPublished=published(2027,null);
  assert.deepEqual(getPublishedRecords([draft,unverified,missingSourceYear,emptyPublished,good]).map(r=>r.year),[2026]);
});
test('publish validation requires verified source, matching year, and a statistic', () => {
  const record=createEmptyRecord(2026);record.status='published';
  const initial = validateAnnualRecord(record);
  assert.equal(initial.valid, false);
  assert.ok(initial.errors.some(e => e.includes('Source document title is required')));
  assert.ok(initial.errors.some(e => e.includes('Source must be marked Verified')));
  assert.ok(initial.errors.some(e => e.includes('At least one statistic must be recorded')));
  record.source.reportYear=null;
  assert.ok(validateAnnualRecord(record).errors.some(e => e.includes('Source reporting year must match')));
  record.source.reportYear=2026;
  record.source=verified(2025);record.members.total=1;
  assert.ok(validateAnnualRecord(record).errors.some(e=>e.includes('match the record year')));
  record.source=verified(2026);
  record.source.reference='';
  assert.equal(validateAnnualRecord(record).valid,true);
  assert.deepEqual(getPublishedRecords([record]).map(r => r.year), [2026]);
  record.source.verificationStatus='unverified';
  assert.ok(validateAnnualRecord(record).errors.some(e => e.includes('Source must be marked Verified')));
  record.source.verificationStatus='verified';
  record.source.title='';
  assert.ok(validateAnnualRecord(record).errors.some(e => e.includes('Source document title is required')));
});
test('comparison computes difference and percentage and suppresses percentage for zero baseline', () => {
  const a=published(2025,10),b=published(2026,15);
  assert.deepEqual(compareIndicator(a,b,'membersTotal'),{from:10,to:15,difference:5,percentage:50});
  const zero=published(2025,0);
  assert.deepEqual(compareIndicator(zero,b,'membersTotal'),{from:0,to:15,difference:15,percentage:null});
});
test('same-year comparison returns zero change when numeric value is recorded', () => {
  const record=published(2026,0);
  assert.deepEqual(compareIndicator(record,record,'membersTotal'),{from:0,to:0,difference:0,percentage:null});
});
test('custom indicator comparability is consistent across available records', () => {
  const a=published(2025,5,{additionalIndicators:[{key:'attendance',label:'Attendance',group:'Other Statistics',value:8,comparable:true}]});
  const b=published(2026,6,{additionalIndicators:[{key:'attendance',label:'Attendance',group:'Other Statistics',value:9,comparable:false}]});
  assert.equal(listIndicators([a,b]).find(i=>i.key==='attendance').comparable,false);
  assert.equal(getValue(a,'attendance'),8);
});
test('trend series includes every intermediate year and preserves missing gaps', () => {
  const records=[published(2020,1),published(2022,3),published(2024,5)];
  const series=getTrendSeries(records,'membersTotal',2020,2024);
  assert.deepEqual(series.map(p=>p.year),[2020,2021,2022,2023,2024]);
  assert.deepEqual(series.map(p=>p.value),[1,null,3,null,5]);
});
test('invalid trend range returns no data points', () => {
  assert.deepEqual(getTrendSeries([], 'membersTotal', 2025, 2024),[]);
  assert.deepEqual(getTrendSeries([], 'membersTotal', 'invalid', 2025),[]);
});
test('CSV exports the selected record, source metadata and blank values safely', () => {
  const record=published(2026,0);record.source.title='Report, “2026”';record.notes='note "quoted"';
  const csv=csvString(record);
  assert.ok(csv.includes('"Report, “2026”"'));
  assert.ok(csv.includes('"membersTotal"')===false);
  assert.ok(csv.includes('"Member zat — Total","0"'));
  assert.ok(csv.includes('"Member zat — Mipa",""'));
  assert.ok(csv.includes('"note ""quoted"""'));
});
test('dashboard page and CMS wiring do not include prototype sample values', async () => {
  const page=await readFile(new URL('../src/pages/statistics/index.astro',import.meta.url),'utf8');
  const cms=await readFile(new URL('../public/admin/statistics-manager.js',import.meta.url),'utf8');
  assert.ok(page.includes('getPublishedRecords'));
  assert.ok(page.includes('No published annual records are available yet.'));
  assert.ok(page.includes('statistics-comparability-note'));
  assert.ok(!page.includes('497')) && assert.ok(!page.includes('2025 sample'));
  assert.ok(cms.includes('src/content/statistics/'));
  assert.ok(cms.includes('verificationStatus'));
  assert.ok(cms.includes('Save Draft'));
  assert.ok(cms.includes('Publish'));
});

test('homepage uses latest verified published year and preserves fallback without records', () => {
  const fallback=[{label:'Chhungkaw zat',value:'497'},{label:'Member zat',value:'2,251'},{label:'Dan zawh kim',value:'1,691'}];
  assert.deepEqual(getHomepageStatistics(fallback,[]),fallback);
  const old=published(2024,100);old.households.total=20;old.communicants.total=70;
  const latest=published(2026,1234);latest.households.total=321;
  const unverified=published(2027,9999);unverified.source.verificationStatus='unverified';
  const draft=published(2028,9999);draft.status='draft';
  assert.deepEqual(getHomepageStatistics(fallback,[latest,old,unverified,draft]).map(s=>s.value),['321','1,234','Unavailable']);
  assert.equal(getHomepageStatistics(fallback,[old])[2].value,'70');
});
test('blank optional report reference permits verified publication and public visibility', () => {
  const record=published(2026,12);record.source.reference='';
  assert.equal(validateAnnualRecord(record).valid,true);
  assert.deepEqual(getPublishedRecords([record]).map(r=>r.year),[2026]);
  record.source.title='';assert.equal(validateAnnualRecord(record).valid,false);
  record.source.title='Annual report';record.source.reportYear=2025;assert.equal(getPublishedRecords([record]).length,0);
});
test('homepage link, navigation and statistics typography remain integrated', async () => {
  const home=await readFile(new URL('../src/pages/index.astro',import.meta.url),'utf8');
  const nav=JSON.parse(await readFile(new URL('../src/content/settings/navigation.json',import.meta.url),'utf8'));
  const css=await readFile(new URL('../src/styles/statistics.css',import.meta.url),'utf8');
  const manager=await readFile(new URL('../public/admin/statistics-manager.js',import.meta.url),'utf8');
  assert.match(home,/href="\/statistics\/"/);
  assert.doesNotMatch(home,/href=\{lookerUrl\}/);
  assert.match(home,/getHomepageStatistics\(legacyStats/);
  assert.equal(nav.items.some(item=>item.key==='statistics'),false);
  assert.match(css,/statistics-heading\{font-family:'Poppins',sans-serif;font-size:15px/);
  assert.match(css,/statistics-top h1,.statistics-h2.*EB Garamond/);
  assert.match(manager,/Original Report URL \/ Document Reference \(Optional\)/);
  assert.doesNotMatch(manager,/Source URL or document reference is required before publishing/);
});
