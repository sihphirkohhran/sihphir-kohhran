/* Safe editing of existing weekly schedules and monthly duty rosters. */
(()=>{
  const configs={
    'hun-ruatna':{title:'Hun Ruatna',area:'hun-ruatna',root:'src/content/notices/weekly/',key:'days',identity:'week_start',label:'Week',newLabel:'New week',defaultValue:()=>new Date().toISOString().slice(0,10),empty:()=>[{day:'Nilaini',duties:[]}]},
    'thlabi-mawhphurtu':{title:'Thlabi Mawhphurtu',area:'thlabi-mawhphurtu',root:'src/content/notices/monthly/',key:'sections',identity:'month',label:'Month',newLabel:'New month',defaultValue:()=>new Date().toISOString().slice(0,7),empty:()=>[]}
  };
  const scalar=text=>{
    const value=text.trim();
    if(value==='true'||value==='false')return value==='true';
    if(/^-?\d+$/.test(value))return Number(value);
    if(value.startsWith('"'))return JSON.parse(value);
    if(value.startsWith("'")){if(!value.endsWith("'"))throw Error('Unclosed YAML string');return value.slice(1,-1).replace(/''/g,"'");}
    if(value.startsWith('[')||value.startsWith('{'))return JSON.parse(value);
    return value.replace(/\s+#.*$/,'');
  };
  // Older monthly files use indented YAML arrays instead of inline JSON.
  function legacySections(lines,start){
    const sections=[];let section=null,duty=null,i=start;
    for(;i<lines.length;i++){
      const line=lines[i];if(!line.trim())continue;
      if(!/^\s/.test(line))break;
      let m=line.match(/^  - title:\s*(.*)$/);
      if(m){section={title:scalar(m[1]),duties:[]};sections.push(section);duty=null;continue;}
      if(/^    duties:\s*$/.test(line)&&section)continue;
      m=line.match(/^      - (role|name):\s*(.*)$/);
      if(m&&section){duty={[m[1]]:scalar(m[2])};section.duties.push(duty);continue;}
      m=line.match(/^        (role|name):\s*(.*)$/);
      if(m&&duty){duty[m[1]]=scalar(m[2]);continue;}
      throw Error('Unsupported legacy roster YAML on line '+(i+1)+'. Record was not changed.');
    }
    if(!sections.length||sections.some(section=>section.duties.some(d=>typeof d.name!=='string'||typeof d.role!=='string')))throw Error('Legacy roster has incomplete duties; record was not changed.');
    return {sections,end:i-1};
  }
  // Fail closed on unfamiliar YAML instead of silently replacing old records.
  function parse(content,key){
    const match=content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if(!match)throw Error('Missing or malformed Markdown frontmatter.');
    const data={},lines=match[1].split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const line=lines[i];if(!line.trim()||/^\s*#/.test(line))continue;
      const field=line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
      if(!field)throw Error('Unsupported YAML structure on line '+(i+1)+'. Record was not changed.');
      if(Object.hasOwn(data,field[1]))throw Error('Duplicate field '+field[1]);
      if(!field[2].trim()){
        if(field[1]==='sections'&&key==='sections'){const legacy=legacySections(lines,i+1);data.sections=legacy.sections;i=legacy.end;continue;}
        throw Error('Unsupported multiline field '+field[1]+'. Record was not changed.');
      }
      try{data[field[1]]=scalar(field[2]);}catch{throw Error('Cannot parse '+field[1]+'. Record was not changed.');}
    }
    if(!Array.isArray(data[key]))throw Error('Missing or invalid '+key+' array. Record was not changed.');
    const sections=data[key];
    for(const section of sections)if(!section||typeof section!=='object'||!Array.isArray(section.duties)||section.duties.some(d=>!d||typeof d!=='object'))throw Error('Invalid programme sections. Record was not changed.');
    return {data,body:match[2],raw:content};
  }
  const serialize=record=>{
    const {data,body}=record;
    const yaml=v=>typeof v==='string'?JSON.stringify(v):JSON.stringify(v);
    return '---\n'+Object.entries(data).map(([key,value])=>key+': '+yaml(value)).join('\n')+'\n---\n'+body;
  };
  const clone=value=>JSON.parse(JSON.stringify(value));
  window.SihphirScheduleManager={parse,serialize,async mount({area,api,esc,notification}){
    const config=configs[area];if(!config)throw Error('Unknown schedule module');
    const host=document.querySelector('#view');
    let files=[],selected=null,sha=null,record=null,dirty=false,busy=false,loadError='',mounted=true;
    const confirmDiscard=()=>!dirty||confirm('You have unsaved changes. Discard them?');
    const beforeUnload=event=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload);
    window.__sihphirScheduleCleanup=()=>{if(!mounted)return true;if(!confirmDiscard())return false;mounted=false;window.removeEventListener('beforeunload',beforeUnload);return true;};
    const mark=()=>{dirty=true;const state=host.querySelector('#schedule-save-state');if(state)state.textContent='Unsaved changes';};
    const fresh=()=>({data:{[config.identity]:config.defaultValue(),status:'upcoming',[config.key]:config.empty(),...(area==='hun-ruatna'?{week_end:''}:{})},body:''});
    const refresh=async()=>{files=(await api('/api/admin/content?area='+encodeURIComponent(config.area))).items||[];files.sort((a,b)=>b.path.localeCompare(a.path));};
    const load=async path=>{
      if(busy||!confirmDiscard())return;
      busy=true;loadError='';
      try{
        const response=await api('/api/admin/content?path='+encodeURIComponent(path));
        const parsed=parse(response.content,config.key);
        record=parsed;sha=response.sha;selected=path;dirty=false;
      }catch(error){loadError=error.message;notification(error.message,'error');}
      finally{busy=false;draw();}
    };
    const collect=()=>{
      const form=host.querySelector('#schedule-form');if(!form||!record)return;
      const values=new FormData(form);
      record.data[config.identity]=String(values.get(config.identity)||'');
      if(area==='hun-ruatna')record.data.week_end=String(values.get('week_end')||'');
      record.data.status=String(values.get('status')||'upcoming');
    };
    const draw=()=>{
      if(!mounted)return;
      const data=record?.data,sections=data?.[config.key]||[];
      const label=area==='hun-ruatna'?'day':'title';
      host.innerHTML='<div class="worship-layout"><section class="panel worship-weeks"><div class="panel-head"><div><h2>'+config.label+'s</h2><p>Published and archived records remain editable.</p></div><button type="button" id="schedule-new">'+config.newLabel+'</button></div><div id="week-list">'+(files.map(f=>'<button type="button" data-schedule="'+esc(f.path)+'" class="'+(f.path===selected?'selected':'')+'">'+esc(f.label.replace(/\.md$/,''))+'</button>').join('')||'<p class="muted">No saved records.</p>')+'</div></section><section class="panel worship-form">'+(loadError?'<p role="alert" class="schedule-error">'+esc(loadError)+'</p>':'')+(record?'<form id="schedule-form"><div class="edit-head"><div><span class="status" id="schedule-save-state">'+(dirty?'Unsaved changes':'Saved record / ready to edit')+'</span><h2>'+config.title+'</h2></div><div><button type="button" id="schedule-duplicate">Duplicate</button><button type="button" id="schedule-archive">'+(data.status==='archived'?'Restore':'Archive')+'</button><button class="gold" type="submit" '+(busy?'disabled':'')+'>Save '+config.label.toLowerCase()+'</button></div></div><div class="home-fields"><label>'+config.label+' <input name="'+config.identity+'" type="'+(area==='hun-ruatna'?'date':'text')+'" required value="'+esc(data[config.identity]||'')+'"></label>'+(area==='hun-ruatna'?'<label>Week end <input name="week_end" type="date" value="'+esc(data.week_end||'')+'"></label>':'')+'<label>Status <select name="status">'+['current','upcoming','archived'].map(x=>'<option value="'+x+'" '+(data.status===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label></div><div id="schedule-sections">'+sections.map((section,i)=>'<section class="programme-section"><div><input data-section="'+i+'" value="'+esc(section[label]||'')+'" placeholder="Programme section"><button type="button" data-remove-section="'+i+'" class="danger">Remove section</button></div><div class="programme-items">'+section.duties.map((duty,j)=>'<article class="programme-row">'+(area==='hun-ruatna'?['time','title','person_responsible','speaker','bible_text','notes']:['name','role']).map(field=>'<label>'+field.replace(/_/g,' ')+'<input data-duty="'+i+':'+j+'" data-field="'+field+'" value="'+esc(duty[field]??(field==='title'?duty.role:field==='person_responsible'?duty.name:''))+'"></label>').join('')+'<button type="button" data-duplicate-duty="'+i+':'+j+'">Duplicate</button><button type="button" class="danger" data-remove-duty="'+i+':'+j+'">Remove</button></article>').join('')+'<button type="button" data-add-duty="'+i+'">Add row</button></div></section>').join('')+'<button type="button" id="schedule-add-section">Add section</button></div></form>':'<p class="muted">Select a saved record or create a new one.</p>')+'</section></div>';
      host.querySelectorAll('[data-schedule]').forEach(button=>button.onclick=()=>{collect();load(button.dataset.schedule);});
      host.querySelector('#schedule-new').onclick=()=>{collect();if(!confirmDiscard())return;selected=null;sha=null;record=fresh();dirty=false;loadError='';draw();};
      if(!record)return;
      const form=host.querySelector('#schedule-form');
      form.addEventListener('input',event=>{
        const target=event.target;
        if(target.dataset.section!==undefined)record.data[config.key][Number(target.dataset.section)][label]=target.value;
        if(target.dataset.duty){const [i,j]=target.dataset.duty.split(':').map(Number);const duty=record.data[config.key][i].duties[j];duty[target.dataset.field]=target.value;if(area==='hun-ruatna'){if(target.dataset.field==='title')duty.role=target.value;if(target.dataset.field==='person_responsible')duty.name=target.value;}}
        mark();
      });
      form.addEventListener('change',mark);
      form.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button)return;
        const section=button.dataset.addDuty??button.dataset.removeSection;
        if(button.dataset.addDuty!==undefined){collect();record.data[config.key][Number(section)].duties.push(area==='hun-ruatna'?{role:'',name:''}:{name:'',role:''});mark();draw();}
        if(button.dataset.removeSection!==undefined){collect();record.data[config.key].splice(Number(section),1);mark();draw();}
        if(button.dataset.removeDuty||button.dataset.duplicateDuty){collect();const [i,j]=(button.dataset.removeDuty||button.dataset.duplicateDuty).split(':').map(Number);const duties=record.data[config.key][i].duties;if(button.dataset.removeDuty)duties.splice(j,1);else duties.splice(j+1,0,clone(duties[j]));mark();draw();}
      });
      host.querySelector('#schedule-add-section').onclick=()=>{collect();record.data[config.key].push(area==='hun-ruatna'?{day:'New section',duties:[]}:{title:'New category',duties:[]});mark();draw();};
      host.querySelector('#schedule-archive').onclick=()=>{collect();record.data.status=record.data.status==='archived'?'upcoming':'archived';mark();draw();};
      host.querySelector('#schedule-duplicate').onclick=()=>{collect();if(!confirmDiscard())return;record=clone(record);record.data=clone(record.data);record.data[config.identity]=config.defaultValue();record.data.status='upcoming';selected=null;sha=null;dirty=true;draw();};
      form.onsubmit=async event=>{
        event.preventDefault();if(busy)return;collect();
        const identity=record.data[config.identity];
        if(!selected&&!/^\d{4}-\d{2}(-\d{2})?$/.test(identity))return notification('Choose a valid '+config.label.toLowerCase()+'.','error');
        const path=selected||config.root+identity+'.md';
        if(!selected&&files.some(f=>f.path===path))return notification('This '+config.label.toLowerCase()+' already exists. Select it to edit instead.','error');
        busy=true;
        try{
          const result=await api('/api/admin/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({path,expectedSha:sha,content:serialize(record),message:'admin: save '+config.title})});
          selected=path;sha=result.sha;dirty=false;notification(config.title+' saved.');
          await refresh();
          const saved=await api('/api/admin/content?path='+encodeURIComponent(path));
          record=parse(saved.content,config.key);sha=saved.sha;draw();
        }catch(error){notification(error.message,'error');mark();draw();}
        finally{busy=false;}
      };
    };
    try{await refresh();if(files.length)await load(files[0].path);else{record=fresh();draw();}}catch(error){loadError=error.message;draw();notification(error.message,'error');}
  }};
})();
