const KEY='shilti-state-v1', SETTINGS='shilti-settings-v1';
const ARABIC_POLICY=`Write dialogue and social content in the character's own natural spoken Arabic dialect. Never default to Modern Standard Arabic when a person would normally speak colloquially. Respect dialectProfile; if it is missing, use natural Palestinian Jerusalem/central Palestinian spoken Arabic. Keep regional flavor believable but readable and do not mix dialects randomly. Hebrew transliteration MUST use Hebrew letters with full niqqud, never Latin letters, IPA or academic transliteration, and must closely match the Arabic pronunciation. Example of the REQUIRED script/style: טַלַעְת מִשְוַאר קְצִיר. A form like Ṭilʿit mišwār is INVALID. Hebrew translation must be natural and faithful.`;
const DIALECT_PROFILES={"khalil":"Palestinian Arabic — Hebron urban dialect; natural Hebron-area vocabulary and pronunciation, readable to Palestinian speakers","nadim":"Syrian/Golan Druze Arabic — Majdal Shams local Druze speech; natural local flavor without caricature","fatma":"Negev Bedouin Arabic — Palestinian Bedouin speech of the Naqab/Negev; natural young local speaker, not Jerusalem urban Arabic","lina":"Palestinian Arabic — Jerusalem urban / central Palestinian spoken dialect","sami":"Palestinian Arabic — Acre / northern Galilee urban dialect; natural northern Palestinian local flavor"};
function dialectFor(c){return DIALECT_PROFILES[c.id]||c.dialectProfile||'Palestinian Arabic — Jerusalem / central Palestinian spoken dialect'}
function validHebrewTranscription(x){return typeof x==='string'&&/[א-ת]/.test(x)&&!/[A-Za-zÀ-ž]/.test(x)}

