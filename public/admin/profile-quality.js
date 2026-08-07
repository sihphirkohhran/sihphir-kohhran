(()=>{
  const EMPTY='/images/profile-placeholder.svg';
  const normalizeImages=root=>root.querySelectorAll?.('img').forEach(image=>{
    const source=image.getAttribute('src')||'';
    if(source.endsWith('/images/pastor.jpg')){image.src=EMPTY;image.alt='';image.dataset.empty='true';}
    image.addEventListener('error',()=>{if(!image.src.endsWith(EMPTY)){image.src=EMPTY;image.alt='';image.dataset.empty='true';}},{once:true});
  });
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>node.nodeType===1&&normalizeImages(node)))).observe(document.documentElement,{childList:true,subtree:true});
  normalizeImages(document);

  const original=window.SihphirSchoolManager.mount;
  window.SihphirSchoolManager.mount=async options=>{
    await original(options);
    if(options.area!=='school')return;
    document.querySelectorAll('textarea[data-field="history"],textarea[data-field="vision_mission"]').forEach(textarea=>{
      const label=textarea.closest('.home-rich-field');if(!label)return;
      const wrap=document.createElement('div');wrap.className='home-rich-wrap';
      wrap.innerHTML=`<div class="home-rich-toolbar" role="toolbar" aria-label="Text formatting">${[['bold','Bold'],['italic','Italic'],['h2','H2'],['h3','H3'],['insertUnorderedList','Bullet list'],['insertOrderedList','Numbered list'],['createLink','Link']].map(([command,text])=>`<button type="button" data-command="${command}">${text}</button>`).join('')}</div><article class="home-rich-editor" contenteditable="true"></article>`;
      const editor=wrap.querySelector('.home-rich-editor');editor.innerHTML=textarea.value||'';textarea.hidden=true;textarea.before(wrap);
      const sync=()=>{textarea.value=editor.innerHTML;textarea.dispatchEvent(new Event('input',{bubbles:true}));};
      editor.addEventListener('input',sync);wrap.querySelector('.home-rich-toolbar').addEventListener('mousedown',event=>event.preventDefault());wrap.querySelector('.home-rich-toolbar').addEventListener('click',event=>{const button=event.target.closest('[data-command]');if(!button)return;editor.focus();const command=button.dataset.command;if(command==='h2'||command==='h3')document.execCommand('formatBlock',false,command);else if(command==='createLink'){const url=prompt('Paste a web address');if(url)document.execCommand(command,false,url);}else document.execCommand(command,false,null);sync();});
    });
  };
})();
