import { OVERVIEW_GROUPS, compareIndicator, getReportingPeriod, getTrendSeries, getValue, csvString } from '../lib/statistics.js';
const dataNode = document.getElementById('statistics-records');
if (dataNode) {
  const records = JSON.parse(dataNode.textContent || '[]');
  const indicators = JSON.parse(document.getElementById('statistics-indicators')?.textContent || '[]');
  if (records.length) initStatisticsDashboard(records, indicators);
}
function initStatisticsDashboard(records, indicators) {
  const years = records.map(r=>Number(r.year)).sort((a,b)=>a-b);
  const byYear = new Map(records.map(record=>[Number(record.year),record]));
  const $ = id=>document.getElementById(id);
  const fmt = value=>value===null||value===undefined?'—':Number(value).toLocaleString('en-IN');
  const fillYears=(element,options)=>{element.replaceChildren();options.forEach(year=>{const o=document.createElement('option');o.value=String(year);o.textContent=String(year);element.append(o);});};
  const recordFor=year=>byYear.get(Number(year));
  const setPeriod=(element,year)=>{element.textContent=getReportingPeriod(year)?.label||'';};
  const icons={
    households:'<path d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z"/>',
    members:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 7a3 3 0 0 1 0 6m1 3a4 4 0 0 1 3 4"/>',
    communicants:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    births:'<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1.5 2 4.5 2 6 0M12 3v3"/>',
    deaths:'<path d="M20.8 8.3c0 4.5-8.8 11.3-8.8 11.3S3.2 12.8 3.2 8.3A4.6 4.6 0 0 1 12 6.1a4.6 4.6 0 0 1 8.8 2.2z"/>'
  };
  function renderCards(){
    const record=recordFor($('statistics-year').value),host=$('statistics-cards');host.replaceChildren();
    OVERVIEW_GROUPS.forEach(group=>{
      const card=document.createElement('article');card.className='statistics-card';
      const heading=document.createElement('div');heading.className='statistics-heading';heading.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.65" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[group.id]}</svg>`;
      const title=document.createElement('span');title.textContent=group.title;heading.append(title);card.append(heading);
      const rows=document.createElement('div');rows.className='statistics-rows'+(group.id==='households'?' household-rows':'');
      group.rows.forEach(([label,key],index)=>{
        const row=document.createElement('div');row.className='statistics-row'+(index===group.rows.length-1?' total':'');
        const name=document.createElement('span');name.textContent=label;const val=document.createElement('span');const value=record?.[group.id]?.[key]??null;val.textContent=fmt(value);val.className='value'+(value===null?' missing':'');row.append(name,val);rows.append(row);
      });card.append(rows);host.append(card);
    });
  }
  // Use fixed indicator paths, not translated display labels, for category and Total styling.
  const categoryIds=new Set(['households','members','communicants','births','deaths']);
  const tableRow=(item,cells)=>({
    cells,
    category:!item.custom&&categoryIds.has(item.path?.[0])?item.path[0]:null,
    total:!item.custom&&categoryIds.has(item.path?.[0])&&item.path[1]==='total'
  });
  function renderTable(host,columns,rows,numericStart=1){
    const table=document.createElement('table'),thead=document.createElement('thead'),tr=document.createElement('tr');
    columns.forEach((column,index)=>{const th=document.createElement('th');th.textContent=column;if(index>=numericStart)th.className='num';th.scope='col';tr.append(th);});thead.append(tr);table.append(thead);
    const tbody=document.createElement('tbody');
    rows.forEach(row=>{
      const tr=document.createElement('tr');
      if(row.category)tr.classList.add('statistics-category-'+row.category);
      if(row.total)tr.classList.add('statistics-total-row');
      row.cells.forEach((cell,index)=>{
        const td=document.createElement(index===0?'th':'td');
        if(index===0)td.scope='row';
        td.textContent=String(cell??'');
        if(index>=numericStart)td.classList.add('num');
        if(row.category&&index===0)td.classList.add('statistics-category-label');
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody);host.replaceChildren(table);
  }
  function syncCompareYears(){const from=Number($('statistics-compare-from').value),to=$('statistics-compare-to'),previous=Number(to.value);fillYears(to,years.filter(y=>y>=from));to.value=String(years.includes(previous)&&previous>=from?previous:from);}
  function renderComparison(){
    const a=recordFor($('statistics-compare-from').value),b=recordFor($('statistics-compare-to').value);
    const rows=indicators.map(item=>{
      const result=compareIndicator(a,b,item.key);
      const cells=item.custom&&!item.comparable
        ? [item.label,fmt(result.from),fmt(result.to),'—','—']
        : [item.label,fmt(result.from),fmt(result.to),result.difference===null?'—':`${result.difference>0?'+':''}${fmt(result.difference)}`,result.percentage===null?'—':`${result.percentage>0?'+':''}${result.percentage.toFixed(1)}%`];
      return tableRow(item,cells);
    });
    renderTable($('statistics-compare-table'),['Indicator',String(a.year),String(b.year),'Change','Change %'],rows);
  }
  function renderDetails(){const record=recordFor($('statistics-detail-year').value);setPeriod($('statistics-detail-period'),record.year);renderTable($('statistics-detail-table'),['Category','Indicator',String(record.year)],indicators.map(item=>tableRow(item,[item.group,item.label,fmt(getValue(record,item.key))])),2);}
  function renderTrends(){
    const key=$('statistics-trend-indicator').value,indicator=indicators.find(item=>item.key===key),from=Number($('statistics-trend-from').value),to=Number($('statistics-trend-to').value),root=$('statistics-trend-chart');root.replaceChildren();$('statistics-trend-title').textContent=indicator?.label||'';const note=$('statistics-comparability-note');const notes=records.filter(r=>Number(r.year)>=from&&Number(r.year)<=to&&r.comparabilityNotes?.trim()).map(r=>`${r.year}: ${r.comparabilityNotes.trim()}`);note.textContent=notes.length?`Comparability notes — ${notes.join(' · ')}`:'';note.classList.toggle('statistics-hidden',notes.length===0);
    if(from>to){root.textContent='From Year must not exceed To Year.';return;}if(indicator?.custom&&!indicator.comparable){root.textContent='This indicator is not marked comparable across years.';return;}
    const series=getTrendSeries(records,key,from,to),observed=series.filter(point=>typeof point.value==='number');if(!observed.length){root.textContent='No recorded values.';return;}
    const min=Math.min(...observed.map(p=>p.value)),max=Math.max(...observed.map(p=>p.value)),padding=(max-min)||Math.max(1,max*.12),low=Math.max(0,min-padding*.35),high=max+padding*.35;
    const width=850,height=285,margin={l:65,r:42,t:30,b:50};const px=year=>margin.l+(series.length===1?.5:((year-from)/(series.length-1)))*(width-margin.l-margin.r);const py=value=>height-margin.b-((value-low)/(high-low))*(height-margin.t-margin.b);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.classList.add('statistics-graph');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${indicator?.label||key}, ${from}–${to}`);
    const element=(tag,attrs,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;svg.append(e);return e;};
    for(let z=0;z<4;z++){const n=low+(high-low)*z/3,y=py(n);element('line',{x1:margin.l,y1:y,x2:width-margin.r,y2:y,stroke:'#e4e8ee'});element('text',{x:margin.l-14,y:y+4,'text-anchor':'end',fill:'#798596','font-size':12},fmt(Math.round(n)));}
    const step=Math.max(1,Math.ceil(series.length/8));series.forEach((point,index)=>{if(index%step===0||index===series.length-1)element('text',{x:px(point.year),y:height-18,'text-anchor':'middle',fill:'#68758a','font-size':13},String(point.year));});
    let segment=[];const drawSegment=()=>{if(segment.length>1)element('polyline',{points:segment.map(p=>`${px(p.year)},${py(p.value)}`).join(' '),fill:'none',stroke:'#b9944e','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'});segment=[];};
    series.forEach(point=>{if(typeof point.value!=='number')drawSegment();else segment.push(point);});drawSegment();observed.forEach(point=>{element('circle',{cx:px(point.year),cy:py(point.value),r:5,fill:'#122a49',stroke:'#fff','stroke-width':2});if(observed.length<=10)element('text',{x:px(point.year),y:py(point.value)-15,'text-anchor':'middle',fill:'#27364b','font-weight':700,'font-size':13},fmt(point.value));});root.append(svg);
  }
  function chooseTab(tab){document.querySelectorAll('.statistics-tab').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.tab===tab)));['overview','comparison','trends','details'].forEach(key=>$(`statistics-${key}`).classList.toggle('statistics-hidden',key!==tab));if(tab==='comparison')renderComparison();if(tab==='trends')renderTrends();if(tab==='details')renderDetails();}
  fillYears($('statistics-year'),years.slice().sort((a,b)=>b-a));fillYears($('statistics-detail-year'),years.slice().sort((a,b)=>b-a));fillYears($('statistics-compare-from'),years);fillYears($('statistics-compare-to'),years);fillYears($('statistics-trend-from'),years);fillYears($('statistics-trend-to'),years);
  $('statistics-year').value=String(years.at(-1));$('statistics-detail-year').value=String(years.at(-1));$('statistics-compare-from').value=String(years[0]);$('statistics-compare-to').value=String(years.at(-1));$('statistics-trend-from').value=String(years[0]);$('statistics-trend-to').value=String(years.at(-1));
  indicators.forEach(item=>{const option=document.createElement('option');option.value=item.key;option.textContent=item.label;$('statistics-trend-indicator').append(option);});$('statistics-trend-indicator').value=indicators.find(item=>item.key==='membersTotal')?.key||indicators[0]?.key;
  $('statistics-year').onchange=()=>{setPeriod($('statistics-period'),$('statistics-year').value);renderCards();};$('statistics-compare-from').onchange=()=>{syncCompareYears();renderComparison();};$('statistics-compare-to').onchange=renderComparison;$('statistics-trend-indicator').onchange=renderTrends;$('statistics-trend-from').onchange=renderTrends;$('statistics-trend-to').onchange=renderTrends;$('statistics-detail-year').onchange=renderDetails;
  document.querySelectorAll('.statistics-tab').forEach(button=>button.onclick=()=>chooseTab(button.dataset.tab));
  $('statistics-download').onclick=()=>{const year=Number($('statistics-detail-year').value),record=recordFor(year),blob=new Blob([csvString(record,indicators)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`kohhran-inchhiarna-${year}.csv`;a.click();URL.revokeObjectURL(url);};
  setPeriod($('statistics-period'),$('statistics-year').value);renderCards();renderComparison();renderDetails();renderTrends();
}
