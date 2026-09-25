// Keep the deadline active through the response body, including a stalled JSON stream.
export async function fetchJSONTimed(url,options={},timeoutMs=12000,fetcher=fetch){
  const controller=new AbortController();
  let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new DOMException('The request timed out.','TimeoutError'));},timeoutMs);});
  try{return await Promise.race([(async()=>{const response=await fetcher(url,{...options,signal:controller.signal});return {response,result:await response.json()};})(),deadline]);}
  finally{clearTimeout(timer);}
}
