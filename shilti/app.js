const KEY='shilti-state-v1', SETTINGS='shilti-settings-v1';
const ARABIC_POLICY=`Write dialogue and social content in the character's own natural spoken Arabic dialect. Never default to Modern Standard Arabic when a person would normally speak colloquially. Respect dialectProfile; if it is missing, use natural Palestinian Jerusalem/central Palestinian spoken Arabic. Keep regional flavor believable but readable and do not mix dialects randomly. Hebrew transliteration MUST use Hebrew letters with full niqqud, never Latin letters, IPA or academic transliteration, and must closely match the Arabic pronunciation. Hebrew translation must be natural and faithful.`;
function dialectFor(c){return c.dialectProfile||'Palestinian Arabic — Jerusalem / central Palestinian spoken dialect'}
function validHebrewTranscription(x){return typeof x==='string'&&/[א-ת]/.test(x)&&!/[A-Za-zÀ-ž]/.test(x)}

const seed={view:'feed',likes:[],characters:[
{id:'khalil',name:'חליל',arabic:'خليل',initial:'خ',place:'חברון',bio:'טכנאי מכשירי חשמל. משפחה, עבודה וחיים בחברון.'},
{id:'nadim',name:'נאדים',arabic:'نديم',initial:'ن',place:'מג׳דל שמס',bio:'מדריך טיולים דרוזי מהגולן. אוהב צילום ואוכל.'},
{id:'fatma',name:'פאטמה',arabic:'فاطمة',initial:'ف',place:'הנגב',bio:'סטודנטית בדואית. מצחיקה, ישירה וסקרנית.'},
{id:'lina',name:'לינא',arabic:'لينا',initial:'ل',place:'ירושלים',bio:'עובדת בהייטק בירושלים ואוהבת מוזיקה ובתי קפה.'},
{id:'sami',name:'סאמי',arabic:'سامي',initial:'س',place:'עכו',bio:'בשלן חובב מעכו. מכיר כל מקום טוב לאכול בו.'}],
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
async function advanceWorld(){
  ensureWorld();
  const settings=getSettings(),key=settings.apiKey,model=settings.model||'gpt-6-luna';
  if(!key)throw new Error('צריך להכניס OpenAI API key בהגדרות.');
  const crew=state.characters.map(({id,name,place,bio,dialectProfile,currentState,memories})=>({id,name,place,bio,dialectProfile,currentState,memories:memories.slice(-5)}));
  const history=state.posts.slice(0,12).map(({who,ar,he,time})=>({who,ar,he,time}));
  const recentEvents=state.world.events.slice(-12);
  const ids=crew.map(x=>x.id);
  const schema={type:'object',properties:{
    event:{type:'object',properties:{who:{type:'string',enum:ids},summary:{type:'string'},kind:{type:'string'},newState:{type:'string'},memory:{type:'string'}},required:['who','summary','kind','newState','memory'],additionalProperties:false},
    publish:{type:'boolean'},
    post:{type:['object','null'],properties:{who:{type:'string',enum:ids},ar:{type:'string'},tr:{type:'string'},he:{type:'string'}},required:['who','ar','tr','he'],additionalProperties:false}
  },required:['event','publish','post'],additionalProperties:false};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({
    model,store:false,max_output_tokens:8000,reasoning:{effort:'none'},
    instructions:'You are the world engine for Al Jamaa, a persistent fictional social circle. Advance the shared world by ONE small believable event. Respect character profiles, dialectProfile, current states, memories, recent shared events and post history. Prefer continuity over novelty. Not every life event deserves a social post: set publish accordingly. If publish is true, post must be by the event character. If publish is false, post must be null. Never act like a teacher. '+ARABIC_POLICY,
    input:JSON.stringify({world:{tick:state.world.tick,recentEvents},crew,recentPosts:history,task:'Advance the world one step. Create one event and decide naturally whether it becomes a social post.'}),
    text:{format:{type:'json_schema',name:'jamaa_world_tick',strict:true,schema}}
  })});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data?.error?.message||('OpenAI '+r.status));
  const text=responseText(data).trim();
  if(!text){const reason=data?.incomplete_details?.reason||data?.status||'empty';throw new Error('העולם לא הצליח להתקדם · '+reason)}
  let result;try{result=JSON.parse(text)}catch{throw new Error('קיבלתי עדכון עולם שלא הצלחתי לקרוא.')}
  const character=person(result.event?.who);if(!character)throw new Error('עדכון העולם החזיר דמות לא מוכרת.');
  const event={id:'ev-'+Date.now(),tick:state.world.tick+1,at:new Date().toISOString(),who:result.event.who,kind:result.event.kind,summary:result.event.summary};
  state.world.tick=event.tick;state.world.updatedAt=event.at;state.world.events.push(event);state.world.events=state.world.events.slice(-50);
  character.currentState=result.event.newState||character.currentState;
  if(result.event.memory){character.memories.push({at:event.at,text:result.event.memory});character.memories=character.memories.slice(-20)}
  if(result.publish&&result.post){
    if(!validHebrewTranscription(result.post.tr))throw new Error('התעתיק שחזר לא היה בעברית מנוקדת. עדכון העולם לא נשמר; נסה שוב.');
    state.posts.unshift({id:'ai-'+Date.now(),who:result.post.who,time:'עכשיו',ar:String(result.post.ar),tr:String(result.post.tr),he:String(result.post.he),comments:0,eventId:event.id});
    save();render();showToast('העולם התקדם · עלה פוסט חדש','success');
  }else{save();render();showToast('העולם התקדם · הפעם אף אחד לא פרסם','info')}
}
const app=document.querySelector('#app');
function showToast(message,type='info'){let host=document.querySelector('#appToast');if(!host){host=document.createElement('div');host.id='appToast';host.className='app-toast';document.body.appendChild(host)}host.textContent=message;host.className='app-toast show '+type;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>host.className='app-toast',4200)}
const person=id=>state.characters.find(x=>x.id===id);
const avatar=p=>'<div class="avatar ai">'+p.initial+'</div>';
function feed(){app.innerHTML='<section class="welcome"><h1>صباح الخير, אבי</h1><p>מה קורה אצל החבר׳ה שלך היום?</p></section><div class="stories">'+state.characters.map(p=>'<div class="story">'+avatar(p)+'<span>'+p.name+'</span></div>').join('')+'</div><div class="composer">'+avatar({initial:'א'})+'<input id="composer" placeholder="מה בא לך לספר היום?"></div><div class="feed-tools"><button class="feed-ai-action" id="newAiPost" type="button">✦ קדם את העולם</button></div>'+state.posts.map(postCard).join('');}
function postExport(x){ensureWorld();const p=person(x.who),event=x.eventId?state.world.events.find(e=>e.id===x.eventId):null;return {type:'al-jamaa-post',version:2,post:{id:x.id,author:{id:p?.id,name:p?.name,arabic:p?.arabic,place:p?.place,bio:p?.bio,dialectProfile:p?.dialectProfile,ai:true},time:x.time,arabic:x.ar,transcription:x.tr,hebrew:x.he,liked:state.likes.includes(x.id),commentsCount:x.comments||0,replies:x.replies||[],eventId:x.eventId||null},worldContext:{tick:state.world.tick,event,characterState:p?.currentState||null,recentMemories:(p?.memories||[]).slice(-5)}}}
async function copyPost(id){const x=state.posts.find(p=>p.id===id);if(!x)return;try{await navigator.clipboard.writeText(JSON.stringify(postExport(x),null,2));showToast('הפוסט הועתק','success')}catch{showToast('לא הצלחתי להעתיק את הפוסט','error')}}
function postCard(x){const p=person(x.who),liked=state.likes.includes(x.id),settings=getSettings(),transcriptionFirst=settings.feedLanguage==='transcription';const primary=esc(transcriptionFirst?x.tr:x.ar),secondary=esc(transcriptionFirst?x.ar:x.tr),primaryClass=transcriptionFirst?'transcription':'arabic',secondaryClass=transcriptionFirst?'arabic-inline':'';return '<article class="post"><div class="post-head">'+avatar(p)+'<div class="meta"><strong>'+p.name+' <span class="ai-mark">✦ AI</span></strong><small>'+p.place+' · '+x.time+'</small></div><button class="copy-post" data-copy-post="'+esc(x.id)+'" type="button" aria-label="העתקת הפוסט" title="העתקת הפוסט">⧉</button></div><div class="'+primaryClass+'">'+primary+'</div><div class="help" id="help-'+x.id+'"><b class="'+secondaryClass+'">'+secondary+'</b><br>'+x.he+'</div><div class="actions"><button data-like="'+x.id+'">'+(liked?'♥':'♡')+' '+(liked?'אהבתי':'לייק')+'</button><button data-help="'+x.id+'">עזור לי להבין</button><button>◌ '+x.comments+' תגובות</button></div></article>'}
function circle(){app.innerHTML='<div class="section-title"><div><h1>החבורה שלי</h1><span class="muted">5 אנשים שחיים איתך בערבית</span></div></div><div class="people-grid">'+state.characters.map(p=>'<article class="person">'+avatar(p)+'<h3>'+p.name+' · '+p.arabic+'</h3><small>'+p.place+' · ✦ AI</small><p>'+p.bio+'</p><button data-chat="'+p.id+'">דברו</button></article>').join('')+'</div>'}
function messages(){app.innerHTML='<div class="section-title"><div><h1>שיחות</h1><span class="muted">החבורה מחכה לך</span></div></div>'+state.characters.map((p,i)=>'<div class="thread" data-chat="'+p.id+'">'+avatar(p)+'<div class="thread-main"><strong>'+p.name+' <span class="ai-mark">✦ AI</span></strong><span>'+(i===0?'وينك يا زلمة؟ من زمان ما حكينا 😄':'יש משהו חדש לספר לך…')+'</span></div>'+(i<2?'<span class="badge">1</span>':'')+'</div>').join('')}
function me(){app.innerHTML='<div class="profile-card">'+avatar({initial:'א'})+'<h2>אבי</h2><p class="muted">לומד ערבית פלסטינית מדוברת</p><div class="stats"><div><strong>5</strong><small>בחבורה</small></div><div><strong>136</strong><small>מילים בקאמוס</small></div><div><strong>76</strong><small>משפטים</small></div></div></div><div class="menu"><a href="../">↗ מעבר ל־Al-Kamus</a><button id="settingsMenu">⚙ הגדרות AI</button><button id="exportState">↓ ייצוא העולם שלי</button></div>'}
function chat(id){const p=person(id);app.innerHTML='<div class="section-title"><button class="text-btn" data-back>→ חזרה</button><div><h1>'+p.name+'</h1><span class="muted">'+p.arabic+' · '+p.place+' · ✦ AI</span></div></div><article class="post"><div class="post-head">'+avatar(p)+'<div class="meta"><strong>'+p.name+'</strong><small>עכשיו</small></div></div><div class="arabic">أهلين يا آڤي! شو الأخبار؟</div><div class="help open"><b>אַהְלֵין יַא אַבִי! שוּ לְאַחְ׳בַּאר?</b><br>אהלן אבי! מה נשמע?</div></article><div class="composer"><input placeholder="כתוב בערבית, בעברית, או ערבב ביניהן…"><button class="primary">שלח</button></div>'}
function render(){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));({feed,circle,messages,me}[state.view]||feed)();bind()}
function bind(){document.querySelectorAll('[data-copy-post]').forEach(b=>b.onclick=()=>copyPost(b.dataset.copyPost));document.querySelector('#newAiPost')?.addEventListener('click',async e=>{const b=e.currentTarget,old=b.textContent;b.disabled=true;b.textContent='העולם מתקדם…';try{await advanceWorld()}catch(err){showToast(err.message,'error')}finally{b.disabled=false;b.textContent=old}});document.querySelectorAll('[data-help]').forEach(b=>b.onclick=()=>document.querySelector('#help-'+b.dataset.help).classList.toggle('open'));document.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>{const id=b.dataset.like;state.likes=state.likes.includes(id)?state.likes.filter(x=>x!==id):[...state.likes,id];save();render()});document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>chat(b.dataset.chat));document.querySelectorAll('[data-back]').forEach(b=>b.onclick=render);document.querySelector('#settingsMenu')?.addEventListener('click',openSettings);document.querySelector('#exportState')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='al-jamaa-world.json';a.click()})}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;save();render()});
const dlg=document.querySelector('#settingsDialog'),apiKey=document.querySelector('#apiKey'),modelName=document.querySelector('#modelName'),feedLanguage=document.querySelector('#feedLanguage');
function getSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS)||'{}')}catch{return {}}}
function openSettings(){const s=getSettings();apiKey.value=s.apiKey||'';modelName.value=s.model||'gpt-6-luna';feedLanguage.value=s.feedLanguage||'arabic';dlg.showModal()}
async function testOpenAIConnection(){const button=document.querySelector('#testConnection'),status=document.querySelector('#connectionStatus'),key=apiKey.value.trim(),model=modelName.value.trim()||'gpt-6-luna';if(!key){status.textContent='יש להזין API key';status.className='error';return}button.disabled=true;status.textContent='בודק…';status.className='';try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,input:'Reply with exactly OK',max_output_tokens:16,store:false})});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.error?.message||('HTTP '+r.status));status.textContent='✓ החיבור הצליח';status.className='success'}catch(err){status.textContent='✕ '+(err.message||'החיבור נכשל');status.className='error'}finally{button.disabled=false}}
document.querySelector('#testConnection').onclick=testOpenAIConnection;document.querySelector('#settingsButton').onclick=openSettings;document.querySelector('#saveSettings').onclick=()=>{localStorage.setItem(SETTINGS,JSON.stringify({apiKey:apiKey.value.trim(),model:modelName.value.trim(),feedLanguage:feedLanguage.value}));render()};document.querySelector('#clearKey').onclick=()=>{localStorage.removeItem(SETTINGS);apiKey.value=''};render();