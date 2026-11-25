(()=>{const safeUrl=(value,{image=false}={})=>{const raw=String(value??'').trim();if(!raw)return'';if(/^(?:\/(?!\/)|\.\/?|\.\.\/|#|\?)/.test(raw))return raw;try{const u=new URL(raw);if(u.protocol==='https:'||u.protocol==='http:')return raw;if(!image&&u.protocol==='mailto:')return raw;return''}catch{return''}};
const alignmentTags=new Set(['P','DIV','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','LI','UL','OL','PRE','TD','TH','FIGCAPTION']);
const validAlignment=value=>/^(left|center|right|justify)$/.test(String(value||'').trim().toLowerCase())?String(value).trim().toLowerCase():'';
const alignmentFromStyle=value=>{let alignment='';for(const declaration of String(value||'').split(';')){const match=declaration.match(/^\s*text-align\s*:\s*(left|center|right|justify)\s*$/i);if(match)alignment=validAlignment(match[1]);}return alignment;};
const sanitizeHtml=(html,{media=true}={})=>{const doc=new DOMParser().parseFromString(String(html||''),'text/html');doc.querySelectorAll('script,style,meta,link,object,embed,svg,math,form,input,button,textarea,select,video,audio,template').forEach(node=>node.remove());const allowed=new Set(['P','DIV','BR','HR','STRONG','B','EM','I','U','S','DEL','UL','OL','LI','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','A','PRE','CODE']);if(media)['IMG','IFRAME','TABLE','THEAD','TBODY','TR','TH','TD','FIGURE','FIGCAPTION'].forEach(tag=>allowed.add(tag));[...doc.body.querySelectorAll('*')].forEach(node=>{const tag=node.tagName;if(!allowed.has(tag)){node.replaceWith(...node.childNodes);return;}const alignment=alignmentTags.has(tag)?alignmentFromStyle(node.getAttribute('style'))||validAlignment(node.getAttribute('align')):'';for(const attr of [...node.attributes]){const name=attr.name.toLowerCase();if(tag==='A'&&name==='href'){const href=safeUrl(attr.value);if(href){node.setAttribute('href',href);node.setAttribute('rel','nofollow noopener noreferrer');}else node.removeAttribute('href');}else if(tag==='A'&&name==='target'&&attr.value==='_blank'){}else if(tag==='IMG'&&name==='src'){const src=safeUrl(attr.value,{image:true});if(src)node.setAttribute('src',src);else node.removeAttribute('src');}else if(tag==='IMG'&&['alt','title'].includes(name)){}else if(tag==='IFRAME'&&name==='src'){try{const u=new URL(attr.value);if(u.protocol==='https:'&&['www.youtube-nocookie.com','www.youtube.com'].includes(u.hostname)&&/^\/embed\/[\w-]{11}$/.test(u.pathname))node.setAttribute('src',u.href);else node.remove();}catch{node.remove();}}else if(tag==='IFRAME'&&['title','allowfullscreen','loading'].includes(name)){}else if(tag==='DIV'&&name==='class'&&attr.value.split(/\s+/).includes('video-embed'))node.setAttribute('class','video-embed');else node.removeAttribute(attr.name);}if(alignment)node.setAttribute('style','text-align: '+alignment+';');if(tag==='A'&&node.hasAttribute('target'))node.setAttribute('rel','nofollow noopener noreferrer');if(tag==='IMG'){if(!node.getAttribute('src'))node.remove();else node.setAttribute('loading','lazy');}if(tag==='IFRAME'&&!node.getAttribute('src'))node.remove();});return doc.body.innerHTML;};
const alignmentCommands=[['justifyLeft','Align Left',[16,10,16,10]],['justifyCenter','Align Center',[16,10,16,10]],['justifyRight','Align Right',[16,10,16,10]],['justifyFull','Justify',[16,16,16,16]]];
const alignmentButtons=()=>alignmentCommands.map(([command,label,lengths],index)=>'<button type="button" data-rich-align="'+command+'" title="'+label+'" aria-label="'+label+'"><svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'+lengths.map((length,i)=>{const x=index===1?(20-length)/2:index===2?18-length:2;return '<path d="M'+x+' '+(4+i*4)+'h'+length+'"/>';}).join('')+'</svg></button>').join('');
const bindAlignment=(editor,toolbar)=>{
 if(!toolbar||toolbar.querySelector('[data-rich-align]'))return;
 toolbar.insertAdjacentHTML('beforeend',alignmentButtons());
 let savedRange=null;
 const selection=()=>editor.ownerDocument.getSelection();
 const remember=()=>{const current=selection();if(current?.rangeCount&&editor.contains(current.anchorNode)&&editor.contains(current.focusNode))savedRange=current.getRangeAt(0).cloneRange();};
 for(const event of ['keyup','mouseup','input','focusout'])editor.addEventListener(event,remember);
 toolbar.addEventListener('mousedown',event=>{if(event.target.closest('[data-rich-align]')){remember();event.preventDefault();}});
 toolbar.addEventListener('click',event=>{
  const button=event.target.closest('[data-rich-align]');if(!button||!alignmentCommands.some(([command])=>command===button.dataset.richAlign))return;
  remember();if(!savedRange||!editor.contains(savedRange.commonAncestorContainer))return;
  editor.focus();const current=selection();current.removeAllRanges();current.addRange(savedRange);
  editor.ownerDocument.execCommand(button.dataset.richAlign,false,null);
  remember();editor.dispatchEvent(new Event('input',{bubbles:true}));
 });
};
const bindPaste=(editor,options={})=>{const toolbar=editor.previousElementSibling;if(toolbar?.matches('.fellowship-rich-toolbar,.page-toolbar,.ministry-rich-toolbar,.school-rich-toolbar,.home-rich-toolbar'))bindAlignment(editor,toolbar);return editor.addEventListener('paste',event=>{const html=event.clipboardData?.getData('text/html');if(!html)return;event.preventDefault();document.execCommand('insertHTML',false,sanitizeHtml(html,options));});};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const field=({key,label,value=''})=>{
 const id='school-rich-'+String(key).replace(/[^a-z0-9_-]/gi,'-');
 const safeKey=escapeHtml(key),safeLabel=escapeHtml(label);
 const commands=[['bold','B','Bold'],['italic','I','Italic'],['underline','U','Underline'],['insertUnorderedList','• List','Bulleted list'],['insertOrderedList','1. List','Numbered list'],['formatBlock:h2','H2','Heading 2'],['formatBlock:h3','H3','Heading 3'],['blockquote','Quote','Block quote'],['createLink','Link','Insert link']];
 return `<div class="school-rich-field"><label class="school-rich-label" for="${id}">${safeLabel}</label><div class="school-rich-toolbar" role="toolbar" aria-label="${safeLabel} formatting">${commands.map(([command,text,title])=>`<button type="button" data-rich-command="${command}" title="${title}" aria-label="${title}">${text}</button>`).join('')}</div><div id="${id}" class="school-rich-editor rich" data-rich-editor data-rich-key="${safeKey}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${safeLabel}">${String(value??'')}</div></div>`;
};
const mount=(host,onChange=()=>{})=>{
 const editors=[...host.querySelectorAll('[data-rich-editor]')];
 editors.forEach(editor=>{
  const toolbar=editor.parentElement.querySelector('.school-rich-toolbar');
  bindPaste(editor);
  editor.addEventListener('input',()=>onChange(editor.dataset.richKey,editor.innerHTML));
  if(!toolbar)return;
  toolbar.addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault();});
  toolbar.addEventListener('click',event=>{
   const button=event.target.closest('[data-rich-command]');if(!button)return;
   editor.focus();
   const command=button.dataset.richCommand;
   if(command.startsWith('formatBlock:'))document.execCommand('formatBlock',false,`<${command.split(':')[1]}>`);
   else if(command==='createLink'){const url=prompt('Paste a web address');const safe=safeUrl(url);if(safe)document.execCommand('createLink',false,safe);}
   else document.execCommand(command,false,null);
   editor.dispatchEvent(new Event('input',{bubbles:true}));
  });
 });
 return editors.length;
};
const read=host=>Object.fromEntries([...host.querySelectorAll('[data-rich-editor]')].map(editor=>[editor.dataset.richKey,editor.innerHTML]));
window.SihphirRichTextEditor={safeUrl,sanitizeHtml,bindPaste,field,mount,read,bindAlignment};})();
