export const contactTopics={
  sponsorship:['Partnership or sponsorship','Tell us about your organization, what you have in mind, and the best way to connect.'],
  outreach:['Outreach or collaboration','Share your audience, location, and any dates you have in mind.'],
  joining:['Getting involved','Tell us what interests you and how you’d like to get involved.'],
  visit:['Visiting or attending an event','Include the event or date you’re interested in so we can confirm the details.']
};
export const supportIntroductions={funding:'I’d like to discuss supporting the team’s season. ',materials:'I’d like to offer parts, materials, or services to the team. ',mentorship:'I’d like to share my expertise with the team. '};
export const draftKey='saffron-contact-draft-v1';
export const draftLifetime=4*60*60*1000;
export function draftFrom(values,context='',now=Date.now()){
  const limits={name:80,email:254,subject:160,message:5000};
  const fields=Object.fromEntries(Object.entries(limits).map(([key,limit])=>[key,typeof values[key]==='string'?values[key].slice(0,limit):'']));
  return {fields,context:typeof context==='string'?context.slice(0,400):'',saved:now};
}
export function readDraft(raw,now=Date.now()){
  try{const value=JSON.parse(raw);if(!value||!value.fields||!Number.isFinite(value.saved)||now<value.saved||now-value.saved>draftLifetime)return null;const draft=draftFrom(value.fields,value.context,value.saved);return Object.values(draft.fields).some(v=>v.trim())?draft:null;}catch{return null;}
}
export function mailtoMessage(fields){
  // mailto uses URI escaping, not form encoding: a plus sign must not replace a space.
  const body=(fields.name?'From: '+fields.name+'\n\n':'')+(fields.message||'');
  return 'mailto:team@22310.ca?subject='+encodeURIComponent(fields.subject||'Hello, EDIT Saffron')+'&body='+encodeURIComponent(body);
}

export const contactContextKey = params => new URLSearchParams(['topic','support','event'].map(key=>[key,params.get(key)||''])).toString();
export function readDrafts(raw,now=Date.now()){
  try{const value=JSON.parse(raw);return (Array.isArray(value)?value:[value]).map(item=>readDraft(JSON.stringify(item),now)).filter(Boolean).sort((a,b)=>a.saved-b.saved).slice(-5);}catch{return [];}
}
export function mergeDrafts(drafts,draft){return [...drafts.filter(saved=>saved.context!==draft.context),draft].sort((a,b)=>a.saved-b.saved).slice(-5);}
