/* Gallery Management workspace. Loaded only by the Gallery CMS route. */
(() => {
  const copyCategoryLink = async (name, pathname, notification) => {
    const origin = window.SIHPHIR_PUBLIC_SITE_ORIGIN;
    if (!origin || !String(name || '').trim()) return notification('A category name is required to copy its link.', 'error');
    const url = new URL(`${pathname}?category=${encodeURIComponent(name.trim())}`, origin).toString();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Clipboard access is unavailable.');
      }
      notification('Copied!');
    } catch {
      notification('Could not copy link. Check your browser clipboard permissions.', 'error');
    }
  };
  const DEFAULT_CATEGORIES = ['Biak In','Committee','Pastors','Elders','Missionaries','Fellowship','Social Front','Events','History','Youth','Children','Other'];
  const SETTINGS_PATH = 'src/content/settings/gallery-categories.json';
  const copyAbsoluteLink = async (url, notification) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Clipboard access is unavailable.');
      }
      notification('Copied!');
    } catch {
      notification('Could not copy link. Check your browser clipboard permissions.', 'error');
    }
  };

  const GALLERY_ROOT = 'src/content/gallery/';

  const unquote = value => {
    const text = String(value ?? '').trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      try { return text.startsWith('"') ? JSON.parse(text) : text.slice(1, -1).replace(/''/g, "'"); } catch { return text.slice(1, -1); }
    }
    return text;
  };
  const scalar = value => {
    const text = String(value ?? '').trim();
    if (text === 'true' || text === 'false') return text === 'true';
    if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
    if (/^[\[{]/.test(text)) { try { return JSON.parse(text); } catch {} }
    return unquote(text);
  };
  const parseGallery = content => {
    const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if (!match) return { data: { caption: 'Untitled Gallery', yearType: 'unspecified', category: 'Other', photos: [] }, body: content };
    const data = {}, lines = match[1].split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const field = lines[index].match(/^([\w_]+):\s*(.*)$/); if (!field) continue;
      const [, key, raw] = field;
      if ((key === 'photos' || key === 'owners') && !raw.trim()) {
        const photos = [];
        while (lines[index + 1]?.match(/^\s*-\s+/)) photos.push(scalar(lines[++index].replace(/^\s*-\s+/, '')));
        data[key] = photos;
      } else data[key] = key==='owners' && /^\[.*\]$/.test(raw.trim()) && !Array.isArray(scalar(raw)) ? raw.trim().slice(1,-1).split(',').map(unquote).filter(Boolean) : scalar(raw);
    }
    return { data, body: match[2] || '' };
  };
  const yaml = value => typeof value === 'boolean' || typeof value === 'number' ? String(value) : !value ? '' : /[:#\n\[\]{}]/.test(String(value)) ? JSON.stringify(String(value)) : String(value);
  const serializeGallery = (data, body = '') => {
    const fields = ['caption','year','yearType','owner','owners','category','date','description','status','photo','album_url','display_order','photos','tags'];
    const lines = fields.filter(key => data[key] !== '' && data[key] !== undefined && data[key] !== null && !(Array.isArray(data[key]) && !data[key].length)).map(key => `${key}: ${Array.isArray(data[key]) ? JSON.stringify(data[key]) : yaml(data[key])}`);
    return `---\n${lines.join('\n')}\n---\n${body || ''}`;
  };
  const normalizePhotos = data => {
    const source = Array.isArray(data.photos) && data.photos.length ? data.photos : data.photo ? [data.photo] : [];
    return source.map((photo, index) => typeof photo === 'string' ? { src: photo, caption: '', alt: '', filename: photo.split('/').pop() || `image-${index + 1}` } : { src: photo.src || photo.photo || '', caption: photo.caption || '', alt: photo.alt || '', filename: photo.filename || (photo.src || photo.photo || '').split('/').pop() || `image-${index + 1}` }).filter(photo => photo.src);
  };
  const encodePhotos = photos => photos.map(photo => photo.caption || photo.alt ? { src: photo.src, caption: photo.caption || '', alt: photo.alt || '' } : photo.src);

  window.SihphirGalleryManager = {
    async mount({ api, esc, slug, notification, readUpload }) {
      const { loadContentOwners, renderDisplayLocations, canSaveOwners, normalizeContentOwners, readDisplayLocations, loadLibraryRecords } = await import('./content-owners.js').catch(() => null) || {};
      if (typeof normalizeContentOwners !== 'function' || typeof loadLibraryRecords !== 'function') {
        document.querySelector('#view').innerHTML = '<section class="panel" role="alert"><h2>Admin update required</h2><p>Admin scripts could not load. Reload this page before continuing.</p><button type="button" id="admin-reload">Reload admin</button></section>';
        document.querySelector('#admin-reload').onclick = () => location.reload();
        return;
      }
      let contentOwners = [['kohhran','Kohhran']];
      const displayLocations = data => renderDisplayLocations(contentOwners, data, esc);
      const refreshOwners = async () => { try { contentOwners = await loadContentOwners(api); } catch (error) { notification('Fellowship owners could not load; saved owner values remain available.', 'error'); } };
      window.__sihphirGalleryCleanup?.();
      const host = document.querySelector('#view');
      let loadWarning='';
      let records = [], categories = [], selected = null, baseline = '', dirty = false, search = '', yearFilter = 'all', categoryFilter = 'all', previewIndex = 0, uploadCount = 0;
      const onBeforeUnload = event => { if (!dirty) return; event.preventDefault(); event.returnValue = ''; };
      const navigationGuard = event => { const button=event.target.closest('.side nav button');if(!button||!dirty)return;if(!confirm('Leave Gallery Management and discard unsaved changes?')){event.preventDefault();event.stopImmediatePropagation();}else dirty=false; };
      window.addEventListener('beforeunload', onBeforeUnload);
      document.addEventListener('click', navigationGuard, true);
      window.__sihphirGalleryCleanup=()=>{window.removeEventListener('beforeunload',onBeforeUnload);document.removeEventListener('click',navigationGuard,true);};

      const markDirty = () => { dirty = true; document.querySelector('#gallery-save-state')?.replaceChildren('Unsaved changes'); };
      const confirmLeave = () => !dirty || confirm('Discard unsaved gallery changes?');
      const loadCategories = async () => {
        try { const file = await api(`/api/admin/content?path=${encodeURIComponent(SETTINGS_PATH)}`); const parsed = JSON.parse(file.content); categories = Array.isArray(parsed.categories) ? parsed.categories : []; }
        catch { categories = []; }
        if (!categories.length) categories = DEFAULT_CATEGORIES.map(name => ({ id: slug(name), name }));
      };
      const loadRecords = async () => {
const loaded=await loadLibraryRecords(api,'gallery',parseGallery,(item,parsed)=>({path:item.path,originalOwners:normalizeContentOwners(parsed.data),body:parsed.body,data:parsed.data,photos:normalizePhotos(parsed.data),modifiedAt:item.modifiedAt||item.uploadedAt}));
        records=loaded.records;loadWarning=loaded.warning;
        if(loadWarning)notification(loadWarning,'error');
                records = records.filter(Boolean).map(record => { record.data.yearType = record.data.yearType || (record.data.year != null && Number.isFinite(Number(record.data.year)) ? 'known' : 'unspecified'); return record; }).sort((a,b) => { const ay=a.data.yearType==='unspecified'?null:Number(a.data.year), by=b.data.yearType==='unspecified'?null:Number(b.data.year); if(ay===null||by===null){if(ay===null&&by===null)return Number(a.data.display_order||0)-Number(b.data.display_order||0);return ay===null?1:-1;} return by-ay || Number(a.data.display_order||0)-Number(b.data.display_order||0); });
      };
      const dateText = value => value ? new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(value)) : 'Date unavailable';
      const yearType = data => data.yearType || (data.year != null ? 'known' : 'unspecified');
      const yearLabel = data => yearType(data)==='unspecified'?'Year Unspecified':yearType(data)==='approximate'?`Circa ${data.year}`:String(data.year);
      const yearOptions = active => {
        const years = new Set(Array.from({length:16},(_,i)=>2020+i)); records.forEach(record => years.add(Number(record.data.year))); if (active) years.add(Number(active));
        return [...years].filter(Number.isFinite).sort((a,b)=>b-a).map(year => `<option value="${year}" ${Number(active)===year?'selected':''}>${year}</option>`).join('') + '<option value="custom">+ Add another year…</option>';
      };
      const categoryOptions = active => categories.map(category => `<option value="${esc(category.name)}" ${category.name===active?'selected':''}>${esc(category.name)}</option>`).join('');
      const renderShell = () => {
        const years = [...new Set(records.filter(record=>yearType(record.data)!=='unspecified').map(record=>record.data.year).filter(Boolean))].sort((a,b)=>b-a);
        const visible = records.filter(record => `${record.data.caption || ''} ${record.data.description || ''}`.toLowerCase().includes(search.toLowerCase()) && (yearFilter==='all'||(yearFilter==='unspecified'?yearType(record.data)==='unspecified':yearType(record.data)!=='unspecified'&&String(record.data.year)===yearFilter)) && (categoryFilter==='all'||record.data.category===categoryFilter));
        host.innerHTML = `<div class="gallery-workspace"><aside class="panel gallery-library"><div class="gallery-library-head"><div><h2>Galleries</h2><p>${records.length} gallery record${records.length===1?'':'s'}</p></div></div>${loadWarning?'<p role="alert" class="muted">'+esc(loadWarning)+'</p>':''}<div class="gallery-library-actions"><button class="gold" id="gallery-new">+ New Gallery</button><button id="gallery-new-category">+ New Category</button></div><div class="gallery-library-tools"><label class="search">⌕ <input id="gallery-search" placeholder="Search galleries…" value="${esc(search)}"></label><div><select id="gallery-year"><option value="all">All Years</option>${years.map(year=>`<option value="${year}" ${String(year)===yearFilter?'selected':''}>${year}</option>`).join('')}${records.some(record=>yearType(record.data)==='unspecified')?`<option value="unspecified" ${yearFilter==='unspecified'?'selected':''}>Year Unspecified</option>`:''}</select><select id="gallery-category"><option value="all">All categories</option>${categories.map(category=>`<option value="${esc(category.name)}" ${category.name===categoryFilter?'selected':''}>${esc(category.name)}</option>`).join('')}</select></div></div><div class="gallery-library-list">${visible.map(record=>{const cover=record.data.photo||record.photos[0]?.src;return `<button class="gallery-record ${selected?.path===record.path?'selected':''}" data-gallery-path="${esc(record.path)}">${cover?`<img src="${esc(cover)}" alt="">`:'<span class="gallery-record-empty">▧</span>'}<span><b>${esc(record.data.caption||'Untitled Gallery')}</b><small>${esc(yearLabel(record.data))} · ${esc(record.data.category||'Uncategorised')}</small><small>${record.photos.length} photo${record.photos.length===1?'':'s'} · ${dateText(record.modifiedAt)}</small></span></button>`;}).join('')||'<div class="gallery-library-empty">No galleries match these filters.</div>'}</div></aside><main class="panel gallery-editor-panel" id="gallery-editor-panel">${selected?editorTemplate():'<div class="gallery-welcome"><i>▧</i><h2>Gallery Management</h2><p>No gallery is available yet.</p><button class="gold" id="gallery-empty-new">+ New Gallery</button></div>'}</main></div><div id="gallery-dialog-root"></div>`;
        bindShell(); if (selected) bindEditor();
      };
      const editorTemplate = () => {
        const data=selected.data, photos=selected.photos, cover=data.photo||photos[0]?.src||'';
        return `<form class="gallery-professional-editor" id="gallery-editor-form"><header class="gallery-editor-head"><div><span class="status" id="gallery-save-state">${selected.isNew?'New gallery':'Saved'}</span><h2>${esc(data.caption||'Untitled Gallery')}</h2><p>Manage gallery details and photographs.</p></div><div class="gallery-editor-actions"><button type="button" class="danger" id="gallery-delete">Delete Gallery</button><button type="button" id="gallery-copy-link" ${selected.isNew||!selected.path?'disabled':''}>Copy Album Link</button><button class="gold" id="gallery-save" ${uploadCount?'disabled':''}>Save Gallery</button></div></header><section class="gallery-details"><label><span>Gallery title</span><input name="caption" value="${esc(data.caption||'')}"></label><label class="gallery-year-information"><span>Year Information</span><select name="yearType" id="gallery-year-type"><option value="known" ${yearType(data)==='known'?'selected':''}>Known Year</option><option value="approximate" ${yearType(data)==='approximate'?'selected':''}>Approximate Year</option><option value="unspecified" ${yearType(data)==='unspecified'?'selected':''}>Year Unspecified</option></select></label><label id="gallery-year-value-wrap" ${yearType(data)==='unspecified'?'hidden':''} style="display:${yearType(data)==='unspecified'?'none':''}"><span>Year</span><input name="year" id="gallery-year-value" type="number" min="1" max="9999" value="${esc(data.year??'')}" ${yearType(data)==='unspecified'?'':'required'}></label>${displayLocations(data)}<label><span>Category</span><select name="category">${categoryOptions(data.category)}</select></label><label><span>Album URL / More Photos URL (optional)</span><input name="album_url" type="url" value="${esc(data.album_url||'')}" placeholder="https://photos.google.com/..."></label><label class="gallery-description"><span>Description</span><textarea name="description" rows="3">${esc(data.description||'')}</textarea></label></section><section class="gallery-photo-section"><div class="gallery-photo-head"><div><h3>Photos</h3><p>Drag cards to reorder.</p></div><div><span>${photos.length} photo${photos.length===1?'':'s'}</span><button type="button" class="gold" id="gallery-upload-photos">Upload Photos</button></div></div><div class="gallery-upload-zone" id="gallery-upload-zone" tabindex="0"><b>Drop multiple photos here</b><span>or</span><button type="button" id="gallery-browse">Upload Photos</button><small id="gallery-upload-status">JPEG, PNG, WebP or GIF · up to 10 MB each</small><input id="gallery-file-input" type="file" accept="image/*" multiple hidden></div><div class="gallery-assets" id="gallery-assets">${photoCards()}</div></section></form><div class="gallery-lightbox" id="gallery-lightbox" hidden role="dialog" aria-modal="true"><button type="button" class="gallery-lightbox-close" aria-label="Close">×</button><button type="button" class="gallery-lightbox-prev" aria-label="Previous">‹</button><figure><img alt=""><figcaption></figcaption></figure><button type="button" class="gallery-lightbox-next" aria-label="Next">›</button></div>`;
      };
      const photoCards = () => selected.photos.length ? selected.photos.map((photo,index)=>`<article class="gallery-asset" draggable="true" data-photo-index="${index}"><div class="gallery-asset-media"><button type="button" class="gallery-drag" title="Drag to reorder" aria-label="Drag image ${index+1}">⋮⋮</button><span class="gallery-order">${index+1}</span><button type="button" class="gallery-asset-preview" data-photo-preview="${index}"><img src="${esc(photo.src)}" alt="${esc(photo.alt)}"></button>${selected.data.photo===photo.src?'<span class="gallery-featured">Featured</span>':''}${photo.uploading?'<span class="gallery-uploading">Uploading…</span>':''}</div><div class="gallery-asset-fields"><label><span>Caption</span><input data-photo-field="caption" data-photo-index="${index}" value="${esc(photo.caption)}"></label><label><span>Alt text</span><input data-photo-field="alt" data-photo-index="${index}" value="${esc(photo.alt)}"></label><div class="gallery-file-row"><span title="${esc(photo.filename)}">${esc(photo.filename)}</span><button type="button" data-photo-feature="${index}">Set featured</button><button type="button" class="danger" data-photo-delete="${index}">Delete</button></div></div></article>`).join('') : '<div class="gallery-no-photos"><b>No photos yet</b><span>Upload one or more images to begin this gallery.</span></div>';

      const bindShell = () => {
        document.querySelector('#gallery-search').oninput = event => { search=event.target.value; renderShell(); document.querySelector('#gallery-search')?.focus(); };
        document.querySelector('#gallery-year').onchange = event => { yearFilter=event.target.value; renderShell(); };
        document.querySelector('#gallery-category').onchange = event => { categoryFilter=event.target.value; renderShell(); };
        document.querySelector('#gallery-new').onclick = createGallery; document.querySelector('#gallery-empty-new')?.addEventListener('click',createGallery);
        document.querySelector('#gallery-new-category').onclick = () => manageCategories(true);
        document.querySelectorAll('[data-gallery-path]').forEach(button=>button.onclick=()=>selectGallery(button.dataset.galleryPath));
      };
      const syncForm = form => { const values=new FormData(form);selected.data.caption=String(values.get('caption')||'').trim();selected.data.yearType=String(values.get('yearType')||'known');if(selected.data.yearType==='unspecified')delete selected.data.year;else selected.data.year=Number(values.get('year'));selected.data.owners=readDisplayLocations(values);delete selected.data.owner;selected.data.category=String(values.get('category')||'Other');selected.data.album_url=String(values.get('album_url')||'').trim();selected.data.description=String(values.get('description')||'');selected.data.photos=encodePhotos(selected.photos);selected.data.photo=selected.data.photo||selected.photos[0]?.src||''; };
      const bindEditor = () => {
        const form=document.querySelector('#gallery-editor-form'), assets=document.querySelector('#gallery-assets'), input=document.querySelector('#gallery-file-input'), zone=document.querySelector('#gallery-upload-zone'), lightbox=document.querySelector('#gallery-lightbox');
        form.addEventListener('input',markDirty); form.addEventListener('change',event=>{if(event.target.id==='gallery-year-type'){const unspecified=event.target.value==='unspecified',wrap=document.querySelector('#gallery-year-value-wrap'),input=document.querySelector('#gallery-year-value');wrap.hidden=unspecified;wrap.style.display=unspecified?'none':'';input.required=!unspecified;}markDirty();});
        form.onsubmit=saveGallery; document.querySelector('#gallery-delete').onclick=deleteGallery;
        document.querySelector('#gallery-copy-link').onclick=async()=>{
          if(!selected||selected.isNew||!selected.path)return;
          const identifier=selected.path.startsWith(GALLERY_ROOT)?selected.path.slice(GALLERY_ROOT.length).replace(/\.md$/,''): '';
          if(!identifier)return notification('This gallery has no stable saved identifier.','error');
          const saved=JSON.parse(baseline||'{}'), savedPhotos=Array.isArray(saved.photos)?saved.photos:[], uniqueSources=new Set([...savedPhotos.map(photo=>typeof photo==='string'?photo:photo?.src),saved.data?.photo].filter(Boolean));
          const externalUrl=String(saved.data?.album_url||'').trim();
          let validExternal=false;
          try{const parsed=new URL(externalUrl);validExternal=['http:','https:'].includes(parsed.protocol)&&Boolean(parsed.hostname);}catch{}
          if(uniqueSources.size<=1&&validExternal)return copyAbsoluteLink(externalUrl,notification);
          const origin=window.SIHPHIR_PUBLIC_SITE_ORIGIN;
          if(!origin)return notification('The production website address is unavailable.','error');
          const url=new URL('/gallery',origin);url.searchParams.set('album',identifier);
          return copyAbsoluteLink(url.toString(),notification);
        };
        document.querySelector('#gallery-upload-photos').onclick=()=>input.click();document.querySelector('#gallery-browse').onclick=()=>input.click(); input.onchange=()=>{uploadPhotos(input.files);input.value='';};
        ['dragenter','dragover'].forEach(name=>zone.addEventListener(name,event=>{event.preventDefault();zone.classList.add('over');}));['dragleave','drop'].forEach(name=>zone.addEventListener(name,event=>{event.preventDefault();zone.classList.remove('over');}));zone.addEventListener('drop',event=>uploadPhotos(event.dataTransfer.files));
        assets.addEventListener('input',event=>{const index=Number(event.target.dataset.photoIndex),field=event.target.dataset.photoField;if(field&&selected.photos[index]){selected.photos[index][field]=event.target.value;markDirty();}});
        assets.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.photoPreview!==undefined)return openLightbox(Number(button.dataset.photoPreview));if(button.dataset.photoFeature!==undefined){selected.data.photo=selected.photos[Number(button.dataset.photoFeature)].src;markDirty();renderShell();}if(button.dataset.photoDelete!==undefined){const index=Number(button.dataset.photoDelete);if(confirm('Remove this photo from the gallery?')){const [removed]=selected.photos.splice(index,1);if(selected.data.photo===removed.src)selected.data.photo=selected.photos[0]?.src||'';markDirty();renderShell();}}});
        let from=null;assets.addEventListener('dragstart',event=>{const card=event.target.closest('[data-photo-index]');if(card){from=Number(card.dataset.photoIndex);card.classList.add('dragging');}});assets.addEventListener('dragend',event=>event.target.closest('[data-photo-index]')?.classList.remove('dragging'));assets.addEventListener('dragover',event=>event.preventDefault());assets.addEventListener('drop',event=>{event.preventDefault();const card=event.target.closest('[data-photo-index]');if(from===null||!card)return;const to=Number(card.dataset.photoIndex);if(from!==to){const [photo]=selected.photos.splice(from,1);selected.photos.splice(to,0,photo);markDirty();renderShell();}from=null;});
        lightbox.querySelector('.gallery-lightbox-close').onclick=()=>lightbox.hidden=true;lightbox.querySelector('.gallery-lightbox-prev').onclick=()=>showLightbox(previewIndex-1);lightbox.querySelector('.gallery-lightbox-next').onclick=()=>showLightbox(previewIndex+1);lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.hidden=true;});
      };
      const selectGallery = path => { if(!confirmLeave())return;const record=records.find(item=>item.path===path);if(!record)return notification('This gallery could not be opened.','error');selected=record;baseline=JSON.stringify({data:selected.data,photos:selected.photos,body:selected.body});dirty=false;renderShell(); };
      const createGallery = () => { if(loadWarning)return notification('Reload the complete library before creating records.','error');if(!confirmLeave())return;const category=categories[0]?.name||'Other';selected={path:'',isNew:true,body:'',data:{caption:'New Gallery',yearType:'known',owners:['kohhran'],category,description:'',status:'current',photo:'',album_url:'',display_order:records.length,photos:[]},photos:[]};baseline=JSON.stringify({data:selected.data,photos:[],body:''});dirty=false;renderShell(); };
      const cancelEdit = () => { if(!confirmLeave())return;if(selected.isNew)selected=null;else {const saved=JSON.parse(baseline);selected.data=saved.data;selected.photos=saved.photos;selected.body=saved.body;}dirty=false;renderShell(); };
      const uploadPhotos = files => { const images=[...files].filter(file=>file.type.startsWith('image/'));if(!images.length)return notification('Choose one or more image files.','error');for(const file of images){const photo={src:URL.createObjectURL(file),caption:'',alt:'',filename:file.name,uploading:true};selected.photos.push(photo);uploadCount++;markDirty();renderShell();(async()=>{try{const result=await api('/api/admin/content',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({filename:file.name,data:await readUpload(file),kind:'image'})});URL.revokeObjectURL(photo.src);photo.src=result.url;photo.uploading=false;if(!selected.data.photo)selected.data.photo=photo.src;}catch(error){selected.photos.splice(selected.photos.indexOf(photo),1);notification(error.message,'error');}finally{uploadCount--;renderShell();}})();} };
      const saveGallery = async event => { event.preventDefault();if(uploadCount)return notification('Wait for all photos to finish uploading.','error');syncForm(event.currentTarget);if(!selected.data.caption)return notification('Gallery title is required.','error');if(selected.data.yearType!=='unspecified'&&(!Number.isInteger(Number(selected.data.year))||Number(selected.data.year)<1||Number(selected.data.year)>9999))return notification('Enter a valid year for the selected Year Information type.','error');if(!canSaveOwners(contentOwners,selected.data.owners,selected.originalOwners))return notification('Select at least one valid Display In destination.','error');if(!selected.data.category)return notification('Gallery category is required.','error');if(selected.photos.some(photo=>!photo.src||photo.src.startsWith('blob:')))return notification('An image is still uploading.','error');if(!selected.path){const base=`${GALLERY_ROOT}${slug(selected.data.caption)}${selected.data.year?`-${selected.data.year}`:''}`;let path=`${base}.md`,suffix=2;while(records.some(record=>record.path===path))path=`${base}-${suffix++}.md`;selected.path=path;}const content=serializeGallery(selected.data,selected.body);document.querySelector('#gallery-save').disabled=true;document.querySelector('#gallery-save-state').textContent='Saving…';try{await api('/api/admin/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({path:selected.path,content,message:`admin: save gallery ${selected.data.caption}`})});notification('Gallery saved. The site will publish after deployment.');dirty=false;await loadRecords();selected=records.find(record=>record.path===selected.path);baseline=JSON.stringify({data:selected.data,photos:selected.photos,body:selected.body});renderShell();}catch(error){notification(error.message,'error');document.querySelector('#gallery-save').disabled=false;document.querySelector('#gallery-save-state').textContent='Save failed';} };
      const deleteGallery = async () => { if(!selected||selected.isNew){selected=null;dirty=false;return renderShell();}if(!confirm(`Delete “${selected.data.caption}”? Uploaded image files will remain in the Media Library.`))return;try{await api('/api/admin/content',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({path:selected.path})});records=records.filter(record=>record.path!==selected.path);selected=null;dirty=false;notification('Gallery deleted.');renderShell();}catch(error){notification(error.message,'error');} };
      const previewGallery = () => { const form=document.querySelector('#gallery-editor-form');syncForm(form);document.querySelector('#gallery-dialog-root').innerHTML=`<div class="gallery-preview-dialog" role="dialog" aria-modal="true"><div class="gallery-preview-sheet"><header><div><span>${esc(yearLabel(selected.data))} · ${esc(selected.data.category)}</span><h2>${esc(selected.data.caption)}</h2><p>${esc(selected.data.description||'No description')}</p></div><button id="gallery-preview-close">×</button></header><div>${selected.photos.map(photo=>`<figure><img src="${esc(photo.src)}" alt="${esc(photo.alt)}"><figcaption>${esc(photo.caption||photo.alt||photo.filename)}</figcaption></figure>`).join('')||'<p>No photos in this gallery.</p>'}</div></div></div>`;document.querySelector('#gallery-preview-close').onclick=()=>document.querySelector('#gallery-dialog-root').replaceChildren(); };
      const openLightbox = index => { previewIndex=index;showLightbox(index);document.querySelector('#gallery-lightbox').hidden=false; };
      const showLightbox = index => { if(!selected.photos.length)return;previewIndex=(index+selected.photos.length)%selected.photos.length;const photo=selected.photos[previewIndex],modal=document.querySelector('#gallery-lightbox');modal.querySelector('img').src=photo.src;modal.querySelector('img').alt=photo.alt;modal.querySelector('figcaption').textContent=`${previewIndex+1} / ${selected.photos.length} · ${photo.caption||photo.alt||photo.filename}`; };
      const manageCategories = (startNew=false) => { const draft=categories.map(category=>({...category}));if(startNew)draft.push({id:`category-${Date.now()}`,name:''});const draw=()=>{document.querySelector('#gallery-dialog-root').innerHTML=`<div class="gallery-category-dialog" role="dialog" aria-modal="true"><form class="gallery-category-sheet" id="gallery-category-form"><header><div><h2>${startNew?'New Gallery Category':'Gallery Categories'}</h2><p>Create, rename, delete and sort gallery categories.</p></div><button type="button" id="category-close">×</button></header><div id="category-list">${draft.map((category,index)=>`<div><span class="gallery-category-handle">⋮⋮</span><input data-category-name="${index}" value="${esc(category.name)}" placeholder="Category name"><button type="button" class="category-copy-link" data-category-copy="${index}" aria-label="Copy link for ${esc(category.name)}" ${category.name.trim()?'':'disabled'}>Copy Link</button><button type="button" data-category-up="${index}" ${index===0?'disabled':''}>↑</button><button type="button" data-category-down="${index}" ${index===draft.length-1?'disabled':''}>↓</button><button type="button" class="danger" data-category-delete="${index}">Delete</button></div>`).join('')}</div><footer><button type="button" id="category-add">+ Add category</button><button class="gold">Save Categories</button></footer></form></div>`;const root=document.querySelector('#gallery-dialog-root');if(startNew)root.querySelector(`[data-category-name="${draft.length-1}"]`)?.focus();root.querySelector('#category-close').onclick=()=>root.replaceChildren();root.querySelector('#category-add').onclick=()=>{draft.push({id:`category-${Date.now()}`,name:''});startNew=true;draw();};root.querySelector('#category-list').addEventListener('input',event=>{if(event.target.dataset.categoryName!==undefined){const index=Number(event.target.dataset.categoryName);draft[index].name=event.target.value;const copyButton=root.querySelector(`[data-category-copy="${index}"]`);if(copyButton){copyButton.disabled=!event.target.value.trim();copyButton.setAttribute('aria-label',`Copy link for ${event.target.value.trim()}`);}}});root.querySelector('#category-list').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.categoryCopy!==undefined){const category=draft[Number(button.dataset.categoryCopy)];return copyCategoryLink(category?.name,'/gallery',notification);}const index=Number(button.dataset.categoryUp??button.dataset.categoryDown??button.dataset.categoryDelete);if(button.dataset.categoryDelete!==undefined){const name=draft[index].name;if(records.some(record=>record.data.category===name)&&!confirm(`“${name}” is used by galleries. Remove it from the category list anyway?`))return;draft.splice(index,1);}else{const to=index+(button.dataset.categoryUp!==undefined?-1:1);[draft[index],draft[to]]=[draft[to],draft[index]];}draw();});root.querySelector('#gallery-category-form').onsubmit=async event=>{event.preventDefault();const cleaned=draft.map(category=>({id:slug(category.name)||category.id,name:category.name.trim()})).filter(category=>category.name);if(!cleaned.length)return notification('Keep at least one gallery category.','error');try{await api('/api/admin/content',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({path:SETTINGS_PATH,content:JSON.stringify({categories:cleaned},null,2)+'\n',message:'admin: update gallery categories'})});categories=cleaned;if(selected&&!categories.some(category=>category.name===selected.data.category)){selected.data.category=categories[0].name;markDirty();}notification('Gallery categories saved.');root.replaceChildren();renderShell();}catch(error){notification(error.message,'error');}};};draw(); };

      try { await Promise.all([loadCategories(),loadRecords(),refreshOwners()]); } catch { host.innerHTML='<section class="panel" role="alert"><h2>Gallery could not load</h2><p>Library request failed. Reload and check your session.</p></section>'; return; }
      if(records.length){selected=records[0];baseline=JSON.stringify({data:selected.data,photos:selected.photos,body:selected.body});}
      renderShell();
    }
  };
})();