const seed={view:'feed',likes:[],characters:[
{id:'khalil',name:'חליל',arabic:'خليل',initial:'خ',place:'חברון',bio:'טכנאי מכשירי חשמל. משפחה, עבודה וחיים בחברון.',dialectProfile:'Palestinian Arabic — Hebron urban dialect; natural Hebron-area vocabulary and pronunciation, readable to Palestinian speakers'},
{id:'nadim',name:'נאדים',arabic:'نديم',initial:'ن',place:'מג׳דל שמס',bio:'מדריך טיולים דרוזי מהגולן. אוהב צילום ואוכל.',dialectProfile:'Syrian/Golan Druze Arabic — Majdal Shams local Druze speech; natural local flavor without caricature'},
{id:'fatma',name:'פאטמה',arabic:'فاطمة',initial:'ف',place:'הנגב',bio:'סטודנטית בדואית. מצחיקה, ישירה וסקרנית.',dialectProfile:'Negev Bedouin Arabic — Palestinian Bedouin speech of the Naqab/Negev; natural young local speaker, not Jerusalem urban Arabic'},
{id:'lina',name:'לינא',arabic:'لينا',initial:'ل',place:'ירושלים',bio:'עובדת בהייטק בירושלים ואוהבת מוזיקה ובתי קפה.',dialectProfile:'Palestinian Arabic — Jerusalem urban / central Palestinian spoken dialect'},
{id:'sami',name:'סאמי',arabic:'سامي',initial:'س',place:'עכו',bio:'בשלן חובב מעכו. מכיר כל מקום טוב לאכול בו.',dialectProfile:'Palestinian Arabic — Acre / northern Galilee urban dialect; natural northern Palestinian local flavor'}],
posts:[
{id:'p1',who:'khalil',time:'לפני 18 דק׳',ar:'اليوم صار معي إشي غريب بالشغل 😅',tr:'אִלְיוֹם צַאר מַעִי אִשִי עַ׳רִיבּ בִּשֻּעְ׳ל',he:'היום קרה לי משהו מוזר בעבודה.',comments:3},
{id:'p2',who:'nadim',time:'לפני שעה',ar:'الجو اليوم بالجولان بجنّن. مين طالع يتمشّى؟',tr:'אִלְגַ׳וּ אִלְיוֹם בִּלְג׳וֹלַאן בְּגַ׳נֶּן. מִין טַאלֶע יִתְמַשַּא?',he:'מזג האוויר היום בגולן מדהים. מי יוצא להסתובב?',comments:5},
{id:'p3',who:'fatma',time:'לפני 3 שעות',ar:'على فكرة، أحسن قهوة هي القهوة اللي بتشربها مع ناس بتحبهم.',tr:'עַלַא פִכְּרַה, אַחְסַן קַהְוֶה הִיֶּ אִלְקַהְוֶה אִלִּי בְּתִשְרַבְּהַא מַע נַאס בְּתִחֶבְּהֹם.',he:'אגב, הקפה הכי טוב הוא זה ששותים עם אנשים שאוהבים.',comments:2}]
};
function load(){try{return {...seed,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return structuredClone(seed)}}let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function responseText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text;
  for(const item of (data?.output||[])){
    for(const part of (item?.content||[])){
      if(part?.type==='output_text'&&typeof part.text==='string')return part.text;
      if(typeof part?.text?.value==='string')return part.text.value;
    }
  }
  return '';
}
function ensureWorld(){
  state.world=state.world||{tick:0,events:[],updatedAt:null};
  state.characters=state.characters.map(c=>({...c,dialectProfile:dialectFor(c),currentState:c.currentState||'שגרה רגילה',memories:Array.isArray(c.memories)?c.memories:[]}));
}
async function aiJson(key,model,instructions,input,name,schema,maxOutput=2500){
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({
    model,store:false,max_output_tokens:maxOutput,reasoning:{effort:'none'},instructions,input,
    text:{format:{type:'json_schema',name,strict:true,schema}}
  })});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data?.error?.message||('OpenAI '+r.status));
  const text=responseText(data).trim();
  if(!text)throw new Error('AI החזיר תשובה ריקה · '+(data?.incomplete_details?.reason||data?.status||'empty'));
  try{return JSON.parse(text)}catch(e){
    const cleaned=text.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'').trim();
    try{return JSON.parse(cleaned)}catch{}
    console.warn('Al Jamaa: JSON parse failed',{name,text:text.slice(0,2000),status:data?.status,incomplete:data?.incomplete_details,error:String(e)});
    const err=new Error('תשובת '+name+' חזרה בפורמט לא תקין.');
    err.diagnostic={stage:name,raw:text.slice(0,4000),responseStatus:data?.status||null,incompleteDetails:data?.incomplete_details||null,outputTypes:(data?.output||[]).map(x=>x.type)};
    throw err
  }
}
async function renderTranscription(key,model,arabic,dialectProfile){
  const schema={type:'object',properties:{transliteration:{type:'string',description:'A phonetic transcription of the Arabic sounds using Hebrew letters with niqqud. It is NOT a Hebrew translation. No Latin letters.'}},required:['transliteration'],additionalProperties:false};
  const x=await aiJson(key,model,'You are a specialist Arabic-to-Hebrew-script PHONETIC TRANSLITERATOR. Do NOT translate meaning. Preserve the sounds and word order of the Arabic. Output ONLY Hebrew letters with niqqud and punctuation. Latin/IPA is forbidden. Example: Arabic طلعت مشوار قصير -> Hebrew phonetic טַלַעְת מִשְוַאר קְצִיר. The output should sound like the source Arabic when read aloud. Dialect: '+dialectProfile,arabic,'jamaa_transliteration',schema,1800);
  if(!validHebrewTranscription(x.transliteration)){const e=new Error('שכבת התעתיק לא החזירה תעתיק עברי תקין.');e.diagnostic={stage:'transliteration',arabic,received:x.transliteration};throw e}
  return x.transliteration;
}
async function renderTranslation(key,model,arabic,character){
  const schema={type:'object',properties:{translation:{type:'string',description:'Natural faithful Hebrew translation of the Arabic meaning. Translation only, not transliteration.'}},required:['translation'],additionalProperties:false};
  const x=await aiJson(key,model,'Translate the supplied spoken Arabic into natural modern Hebrew. Translate meaning; do NOT transliterate sounds. Preserve the known speaker gender in Hebrew and never use slash forms such as סוגר/ת. Speaker metadata: '+JSON.stringify({name:character.name,gender:character.gender||((character.id==='fatma'||character.id==='lina')?'female':'male')})+'. Return only the Hebrew translation field.',arabic,'jamaa_hebrew_translation',schema,1800);
  return x.translation;
}
async function generatePostAuthorReply(post){
  ensureWorld();const settings=getSettings(),key=settings.apiKey,model=settings.model||'gpt-6-luna';if(!key)throw new Error('צריך להכניס OpenAI API key בהגדרות.');
  const character=person(post.who);if(!character)throw new Error('לא מצאתי את בעל הפוסט.');
  const event=post.eventId?state.world.events.find(e=>e.id===post.eventId):null;
  const thread=(post.replies||[]).map(r=>({speaker:r.who==='me'?'Avi':character.name,text:r.ar||r.text}));
  const schema={type:'object',properties:{arabic:{type:'string',description:'One short natural social-media reply in the character spoken dialect, Arabic only.'}},required:['arabic'],additionalProperties:false};
  const out=await aiJson(key,model,
    'You are '+character.name+', replying live to Avi under your own social post. Stay in character. Reply naturally, briefly and socially in your own spoken dialect. React to what Avi actually said and to the thread. Do not teach Arabic, explain language, translate, or transliterate. Usually one or two short sentences. Character dialect: '+dialectFor(character),
    JSON.stringify({character:{id:character.id,name:character.name,place:character.place,bio:character.bio,dialectProfile:dialectFor(character),currentState:character.currentState,memories:(character.memories||[]).slice(-5)},originalPost:{arabic:post.ar,event},thread}),
    'jamaa_character_reply',schema,2200);
  let tr,he;try{[tr,he]=await Promise.all([renderTranscription(key,model,out.arabic,dialectFor(character)),renderTranslation(key,model,out.arabic,character)])}catch(e){e.diagnostic={...(e.diagnostic||{}),stage:e.diagnostic?.stage||'reply-language-rendering',postId:post.id,replyArabic:out.arabic};throw e}
  post.replies=post.replies||[];post.replies.push({id:'reply-'+Date.now(),who:character.id,ar:out.arabic,tr,he,liked:false,at:new Date().toISOString()});post.replyPending=false;post.commentsOpen=true;save();render();
}
async function advanceWorld(){
  ensureWorld();
  const settings=getSettings(),key=settings.apiKey,model=settings.model||'gpt-6-luna';
  if(!key)throw new Error('צריך להכניס OpenAI API key בהגדרות.');
  const crew=state.characters.map(({id,name,place,bio,dialectProfile,currentState,memories})=>({id,name,place,bio,dialectProfile,currentState,memories:memories.slice(-5)}));
  const history=state.posts.slice(0,12).map(({who,ar,time})=>({who,ar,time}));
  const recentEvents=state.world.events.slice(-12),ids=crew.map(x=>x.id);
  const schema={type:'object',properties:{
    event:{type:'object',properties:{who:{type:'string',enum:ids},summary:{type:'string'},kind:{type:'string'},newState:{type:'string'},memory:{type:'string'}},required:['who','summary','kind','newState','memory'],additionalProperties:false},
    post:{type:'object',properties:{who:{type:'string',enum:ids},arabic:{type:'string',description:'The social post in the character natural spoken Arabic dialect only.'}},required:['who','arabic'],additionalProperties:false}
  },required:['event','post'],additionalProperties:false};
  const result=await aiJson(key,model,
    'You are the world engine and Arabic social writer for Al Jamaa. Advance the persistent fictional social circle by ONE small believable event. Respect profiles, dialectProfile, current states, memories, recent events and post history. Prefer continuity over novelty. TEST MODE: every advance MUST create one visible social post by the same character as the event. Write the post ONLY in that character natural spoken Arabic dialect. Do not translate or transliterate it. Never act like a teacher.',
    JSON.stringify({world:{tick:state.world.tick,recentEvents},crew,recentPosts:history,task:'Advance one step and write one Arabic social post by the event character.'}),
    'jamaa_world_arabic_post',schema,6000);
  const character=person(result.event?.who);if(!character)throw new Error('עדכון העולם החזיר דמות לא מוכרת.');
  if(!result.post?.arabic)throw new Error('עדכון העולם חזר בלי פוסט בערבית.');
  if(result.post.who!==result.event.who)throw new Error('הפוסט ועדכון העולם חזרו עם דמויות שונות. נסה שוב.');
  let tr,he;
  try{[tr,he]=await Promise.all([
    renderTranscription(key,model,result.post.arabic,dialectFor(character)),
    renderTranslation(key,model,result.post.arabic,character)
  ])}catch(e){e.diagnostic={...(e.diagnostic||{}),pipeline:'world -> Arabic -> [transliteration || translation]',worldEvent:result.event,arabicPost:result.post.arabic};throw e}
  const event={id:'ev-'+Date.now(),tick:state.world.tick+1,at:new Date().toISOString(),who:result.event.who,kind:result.event.kind,summary:result.event.summary};
  state.world.tick=event.tick;state.world.updatedAt=event.at;state.world.events.push(event);state.world.events=state.world.events.slice(-50);
  character.currentState=result.event.newState||character.currentState;
  if(result.event.memory){character.memories.push({at:event.at,text:result.event.memory});character.memories=character.memories.slice(-20)}
  state.posts.unshift({id:'ai-'+Date.now(),who:result.post.who,time:'עכשיו',ar:String(result.post.arabic),tr:String(tr),he:String(he),comments:0,eventId:event.id});
  save();render();showToast('העולם התקדם · פוסט + תעתיק + תרגום הושלמו','success',{pipeline:'world -> Arabic -> [transliteration || translation]',eventId:event.id});
}

