/* Accessible confirmation shared by schedule and notice editors. */
(()=>{
  window.SihphirConfirmRecordDelete=({title,description})=>new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    dialog.className='cms-record-delete-dialog';
    const heading=document.createElement('h2');heading.textContent=title;
    const details=document.createElement('p');details.textContent=description;
    const warning=document.createElement('p');warning.textContent='This permanently deletes the record from the repository. It will disappear from the published website after the next successful deployment. Attached media files are not deleted.';
    const actions=document.createElement('div');actions.className='cms-record-delete-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    const remove=document.createElement('button');remove.type='button';remove.className='cms-record-delete-confirm';remove.textContent='Delete permanently';
    actions.append(cancel,remove);dialog.append(heading,details,warning,actions);
    let finished=false;
    const finish=value=>{if(finished)return;finished=true;dialog.close();dialog.remove();resolve(value);};
    cancel.addEventListener('click',()=>finish(false));
    remove.addEventListener('click',()=>finish(true));
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    document.body.append(dialog);dialog.showModal();cancel.focus();
  });
})();
