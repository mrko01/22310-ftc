import test from 'node:test';
import assert from 'node:assert/strict';
import {draftFrom,readDraft,draftLifetime,mailtoMessage} from '../src/contact.mjs';
import {fetchJSONTimed} from '../src/network.mjs';
test('session draft allowlist strips unrelated data and clamps all user inputs',()=>{
 const draft=draftFrom({name:'n'.repeat(90),email:'e'.repeat(300),subject:'s'.repeat(180),message:'m'.repeat(6000),cookie:'secret'},'topic=visit',100);
 assert.deepEqual(Object.keys(draft.fields),['name','email','subject','message']);assert.equal(draft.fields.name.length,80);assert.equal(draft.fields.email.length,254);assert.equal(draft.fields.message.length,5000);assert.equal(draft.context,'topic=visit');
});
test('expired, future, empty and corrupt session drafts are never restored',()=>{
 const draft=draftFrom({name:'Visitor',message:'Hello team'},'topic=visit',100);
 assert.equal(readDraft(JSON.stringify(draft),100+draftLifetime+1),null);assert.equal(readDraft(JSON.stringify(draft),99),null);assert.equal(readDraft('{broken',100),null);assert.equal(readDraft(JSON.stringify(draftFrom({},'',100)),100),null);assert.equal(readDraft(JSON.stringify(draft),101).fields.message,'Hello team');
});
test('email fallback correctly preserves spaces, plus signs, ampersands and line breaks',()=>{
 const uri=mailtoMessage({name:'A + B',subject:'Parts & advice',message:'Hello team\nSecond line + detail'});
 assert.ok(uri.includes('Parts%20%26%20advice'));assert.ok(!uri.includes('Hello+team'));const url=new URL(uri);assert.equal(url.searchParams.get('body'),'From: A + B\n\nHello team\nSecond line + detail');
});
test('request deadline includes a stalled response JSON body and aborts the request',async()=>{
 let signal;
 const fetcher=async(_url,options)=>{signal=options.signal;return {json:()=>new Promise(()=>{})};};
 await assert.rejects(fetchJSONTimed('https://example.test',{},10,fetcher),error=>error.name==='TimeoutError');assert.equal(signal.aborted,true);
});
test('normal API response returns both status and parsed body',async()=>{
 const result=await fetchJSONTimed('https://example.test',{},100,async()=>({ok:false,status:429,json:async()=>({error:'Limit reached'})}));assert.equal(result.response.status,429);assert.equal(result.result.error,'Limit reached');
});

import {contactContextKey,readDrafts,mergeDrafts} from '../src/contact.mjs';
test('draft contexts preserve event IDs containing query delimiters across navigation',()=>{
 const id='public & event/one?two#three',context=contactContextKey(new URLSearchParams({topic:'visit',event:id}));assert.equal(new URLSearchParams(context).get('event'),id);
});
test('different enquiry drafts survive independently in the same session',()=>{
 const first=draftFrom({message:'First unsent question'},'topic=visit',100),second=draftFrom({message:'Another unsent question'},'topic=sponsorship',101);
 const merged=mergeDrafts([first],second);assert.equal(merged.length,2);assert.equal(readDrafts(JSON.stringify(merged),102).length,2);assert.equal(mergeDrafts(merged,{...first,saved:103}).length,2);assert.equal(readDrafts(JSON.stringify(first),102).length,1);
});