const app=document.querySelector('#app');
async function copyTextRobust(text){
  if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true}catch{}}
  const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';ta.style.pointerEvents='none';document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
  let ok=false;try{ok=document.execCommand('copy')}catch{}ta.remove();return ok;
}
function showToast(message,type='info',context={},options={}){
  let host=document.querySelector('#appToast');if(!host){host=document.createElement('div');host.id='appToast';host.className='app-toast';document.body.appendChild(host)}
  const bundle={type:'al-jamaa-diagnostic',version:30,messageType:type,message,at:new Date().toISOString(),world:{tick:state.world?.tick??null,lastEvent:state.world?.events?.slice(-1)[0]||null},context};
  const diagnosticText=JSON.stringify(bundle,null,2);
  host.textContent=message+' · מעתיק פרטים…';host.title='לחץ כדי לנסות להעתיק שוב';host.className='app-toast show '+type;
  host.onclick=async()=>{const ok=await copyTextRobust(diagnosticText);host.textContent=ok?'פרטי ההודעה הועתקו':'ההעתקה נחסמה · לחץ לנסות שוב';};
  if(options.autoCopy!==false)copyTextRobust(diagnosticText).then(ok=>{if(!host.classList.contains('show'))return;host.textContent=ok?message+' · הפרטים הועתקו':message+' · ההעתקה נחסמה · לחץ לנסות שוב';}); else {host.textContent=message;host.title='';host.onclick=null;}
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>host.className='app-toast',9000)
}
const person=id=>state.characters.find(x=>x.id===id);
const avatar=p=>'<div class="avatar ai">'+p.initial+'</div>';
function feed(){app.innerHTML='<section class="welcome"><h1>صباح الخير, אבי</h1><p>מה קורה אצל החבר׳ה שלך היום?</p></section><div class="stories">'+state.characters.map(p=>'<div class="story">'+avatar(p)+'<span>'+p.name+'</span></div>').join('')+'</div><div class="composer">'+avatar({initial:'א'})+'<input id="composer" placeholder="מה בא לך לספר היום?"></div><div class="feed-tools"><button class="feed-ai-action" id="newAiPost" type="button">✦ קדם את העולם</button></div>'+state.posts.map(postCard).join('');}
function postExport(x){ensureWorld();const p=person(x.who),event=x.eventId?state.world.events.find(e=>e.id===x.eventId):null;return {type:'al-jamaa-post',version:2,post:{id:x.id,author:{id:p?.id,name:p?.name,arabic:p?.arabic,place:p?.place,bio:p?.bio,dialectProfile:p?.dialectProfile,ai:true},time:x.time,arabic:x.ar,transcription:x.tr,hebrew:x.he,liked:state.likes.includes(x.id),commentsCount:x.comments||0,replies:x.replies||[],eventId:x.eventId||null},worldContext:{tick:state.world.tick,event,characterState:p?.currentState||null,recentMemories:(p?.memories||[]).slice(-5)}}}
async function copyPost(id){const x=state.posts.find(p=>p.id===id);if(!x)return;try{if(!await copyTextRobust(JSON.stringify(postExport(x),null,2)))throw new Error('copy blocked');showToast('הפוסט הועתק','success',{}, {autoCopy:false})}catch{showToast('לא הצלחתי להעתיק את הפוסט','error')}}
function replyCard(post,r){
  const mine=r.who==='me',p=mine?{name:'אבי',initial:'א'}:person(r.who),liked=!!r.liked,settings=getSettings(),transcriptionFirst=settings.feedLanguage==='transcription';
  if(mine)return '<div class="reply-item mine">'+avatar(p)+'<div class="reply-body"><div class="reply-bubble"><strong>'+esc(p.name)+'</strong><div class="reply-ar">'+esc(r.text||r.ar)+'</div></div><button class="reply-like '+(liked?'liked':'')+'" data-reply-like="'+esc(post.id)+'" data-reply-id="'+esc(r.id)+'">'+(liked?'♥':'♡')+'</button></div></div>';
  const primary=esc(transcriptionFirst?r.tr:r.ar),secondary=esc(transcriptionFirst?r.ar:r.tr),primaryClass=transcriptionFirst?'transcription':'reply-ar',secondaryClass=transcriptionFirst?'arabic-inline':'transcription';
  return '<div class="reply-item ai-reply">'+avatar(p)+'<div class="reply-body"><div class="reply-bubble"><strong>'+esc(p.name)+' <span class="ai-mark">✦ AI</span></strong><div class="'+primaryClass+'">'+primary+'</div><div class="reply-help '+(r.helpOpen?'open':'')+'"><b class="'+secondaryClass+'">'+secondary+'</b><br>'+esc(r.he)+'</div><button class="reply-help-toggle" data-reply-help="'+esc(post.id)+'" data-reply-id="'+esc(r.id)+'">'+(r.helpOpen?'הסתר עזרה':'עזור לי להבין')+'</button></div><button class="reply-like '+(liked?'liked':'')+'" data-reply-like="'+esc(post.id)+'" data-reply-id="'+esc(r.id)+'">'+(liked?'♥':'♡')+'</button></div></div>';
}
function postCard(x){
  const p=person(x.who),liked=state.likes.includes(x.id),settings=getSettings(),transcriptionFirst=settings.feedLanguage==='transcription',replies=x.replies||[];
  const primary=esc(transcriptionFirst?x.tr:x.ar),secondary=esc(transcriptionFirst?x.ar:x.tr),primaryClass=transcriptionFirst?'transcription':'arabic',secondaryClass=transcriptionFirst?'arabic-inline':'';
  return '<article class="post"><div class="post-head">'+avatar(p)+'<div class="meta"><strong>'+p.name+' <span class="ai-mark">✦ AI</span></strong><small>'+p.place+' · '+x.time+'</small></div><button class="copy-post" data-copy-post="'+esc(x.id)+'" type="button" aria-label="העתקת הפוסט" title="העתקת הפוסט">⧉</button></div><div class="'+primaryClass+'">'+primary+'</div><div class="help" id="help-'+x.id+'"><b class="'+secondaryClass+'">'+secondary+'</b><br>'+x.he+'</div><div class="actions"><button data-like="'+x.id+'">'+(liked?'♥':'♡')+' '+(liked?'אהבתי':'לייק')+'</button><button data-help="'+x.id+'">עזור לי להבין</button><button data-comments="'+x.id+'">◌ '+replies.length+' תגובות</button></div><div class="comments '+(x.commentsOpen?'open':'')+'" id="comments-'+esc(x.id)+'"><div class="reply-list">'+replies.map(r=>replyCard(x,r)).join('')+'</div>'+(x.replyPending?'<div class="typing">'+esc(p.name)+' כותב/ת…</div>':'')+'<form class="comment-composer" data-comment-form="'+esc(x.id)+'"><input name="comment" autocomplete="off" placeholder="כתוב תגובה…"><button type="submit">שלח</button></form></div></article>';
}
function circle(){app.innerHTML='<div class="section-title"><div><h1>החבורה שלי</h1><span class="muted">5 אנשים שחיים איתך בערבית</span></div></div><div class="people-grid">'+state.characters.map(p=>'<article class="person">'+avatar(p)+'<h3>'+p.name+' · '+p.arabic+'</h3><small>'+p.place+' · ✦ AI</small><p>'+p.bio+'</p><button data-chat="'+p.id+'">דברו</button></article>').join('')+'</div>'}
function messages(){app.innerHTML='<div class="section-title"><div><h1>שיחות</h1><span class="muted">החבורה מחכה לך</span></div></div>'+state.characters.map((p,i)=>'<div class="thread" data-chat="'+p.id+'">'+avatar(p)+'<div class="thread-main"><strong>'+p.name+' <span class="ai-mark">✦ AI</span></strong><span>'+(i===0?'وينك يا زلمة؟ من زمان ما حكينا 😄':'יש משהו חדש לספר לך…')+'</span></div>'+(i<2?'<span class="badge">1</span>':'')+'</div>').join('')}
function me(){app.innerHTML='<div class="profile-card">'+avatar({initial:'א'})+'<h2>אבי</h2><p class="muted">לומד ערבית פלסטינית מדוברת</p><div class="stats"><div><strong>5</strong><small>בחבורה</small></div><div><strong>136</strong><small>מילים בקאמוס</small></div><div><strong>76</strong><small>משפטים</small></div></div></div><div class="menu"><a href="../">↗ מעבר ל־Al-Kamus</a><button id="settingsMenu">⚙ הגדרות AI</button><button id="exportState">↓ ייצוא העולם שלי</button></div>'}
function chat(id){const p=person(id);app.innerHTML='<div class="section-title"><button class="text-btn" data-back>→ חזרה</button><div><h1>'+p.name+'</h1><span class="muted">'+p.arabic+' · '+p.place+' · ✦ AI</span></div></div><article class="post"><div class="post-head">'+avatar(p)+'<div class="meta"><strong>'+p.name+'</strong><small>עכשיו</small></div></div><div class="arabic">أهلين يا آڤي! شو الأخبار؟</div><div class="help open"><b>אַהְלֵין יַא אַבִי! שוּ לְאַחְ׳בַּאר?</b><br>אהלן אבי! מה נשמע?</div></article><div class="composer"><input placeholder="כתוב בערבית, בעברית, או ערבב ביניהן…"><button class="primary">שלח</button></div>'}
function render(){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));({feed,circle,messages,me}[state.view]||feed)();bind()}
function bind(){
  document.querySelectorAll('[data-copy-post]').forEach(b=>b.onclick=()=>copyPost(b.dataset.copyPost));
  document.querySelector('#newAiPost')?.addEventListener('click',async e=>{const b=e.currentTarget,old=b.textContent;b.disabled=true;b.textContent='העולם מתקדם…';try{await advanceWorld()}catch(err){showToast(err.message,'error',err.diagnostic||{error:String(err)})}finally{b.disabled=false;b.textContent=old}});
  document.querySelectorAll('[data-help]').forEach(b=>b.onclick=()=>document.querySelector('#help-'+b.dataset.help).classList.toggle('open'));
  document.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>{const id=b.dataset.like;state.likes=state.likes.includes(id)?state.likes.filter(x=>x!==id):[...state.likes,id];save();render()});
  document.querySelectorAll('[data-comments]').forEach(b=>b.onclick=()=>{const x=state.posts.find(p=>p.id===b.dataset.comments);if(x){x.commentsOpen=!x.commentsOpen;save();render();if(x.commentsOpen)setTimeout(()=>document.querySelector('[data-comment-form="'+x.id+'"] input')?.focus(),0)}});
  document.querySelectorAll('[data-reply-help]').forEach(b=>b.onclick=()=>{const x=state.posts.find(p=>p.id===b.dataset.replyHelp),r=x?.replies?.find(r=>r.id===b.dataset.replyId);if(r){r.helpOpen=!r.helpOpen;save();render()}});
  document.querySelectorAll('[data-reply-like]').forEach(b=>b.onclick=()=>{const x=state.posts.find(p=>p.id===b.dataset.replyLike),r=x?.replies?.find(r=>r.id===b.dataset.replyId);if(r){r.liked=!r.liked;save();render()}});
  document.querySelectorAll('[data-comment-form]').forEach(f=>f.onsubmit=async e=>{e.preventDefault();const x=state.posts.find(p=>p.id===f.dataset.commentForm),input=f.elements.comment,text=input.value.trim();if(!x||!text||x.replyPending)return;x.replies=x.replies||[];x.commentsOpen=true;x.replies.push({id:'me-'+Date.now(),who:'me',text,liked:false,at:new Date().toISOString()});x.replyPending=true;save();render();try{await generatePostAuthorReply(x)}catch(err){x.replyPending=false;save();render();showToast(err.message,'error',err.diagnostic||{error:String(err),postId:x.id})}});
  document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>chat(b.dataset.chat));document.querySelectorAll('[data-back]').forEach(b=>b.onclick=render);document.querySelector('#settingsMenu')?.addEventListener('click',openSettings);document.querySelector('#exportState')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='al-jamaa-world.json';a.click()})
}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;save();render()});
const dlg=document.querySelector('#settingsDialog'),apiKey=document.querySelector('#apiKey'),modelName=document.querySelector('#modelName'),feedLanguage=document.querySelector('#feedLanguage');
function getSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS)||'{}')}catch{return {}}}
function openSettings(){const s=getSettings();apiKey.value=s.apiKey||'';modelName.value=s.model||'gpt-6-luna';feedLanguage.value=s.feedLanguage||'arabic';dlg.showModal()}
async function testOpenAIConnection(){const button=document.querySelector('#testConnection'),status=document.querySelector('#connectionStatus'),key=apiKey.value.trim(),model=modelName.value.trim()||'gpt-6-luna';if(!key){status.textContent='יש להזין API key';status.className='error';return}button.disabled=true;status.textContent='בודק…';status.className='';try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,input:'Reply with exactly OK',max_output_tokens:16,store:false})});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.error?.message||('HTTP '+r.status));status.textContent='✓ החיבור הצליח';status.className='success'}catch(err){status.textContent='✕ '+(err.message||'החיבור נכשל');status.className='error'}finally{button.disabled=false}}
document.querySelector('#testConnection').onclick=testOpenAIConnection;document.querySelector('#settingsButton').onclick=openSettings;document.querySelector('#saveSettings').onclick=()=>{localStorage.setItem(SETTINGS,JSON.stringify({apiKey:apiKey.value.trim(),model:modelName.value.trim(),feedLanguage:feedLanguage.value}));render()};document.querySelector('#clearKey').onclick=()=>{localStorage.removeItem(SETTINGS);apiKey.value=''};render();