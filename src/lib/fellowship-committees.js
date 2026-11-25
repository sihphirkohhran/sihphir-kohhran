export const legacyFellowshipAssociations = Object.freeze({ktp:'ktp',hmeichhia:'kohhran-hmeichhia',kpp:'kpp',masihi:'masihi-sangati'});
export function associatedFellowship(item) {
  return typeof item.fellowship_slug === 'string' ? item.fellowship_slug : (Object.hasOwn(legacyFellowshipAssociations,item.id) ? legacyFellowshipAssociations[item.id] : '');
}
export function fellowshipCommitteeArchives(masters, entries, slug) {
  if (!slug) return [];
  const seen = new Set();
  return [...masters].sort((a,b)=>(a.display_order??999)-(b.display_order??999))
    .filter(item=>associatedFellowship(item)===slug && !seen.has(item.id) && seen.add(item.id))
    .map(item=>{
      const years=new Set();
      const archives=entries.filter(entry=>entry.data.committee_id===item.id && entry.data.published!==false && entry.data.status!=='archived')
        .sort((a,b)=>b.data.year-a.data.year || (a.data.display_order??999)-(b.data.display_order??999) || a.id.localeCompare(b.id))
        .filter(entry=>!years.has(entry.data.year)&&years.add(entry.data.year));
      return {id:item.id,name:item.name,archives};
    }).filter(item=>item.archives.length);
}
export function committeeDirectory(data) {
  const members=(data.members||[]).map((member,index)=>({name:member.name,designation:member.designation||member.role||'Member',photo:member.photo||'',bio:member.bio||member.notes||'',order:member.display_order??index})).sort((a,b)=>a.order-b.order);
  for(const [name,designation] of [[data.secretary,'Secretary'],[data.chairman,'Chairman']]) {
    if(name?.trim()&&!members.some(member=>member.name.trim().toLowerCase()===name.trim().toLowerCase()))members.unshift({name,designation,photo:'',bio:'',order:-1});
  }
  const roles=['chairman','chairperson','president','vice chairman','vice chairperson','vice president','secretary','joint secretary','assistant secretary','treasurer','financial secretary','finance secretary','adviser','advisor','coordinator'];
  const rank=member=>roles.indexOf(member.designation.trim().toLowerCase());
  return {officeBearers:members.filter(member=>rank(member)>=0).sort((a,b)=>rank(a)-rank(b)),members:members.filter(member=>rank(member)<0)};
}
