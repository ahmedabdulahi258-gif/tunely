const $=s=>document.querySelector(s),au=$('#au');
const names=["Neon Drift","Midnight Arcade","Sunrise Loop","Pixel Rain","Velvet Static","Ocean Circuit","Lofi Lantern","Copper Sky","Starlit Bus","Glass Garden","Paper Planes","Echo Valley"];
const artists=["The Synthwaves","Lumen Kid","Pocket Orchestra","Nova Hart"];
const hues=[150,280,20,200,330,180,40,260,0,120,300,220];
const T=names.map((n,i)=>({id:'t'+i,title:n,artist:artists[i%4],src:'audio/t'+i+'.mp3',hue:hues[i]}));
const PL=[{id:'chill',name:'Chill Vibes',desc:'Laid-back loops',hue:200,ids:['t0','t3','t6','t9']},
{id:'focus',name:'Deep Focus',desc:'Stay in the zone',hue:150,ids:['t1','t4','t7','t10']},
{id:'energy',name:'Energy Boost',desc:'Turn it up',hue:20,ids:['t2','t5','t8','t11']},
{id:'all',name:'Tunely Mix',desc:'Every Tunely original',hue:280,ids:T.map(t=>t.id)}];
const ls=(k,d)=>{try{return JSON.parse(localStorage[k])??d}catch(e){return d}},save=(k,v)=>localStorage[k]=JSON.stringify(v);
let liked=ls('liked',[]),recent=ls('recent',[]),uploads=[],queue=[],qi=-1,shuffle=ls('shuf',false),repeat=ls('rep',0),view='home',curPl=null;
const all=()=>[...T,...uploads];let byId=id=>all().find(t=>t.id==id);
const cover=(h,txt='')=>`<div class="cv" style="background:linear-gradient(135deg,hsl(${h},70%,50%),hsl(${(h+60)%360},60%,25%))">${txt}</div>`;
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
// IndexedDB uploads
let db;const idb=new Promise(r=>{const q=indexedDB.open('tunely',1);q.onupgradeneeded=()=>q.result.createObjectStore('songs',{keyPath:'id'});q.onsuccess=()=>{db=q.result;r()};q.onerror=()=>r()});
const store=m=>db.transaction('songs',m).objectStore('songs');
async function loadUploads(){await idb;if(!db)return;uploads.forEach(u=>URL.revokeObjectURL(u.src));
 const rows=await new Promise(r=>{const q=store('readonly').getAll();q.onsuccess=()=>r(q.result)});
 uploads=rows.sort((a,b)=>a.added-b.added).map(r=>({id:r.id,title:r.title,artist:r.artist||'My Uploads',hue:r.hue,src:URL.createObjectURL(r.blob),up:1}));}
async function id3(f){try{const b=new Uint8Array(await f.slice(0,65536).arrayBuffer());if(String.fromCharCode(b[0],b[1],b[2])!='ID3')return{};
 const v=b[3],sz=((b[6]&127)<<21)|((b[7]&127)<<14)|((b[8]&127)<<7)|(b[9]&127);let p=10,o={};
 while(p<Math.min(sz,b.length-10)){const id=String.fromCharCode(...b.slice(p,p+4));if(!/^[A-Z0-9]{4}$/.test(id))break;
  const l=v==4?((b[p+4]&127)<<21)|((b[p+5]&127)<<14)|((b[p+6]&127)<<7)|(b[p+7]&127):(b[p+4]<<24)|(b[p+5]<<16)|(b[p+6]<<8)|b[p+7];
  if(id=='TIT2'||id=='TPE1'){const e=b[p+10],d=b.slice(p+11,p+10+l);let s=e==1||e==2?new TextDecoder(e==1?'utf-16':'utf-16be').decode(d):new TextDecoder(e==3?'utf-8':'latin1').decode(d);
   o[id=='TIT2'?'title':'artist']=s.replace(/\0/g,'').trim();}p+=10+l;}return o}catch(e){return{}}}
$('#file').onchange=async e=>{await idb;for(const f of e.target.files){const m=await id3(f);
 const rec={id:'u'+Date.now()+Math.random().toString(36).slice(2,6),title:m.title||f.name.replace(/\.[^.]+$/,''),artist:m.artist||'',hue:Math.random()*360|0,blob:f,added:Date.now()};
 await new Promise(r=>{const q=store('readwrite').put(rec);q.onsuccess=q.onerror=r});}
 e.target.value='';await loadUploads();openPl('uploads')};
async function delUp(id){await new Promise(r=>{const q=store('readwrite').delete(id);q.onsuccess=q.onerror=r});
 liked=liked.filter(x=>x!=id);recent=recent.filter(x=>x!=id);save('liked',liked);save('recent',recent);await loadUploads();render()}
let getPl=function(id){if(id=='liked')return{id,name:'Liked Songs',desc:'Your hearted tracks',hue:250,ids:liked,icon:'♥'};
 if(id=='uploads')return{id,name:'My Uploads',desc:'Songs from your device',hue:100,ids:uploads.map(u=>u.id),icon:'⇪'};
 if(id=='recent')return{id,name:'Recently Played',desc:'Your last 30 plays',hue:30,ids:recent,icon:'⟲'};return PL.find(p=>p.id==id)}
const cards=ps=>`<div class="grid">${ps.map(p=>`<div class="card" data-pl="${p.id}">${cover(p.hue,p.icon||esc(p.name))}<b>${esc(p.name)}</b><small>${esc(p.desc)}</small></div>`).join('')}</div>`;
let rows=function(ids,pl){const list=ids.map(byId).filter(Boolean);if(!list.length)return'<p style="color:#b3b3b3">Nothing here yet.</p>';
 return list.map((t,i)=>`<div class="tr ${queue[qi]==t.id?'cur':''}" data-t="${t.id}" data-pl="${pl}"><span class="n">${i+1}</span>${t.art?`<div class="cv" style="background:center/cover url('${t.art.replace('600x600','100x100')}')"></div>`:cover(t.hue,'♪')}<div><span class="t">${esc(t.title)}${t.ext?`<b class="bdg${t.full?" full":""}">${t.full?"FULL":"30s"}</b>`:""}</span><small>${esc(t.artist)}</small></div><button class="ic h ${liked.includes(t.id)?'liked':''}" data-h="${t.id}">${liked.includes(t.id)?'♥':'♡'}</button>${t.up?`<button class="del" data-del="${t.id}">✕</button>`:t.ext?`<button class="del" data-menu="${t.id}">⋯</button>`:'<span class="d"></span>'}</div>`).join('')}
let render=function(){const m=$('#main');document.querySelectorAll('#side a').forEach(a=>a.classList.toggle('on',a.dataset.v==view));
 if(view=='home'){const h=new Date().getHours();m.innerHTML=`<h1>${h<12?'Good morning':h<18?'Good afternoon':'Good evening'}</h1>${cards([getPl('liked'),...PL])}<h3>Recently played</h3>${recent.length?rows(recent.slice(0,8),'recent'):'<p style="color:#b3b3b3">Play something to see it here.</p>'}`}
 else if(view=='search'){m.innerHTML=`<h1>Search</h1><input id="search" type="search" placeholder="What do you want to listen to?" value="${esc(window.q||'')}"><div id="res"></div>`;
  const s=$('#search'),upd=()=>{window.q=s.value.trim();const q=window.q.toLowerCase();$('#res').innerHTML=q?rows(all().filter(t=>(t.title+' '+t.artist).toLowerCase().includes(q)).map(t=>t.id),'search'):'<h3>Browse all</h3>'+cards(PL)};s.oninput=upd;upd()}
 else if(view=='library'){m.innerHTML=`<h1>Your Library</h1><button class="pill" id="add">＋ Add songs</button>${cards([getPl('liked'),getPl('uploads'),getPl('recent'),...PL])}`;$('#add').onclick=()=>$('#file').click()}
 else{const p=getPl(curPl);m.innerHTML=`<div class="hero">${cover(p.hue,p.icon||esc(p.name))}<div><small>Playlist</small><h1>${esc(p.name)}</h1><small style="color:#b3b3b3">${esc(p.desc)} • ${p.ids.length} songs</small></div></div><button class="big-play" id="plplay">▶</button>${p.id=='uploads'?'<button class="pill" id="add">＋ Add songs</button>':''}${rows(p.ids,p.id)}`;
  $('#plplay').onclick=()=>p.ids.length&&playFrom(p.id,p.ids[shuffle?Math.random()*p.ids.length|0:0]);if($('#add'))$('#add').onclick=()=>$('#file').click()}}
function openPl(id){curPl=id;view='pl';render();$('#main').scrollTop=0}
let srcIds=[];
function playFrom(pl,id){srcIds=pl=='search'?[...document.querySelectorAll('#res .tr')].map(e=>e.dataset.t):[...getPl(pl).ids];
 queue=[...srcIds];if(shuffle){queue=queue.filter(x=>x!=id).sort(()=>Math.random()-.5);queue.unshift(id)}qi=queue.indexOf(id);load(true)}
function load(go){const t=byId(queue[qi]);if(!t)return;au.src=t.src;if(go)au.play().catch(()=>{});
 recent=[t.id,...recent.filter(x=>x!=t.id)].slice(0,30);save('recent',recent);ui();if(view!='pl'||curPl!='recent')render();
 if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:'Tunely',artwork:[{src:'logo.svg',sizes:'512x512',type:'image/svg+xml'}]})}}
let ui=function(){const t=byId(queue[qi]);const L=t&&liked.includes(t.id);
 if(t){$('#npT').textContent=$('#fT').textContent=t.title;$('#npA').textContent=$('#fA').textContent=t.artist;
  $('#npCover').outerHTML=cover(t.hue,'♪').replace('class="cv"','class="cv" id="npCover"');$('#fCover').outerHTML=cover(t.hue,esc(t.title)).replace('class="cv"','class="cv big" id="fCover"');$('#full').style.setProperty('--c',`hsl(${t.hue},50%,35%)`)}
 ['#like','#flike'].forEach(s=>{$(s).textContent=L?'♥':'♡';$(s).classList.toggle('liked',!!L)});
 const p=au.paused?'▶':'❚❚';$('#play').textContent=$('#fplay').textContent=p;
 ['#shuf','#fshuf'].forEach(s=>$(s).classList.toggle('on',shuffle));['#rep','#frep'].forEach(s=>{$(s).classList.toggle('on',repeat>0);$(s).textContent=repeat==2?'↻¹':'↻'})}
const toggle=()=>{if(qi<0){playFrom('all','t0');return}au.paused?au.play():au.pause()};
const next=(auto)=>{if(qi<0)return;if(auto&&repeat==2){au.currentTime=0;au.play();return}if(qi<queue.length-1)qi++;else if(repeat||!auto)qi=0;else return;load(true)};
const prev=()=>{if(au.currentTime>3){au.currentTime=0;return}if(qi>0){qi--;load(true)}};
const like=()=>{const id=queue[qi];if(!id)return;liked=liked.includes(id)?liked.filter(x=>x!=id):[id,...liked];save('liked',liked);ui();render()};
$('#play').onclick=$('#fplay').onclick=e=>{e.stopPropagation();toggle()};$('#next').onclick=$('#fnext').onclick=()=>next();$('#prev').onclick=$('#fprev').onclick=prev;
$('#like').onclick=$('#flike').onclick=e=>{e.stopPropagation();like()};
$('#shuf').onclick=$('#fshuf').onclick=()=>{shuffle=!shuffle;save('shuf',shuffle);ui()};$('#rep').onclick=$('#frep').onclick=()=>{repeat=(repeat+1)%3;save('rep',repeat);ui()};
$('#npInfo').onclick=()=>{if(innerWidth<=760&&qi>=0)$('#full').hidden=false};$('#fclose').onclick=()=>$('#full').hidden=true;
$('#vol').oninput=e=>au.volume=e.target.value;
let seeking=0;['#seek','#fseek'].forEach(s=>{$(s).oninput=e=>{seeking=1;if(au.duration)au.currentTime=e.target.value/1000*au.duration};$(s).onchange=()=>seeking=0});
au.ontimeupdate=()=>{const r=au.duration?au.currentTime/au.duration:0;if(!seeking){$('#seek').value=$('#fseek').value=r*1000}$('#mprog i').style.width=r*100+'%';
 $('#cur').textContent=$('#fcur').textContent=fmt(au.currentTime);$('#dur').textContent=$('#fdur').textContent=fmt(au.duration)};
au.onplay=au.onpause=ui;au.onended=()=>next(true);
document.addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d){e.stopPropagation();if(confirm('Delete this song?'))delUp(d.dataset.del);return}
 const h=e.target.closest('[data-h]');if(h){const id=h.dataset.h;liked=liked.includes(id)?liked.filter(x=>x!=id):[id,...liked];save('liked',liked);ui();render();return}
 const r=e.target.closest('.tr');if(r){playFrom(r.dataset.pl,r.dataset.t);return}
 const c=e.target.closest('.card');if(c){openPl(c.dataset.pl);return}
 const a=e.target.closest('#side a');if(a){view=a.dataset.v;render()}});
if('mediaSession'in navigator){const ms=navigator.mediaSession;ms.setActionHandler('play',()=>au.play());ms.setActionHandler('pause',()=>au.pause());ms.setActionHandler('nexttrack',()=>next());ms.setActionHandler('previoustrack',prev);
 try{ms.setActionHandler('seekto',d=>au.currentTime=d.seekTime)}catch(e){}}
au.volume=.8;loadUploads().then(()=>{render();ui()});render();ui();
// ---- iTunes catalog search (30s previews, public API, no key) with fuzzy fallbacks ----
let cbN=0;const jsonp=(u,ms=8000)=>new Promise((ok,no)=>{const n='cb'+(++cbN)+'_'+Date.now(),s=document.createElement('script');let done=0;const end=()=>{done=1;delete window[n];s.remove()};
 const tm=setTimeout(()=>{if(!done){end();no(new Error('timeout'))}},ms);window[n]=j=>{clearTimeout(tm);end();ok(j)};s.onerror=()=>{clearTimeout(tm);end();no(new Error('jsonp'))};s.src=u+'&callback='+n;document.head.appendChild(s)});
const ij=async u=>{try{return await jsonp(u)}catch(e){const r=await fetch(u);if(!r.ok)throw new Error('http '+r.status);return r.json()}};
window.srcErr={};
const itunes={};const lev=(a,b)=>{const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]!=b[j-1]));p=t}}return d[b.length]};
const tri=s=>{s='  '+s+' ';const r=new Set;for(let i=0;i<s.length-2;i++)r.add(s.slice(i,i+3));return r};
const norm=s=>s.toLowerCase().replace(/\(.*?\)|\[.*?\]/g,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
function sim(q,t){q=norm(q);const s=norm(t.title+' '+t.artist),A=tri(q),B=tri(s);let n=0;A.forEach(x=>B.has(x)&&n++);
 const words=q.split(' ').filter(Boolean),hit=words.filter(w=>s.split(' ').some(x=>x.startsWith(w)||lev(w,x)<=Math.max(1,w.length/4|0))).length/(words.length||1);
 return .5*n/(A.size||1)+.5*hit}
const fixes=[[/ph/g,'f'],[/ie/g,'ei'],[/ei/g,'ie'],[/(.)\1/g,'$1'],[/z/g,'s'],[/k/g,'c'],[/y$/g,'ie'],[/ou/g,'o']];
async function it(term){if(itunes['q'+term])return itunes['q'+term];try{const j=await ij('https://itunes.apple.com/search?media=music&entity=song&limit=50&term='+encodeURIComponent(term));window.srcErr.it=0;return itunes['q'+term]=j.results.filter(x=>x.previewUrl).map(x=>{const t={id:'i'+x.trackId,title:x.trackName,artist:x.artistName,src:x.previewUrl,art:x.artworkUrl100?.replace('100x100','600x600'),hue:x.trackId%360,ext:1,g:x.primaryGenreName,col:x.collectionName,aid:x.artistId,cart:x.collectionArtistName,ex:x.trackExplicitness,tc:x.trackCount};itunes[t.id]=t;return t})}catch(e){window.srcErr.it=1;return[]}}
const BADRE=/remix|sped ?up|slowed|reverb|nightcore|\b8d\b|karaoke|instrumental|cover|tribute|lullaby|piano version|acapella|a cappella|\blive\b|\bedit\b|\bmix\b|version|kidz bop|in the style of|made famous|sessions|lullapop|rockabye|ambient/gi;
function isBad(t,q){const ql=(q||'').toLowerCase(),txt=[t.title,t.col,t.artist].join(' ');const m=(txt.match(BADRE)||[]).map(x=>x.toLowerCase());
 if(m.some(w=>!ql.includes(w.trim())))return true;if(t.cart&&t.cart!='Various Artists'&&t.cart!=t.artist&&/tribute|karaoke|hits|kids|cover|lullaby|piano/i.test(t.cart))return true;return false}
function rankT(list,q){const good=[],bad=[],seen={};list.forEach(t=>{(isBad(t,q)?bad:good).push(t)});
 const sc=t=>(t.cart=='Various Artists'?0:2)+(t.tc>3?2:/ - single$/i.test(t.col||'')?1:0)+(t.ex=='explicit'?1:0);
 const out=[];good.forEach(t=>{const k=norm(t.title)+'|'+norm(t.artist);if(k in seen){const j=seen[k];if(sc(t)>sc(out[j]))out[j]=t}else{seen[k]=out.length;out.push(t)}});const fq={};list.forEach(t=>fq[t.artist]=(fq[t.artist]||0)+1);const byT={};out.forEach((t,i)=>(byT[norm(t.title)]=byT[norm(t.title)]||[]).push(i));
 Object.values(byT).forEach(ix=>{if(ix.length<2)return;const ts=ix.map(i=>out[i]).sort((a,b)=>fq[b.artist]-fq[a.artist]);ix.forEach((i,k)=>out[i]=ts[k])});return{good:out,bad}}
async function smart(q){const n=norm(q);if(!n)return{res:[]};let pool=await it(n);const w=n.split(' ');
 const tries=[];if(pool.length<5){for(let i=0;i<w.length&&w.length>1;i++)tries.push(w.filter((_,k)=>k!=i).join(' '));fixes.forEach(([a,b])=>{const v=n.replace(a,b);if(v!=n)tries.push(v)});w.filter(x=>x.length>2).forEach(x=>tries.push(x))}
 for(const t of tries.slice(0,10)){if(pool.length>=15)break;pool=[...pool,...await it(t)]}
 const seen=new Set,res=pool.filter(t=>!seen.has(t.id)&&seen.add(t.id)).map(t=>({t,s:sim(q,t)})).sort((a,b)=>b.s-a.s);
 return{res:res.map(r=>r.t),unsure:res.length&&res[0].s<.6,top:res.slice(0,5).map(r=>r.t)}}
const _byId=byId;byId=id=>itunes[id]||_byId(id);
const _cover=cover;
const links=t=>{const q=encodeURIComponent(t.title+' '+t.artist);return`<a class="lk" target="_blank" rel="noopener" href="https://open.spotify.com/search/${q}">Open in Spotify</a><a class="lk" target="_blank" rel="noopener" href="https://music.youtube.com/search?q=${q}">Open in YouTube Music</a>`};
let srchTimer;
let catalog=async function(q){const box=$('#cat');if(!box)return;box.innerHTML='<p style="color:#b3b3b3">Searching catalog…</p>';const {res,unsure,top}=await smart(q);if((window.q||'').trim()!==q||!$('#cat'))return;
 window.catIds=res.map(t=>t.id);
 box.innerHTML=(unsure&&top.length?`<h3>Did you mean…?</h3><div class="dym">${top.map(t=>`<button class="pill alt" data-dym="${t.id}">${esc(t.title)} — ${esc(t.artist)}</button>`).join('')}</div>`:'')+
 (res.length?`<h3>Song previews (30s, via Apple Music)</h3>`+rows(window.catIds,'cat'):'<p style="color:#b3b3b3">No catalog matches.</p>')}
// hook into search view
const _render=render;render=function(){_render();if(view=='search'){const s=$('#search');$('#res').insertAdjacentHTML('afterend','<div id="cat"></div>');
 const go=()=>{clearTimeout(srchTimer);const q=s.value.trim();if(q.length>1)srchTimer=setTimeout(()=>catalog(q),400);else $('#cat').innerHTML=''};s.addEventListener('input',go);s.addEventListener('search',go);s.addEventListener('keyup',go);s.addEventListener('change',go);go()}};
const _getPl=getPl;getPl=id=>id=='cat'?{ids:window.catIds||[]}:_getPl(id);
document.addEventListener('click',e=>{const d=e.target.closest('[data-dym]');if(d){e.stopPropagation();playFrom('cat',d.dataset.dym)}},true);
// show art + links for external tracks
const _ui=ui;ui=function(){_ui();const t=byId(queue[qi]);let l=$('#flinks');if(!l){$('.frow').insertAdjacentHTML('afterend','<div id="flinks"></div>');l=$('#flinks')}
 l.innerHTML=t&&t.ext?links(t):'';if(t&&t.art){['#npCover','#fCover'].forEach(s=>{const c=$(s);c.textContent='';c.style.background=`center/cover url("${t.art}")`})}};
const _rows=rows;rows=(ids,pl)=>{let h=_rows(ids,pl);ids.forEach(id=>{const t=byId(id);if(t&&t.ext){h=h.replace(`data-t="${id}" data-pl="${pl}">`,`data-t="${id}" data-pl="${pl}">`).replace(new RegExp(`(data-t="${id}"[^]*?<span class="d"></span>)`),`$1`)}});return h};
// track menu for catalog rows: long-press-free ⋯ button
document.addEventListener('click',e=>{const m=e.target.closest('[data-menu]');if(!m)return;e.stopPropagation();const t=byId(m.dataset.menu);
 let p=$('#menu');if(!p){document.body.insertAdjacentHTML('beforeend','<div id="menu"></div>');p=$('#menu')}p.innerHTML=`<b>${esc(t.title)}</b><small>${esc(t.artist)}</small>${links(t)}<button class="pill" onclick="this.parentNode.remove()">Close</button>`},true);
// ---- artist search ----
async function findArtists(q){try{return (await ij('https://itunes.apple.com/search?media=music&entity=musicArtist&limit=4&term='+encodeURIComponent(q))).results||[]}catch(e){return[]}}
async function artistSongs(name,id){const k='a'+id;if(itunes[k])return itunes[k];try{const j=await ij('https://itunes.apple.com/search?media=music&entity=song&attribute=artistTerm&limit=50&term='+encodeURIComponent(name));
 return itunes[k]=j.results.filter(x=>x.previewUrl).sort((x,y)=>(y.artistId==id)-(x.artistId==id)).map(x=>{const t={id:'i'+x.trackId,title:x.trackName,artist:x.artistName,src:x.previewUrl,art:x.artworkUrl100?.replace('100x100','600x600'),hue:x.trackId%360,ext:1,g:x.primaryGenreName,col:x.collectionName,aid:x.artistId,cart:x.collectionArtistName,ex:x.trackExplicitness,tc:x.trackCount};itunes[t.id]=t;return t})}catch(e){return[]}}
const _catalog=catalog;catalog=async function(q){const p=_catalog(q);const a=await findArtists(q);await p;const box=$('#cat');if(!box||(window.q||'').trim()!==q||!a.length)return;
 box.insertAdjacentHTML('afterbegin',`<h3>Artists</h3><div class="dym">${a.map(x=>`<button class="pill alt" data-artist="${x.artistId}" data-an="${esc(x.artistName)}">🎤 ${esc(x.artistName)}</button>`).join('')}</div>`)};
document.addEventListener('click',async e=>{const b=e.target.closest('[data-artist]');if(!b)return;e.stopPropagation();const box=$('#cat');if(!box)return;
 box.innerHTML='<p style="color:#b3b3b3">Loading songs…</p>';const s=await artistSongs(b.dataset.an,b.dataset.artist);window.catIds=s.map(t=>t.id);
 box.innerHTML=`<h3>${esc(b.dataset.an)} — songs</h3>`+(s.length?rows(window.catIds,'cat'):'<p style="color:#b3b3b3">No songs found.</p>')},true);

// ---- full-length free sources: Audius + Internet Archive; persistence of external tracks ----
let audHost=null;const AH=async()=>{if(audHost)return audHost;try{const r=await fetch('https://api.audius.co');const j=await r.json();audHost=j.data[Math.random()*j.data.length|0]}catch(e){audHost='https://api.audius.co'}return audHost};
const reg=t=>(itunes[t.id]=t);
const audT=x=>reg({id:'a'+x.id,title:x.title,artist:x.user?.name||'Audius',src:`${audHost}/v1/tracks/${x.id}/stream?app_name=Tunely`,art:x.artwork?.['480x480'],hue:[...x.id].reduce((a,c)=>a+c.charCodeAt(0),0)%360,ext:1,full:1,g:x.genre});
async function audius(q){const h=await AH();const r=await fetch(`${h}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=Tunely`);if(!r.ok)throw new Error('http '+r.status);const l=((await r.json()).data||[]).filter(x=>x.is_streamable!==false).slice(0,12).map(audT);const rr=rankT(l,q);return[...rr.good,...rr.bad]}
async function audUsers(q){const h=await AH();const r=await fetch(`${h}/v1/users/search?query=${encodeURIComponent(q)}&app_name=Tunely`);return ((await r.json()).data||[]).slice(0,4)}
async function audUserTracks(id){const h=await AH();const r=await fetch(`${h}/v1/users/${id}/tracks?app_name=Tunely&limit=50`);return ((await r.json()).data||[]).filter(x=>x.is_streamable!==false).map(audT)}
async function archive(q){const r=await fetch('https://archive.org/advancedsearch.php?q='+encodeURIComponent(`(${q}) AND mediatype:audio`)+'&fl[]=identifier&fl[]=title&fl[]=creator&rows=10&output=json');const docs=(await r.json()).response.docs;
 const out=await Promise.all(docs.map(async d=>{try{const m=await (await fetch('https://archive.org/metadata/'+d.identifier)).json();const f=(m.files||[]).find(f=>/\.mp3$/i.test(f.name));if(!f)return null;
  return reg({id:'ia_'+d.identifier,title:f.title||d.title||d.identifier,artist:[].concat(d.creator||f.artist||'Internet Archive')[0],src:`https://archive.org/download/${d.identifier}/${f.name.split('/').map(encodeURIComponent).join('/')}`,art:`https://archive.org/services/img/${d.identifier}`,hue:d.identifier.length*37%360,ext:1,full:1})}catch(e){return null}}));
 return out.filter(Boolean).slice(0,6)}
const msg=t=>`<p style="color:#b3b3b3">${t}</p>`,errm=n=>`<p style="color:#f77">⚠ Couldn't reach ${n} — check your connection and try again.</p>`;
window.secIds={};const _gp2=getPl;getPl=id=>window.secIds[id]?{ids:window.secIds[id]}:_gp2(id);
catalog=async function(q){const box=$('#cat');if(!box)return;const stale=()=>(window.q||'').trim()!==q||!$('#cat');
 box.innerHTML='<div id="sArt"></div><h3>Full songs (Audius)</h3><div id="sAud">'+msg('Searching…')+'</div><h3>Full songs (Internet Archive)</h3><div id="sIa">'+msg('Searching…')+'</div><div id="sIt">'+msg('Searching previews…')+'</div>';
 const sec=(sel,pl,list,empty)=>{if(stale())return;const el=$(sel);if(!el)return;window.secIds[pl]=list.map(t=>t.id);el.innerHTML=list.length?rows(window.secIds[pl],pl):msg(empty)};
 audius(q).then(l=>sec('#sAud','aud',l,'No full songs on Audius.')).catch(()=>{if(!stale())$('#sAud').innerHTML=errm('Audius')});
 archive(q).then(l=>sec('#sIa','ia',l,'No full songs on Internet Archive.')).catch(()=>{if(!stale())$('#sIa').innerHTML=errm('Internet Archive')});
 (async()=>{try{const [{res,unsure,top},arts]=await Promise.all([smart(q),findArtists(q).catch(()=>[])]);const q1=norm(q),A=arts.find(a=>{const a1=norm(a.artistName);return a1==q1||lev(a1,q1)<=Math.max(1,q1.length/5|0)});
  let lead=[];if(A){try{lead=(await artistSongs(A.artistName,A.artistId)).filter(t=>t.aid==A.artistId)}catch(e){}}if(stale())return;
  const rk=rankT([...lead,...res],q);window.catIds=rk.good.map(t=>t.id);window.secIds.oth=rk.bad.map(t=>t.id);
  $('#sIt').innerHTML=(unsure&&top.length?`<h3>Did you mean…?</h3><div class="dym">${top.map(t=>`<button class="pill alt" data-dym="${t.id}">${esc(t.title)} — ${esc(t.artist)}</button>`).join('')}</div>`:'')+'<h3>Song previews (30s, via Apple Music)</h3>'+(rk.good.length||rk.bad.length?rows(window.catIds,'cat')+(rk.bad.length?`<button class="pill alt" data-oth="1">Show other versions (${rk.bad.length})</button><div id="othv" hidden>${rows(window.secIds.oth,'oth')}</div>`:''):window.srcErr.it?errm('Apple Music'):msg('No preview matches.'))}catch(e){if(!stale())$('#sIt').innerHTML=errm('Apple Music')}})();
 const [ia,au]=await Promise.all([findArtists(q).catch(()=>[]),audUsers(q).catch(()=>[])]);if(stale()||!(ia.length||au.length))return;
 $('#sArt').innerHTML=`<h3>Artists</h3><div class="dym">${ia.map(x=>`<button class="pill alt" data-artist="${x.artistId}" data-an="${esc(x.artistName)}">🎤 ${esc(x.artistName)}</button>`).join('')}${au.map(x=>`<button class="pill alt" data-aartist="${x.id}" data-an="${esc(x.name)}">🎧 ${esc(x.name)} <b class="bdg full">FULL</b></button>`).join('')}</div>`};
document.addEventListener('click',async e=>{const b=e.target.closest('[data-aartist]');if(!b)return;e.stopPropagation();const box=$('#cat');if(!box)return;box.innerHTML=msg('Loading songs…');
 try{const s=await audUserTracks(b.dataset.aartist);window.catIds=s.map(t=>t.id);box.innerHTML=`<h3>${esc(b.dataset.an)} — full songs (Audius)</h3>`+(s.length?rows(window.catIds,'cat'):msg('No songs found.'))}catch(_){box.innerHTML=errm('Audius')}},true);
// persist external tracks referenced anywhere in localStorage (liked, recent, playlists)
(()=>{try{ls('extTracks',[]).forEach(reg)}catch(e){}const keep=()=>{try{let blob='';for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k!='extTracks')blob+=localStorage.getItem(k)}
 const cur=byId(queue[qi]);const L=Object.values(itunes).filter(t=>t&&t.id&&t.ext&&(blob.includes('"'+t.id+'"')||t===cur));save('extTracks',L)}catch(e){}};
 setInterval(keep,3000);document.addEventListener('visibilitychange',keep);addEventListener('pagehide',keep);setTimeout(()=>{try{render()}catch(e){}},0)})();

// ---- DJ: client-side taste profile + auto queue ----
let prof=ls('djProf',{a:{},g:{}}),djOn=false,lastP={},djLastA='';
const bump=(t,w)=>{if(!t)return;prof.a[t.artist]=(prof.a[t.artist]||0)+w;if(t.g)prof.g[t.g]=(prof.g[t.g]||0)+w;save('djProf',prof)};
au.addEventListener('timeupdate',()=>{if(queue[qi])lastP={id:queue[qi],pos:au.currentTime,dur:au.duration}});
au.addEventListener('ended',()=>{bump(byId(lastP.id),2);lastP={}});
au.addEventListener('loadstart',()=>{const p=lastP;lastP={};if(p.id&&p.id!=queue[qi]){const t=byId(p.id);bump(t,p.pos<15?-1:p.pos>p.dur*.5?2:1)}
 if(djOn){const t=byId(queue[qi]);if(t&&t.artist!=djLastA){djLastA=t.artist;const a=prof.a[t.artist]>0;djSay(a?`Up next: more ${t.artist} because you've been playing it`:`Up next: ${t.artist}${t.g?` — some ${t.g} you might like`:' — something new for you'}`)}
  if(qi>=queue.length-3&&!djBusy)djFill().then(l=>{if(l.length)queue.push(...l)})}});
const djSay=m=>{let b=$('#djb');if(!b){document.body.insertAdjacentHTML('beforeend','<div id="djb"></div>');b=$('#djb')}b.textContent='🎧 DJ: '+m;b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('on'),6000)};
const topK=(o,k)=>Object.entries(o).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,k).map(x=>x[0]);
const shufA=a=>a.sort(()=>Math.random()-.5);
const AG={'Hip-Hop/Rap':'Hip-Hop/Rap','R&B/Soul':'R&B/Soul','R&B':'R&B/Soul','Pop':'Pop','Afrobeats':'Afrobeats','Afro-Pop':'Afrobeats','Latin':'Latin','Urbano latino':'Latin','Rock':'Rock','Alternative':'Alternative','Country':'Country','Electronic':'Electronic','Dance':'Dance & EDM'};
let djBusy=false;
async function djFill(n=15){djBusy=true;try{
 const L={...prof.a,...{}};liked.forEach(id=>{const t=byId(id);if(t){L[t.artist]=(L[t.artist]||0)+5;}});const G={...prof.g};liked.forEach(id=>{const t=byId(id);if(t&&t.g)G[t.g]=(G[t.g]||0)+5});
 const arts=topK(L,3),gen=topK(G,2),avoid=new Set([...recent.slice(0,30),...queue]),ok=t=>t&&!avoid.has(t.id)&&(avoid.add(t.id),1);
 const top=[],sim=[],disc=[];
 await Promise.all([
  ...arts.map(async(a,i)=>{try{top.push(...shufA((await artistSongs(a,0)).filter(t=>t.artist.toLowerCase().includes(a.toLowerCase().split(/[,&]/)[0].trim()))).slice(0,[5,3,2][i]))}catch(e){}}),
  ...gen.map(async g=>{try{const r=(await it(norm(g))).filter(t=>!arts.includes(t.artist));const by={};r.forEach(t=>(by[t.artist]=by[t.artist]||[]).push(t));sim.push(...Object.values(by).map(x=>x[0]))}catch(e){}}),
  (async()=>{try{const h=await AH(),g=AG[gen[0]]||gen[0]||'';const r=await fetch(`${h}/v1/tracks/trending?app_name=Tunely${g?'&genre='+encodeURIComponent(g):''}`);disc.push(...shufA(((await r.json()).data||[]).filter(x=>x.is_streamable!==false).map(audT)).slice(0,3))}catch(e){}})()]);
 const nb=t=>!isBad(t,'');const a=shufA(top).filter(nb).filter(ok).slice(0,Math.round(n*.6)),b=shufA(sim).filter(nb).filter(ok).slice(0,Math.round(n*.3)+(a.length<n*.6?n*.6-a.length|0:0)),c=disc.filter(nb).filter(ok).slice(0,Math.max(1,n-a.length-b.length>3?3:Math.round(n*.1)));
 const out=[];while(a.length||b.length||c.length){out.push(...a.splice(0,2),...b.splice(0,1));if(out.length%6==0||!a.length)out.push(...c.splice(0,1))}
 return out.map(t=>t.id)}finally{djBusy=false}}
async function startDJ(){const has=Object.keys(prof.a).length||liked.length;if(!has&&!Object.keys(prof.g).length){view='home';render();djSay('Pick a vibe below to get started');return}
 djSay('Warming up the decks…');const l=await djFill();if(!l.length){djSay("Couldn't load any songs — check your connection and try again.");const e=$('#djerr');e&&(e.textContent='⚠ DJ couldn\'t load songs right now. Try again.');return}
 djOn=true;djLastA='';queue=l;qi=0;load(true);djUI()}
const djUI=()=>{const b=$('#fdj');if(b){b.classList.toggle('on',djOn);b.textContent=djOn?'🎧 DJ on':'🎧 DJ'}};
const GEN=['Hip-Hop/Rap','R&B/Soul','Pop','Afrobeats','Latin','Rock','Country'];
const _pf=playFrom;playFrom=function(...a){djOn=false;djUI();return _pf(...a)};
const _r3=render;render=function(){_r3();if(view=='home'){const h=$('#main h1');const cold=!Object.keys(prof.a).length&&!liked.length&&!Object.keys(prof.g).length;
 h&&h.insertAdjacentHTML('afterend',`<div class="djcard" data-dj="1"><div><b>DJ</b><span>Made for you</span><small>${cold?'Pick a vibe to start':'Picks songs from what you play and like'}</small></div><i>${djOn?'❚❚':'▶'}</i></div>${cold?`<div class="dym">${GEN.map(g=>`<button class="pill alt" data-djg="${g}">${g}</button>`).join('')}</div>`:''}<p id="djerr" style="color:#f77"></p>`)}};
const _u3=ui;ui=function(){_u3();if(!$('#fdj')){const f=$('.frow');f&&f.insertAdjacentHTML('afterend','<button id="fdj" class="pill alt">🎧 DJ</button>')}djUI()};
document.addEventListener('click',e=>{const g=e.target.closest('[data-djg]');if(g){e.stopPropagation();prof.g[g.dataset.djg]=(prof.g[g.dataset.djg]||0)+3;save('djProf',prof);startDJ();return}
 if(e.target.closest('[data-dj]')||e.target.closest('#fdj')){e.stopPropagation();if(djOn&&e.target.closest('#fdj')){djOn=false;djUI();djSay('DJ off');return}if(djOn&&!au.paused){au.pause();return}if(djOn){au.play();return}startDJ()}},true);
setTimeout(()=>{try{render()}catch(e){}},0);

document.addEventListener('click',e=>{const b=e.target.closest('[data-oth]');if(!b)return;e.stopPropagation();const v=$('#othv');if(v){v.hidden=!v.hidden;b.textContent=(v.hidden?'Show':'Hide')+' other versions ('+(window.secIds.oth||[]).length+')'}},true);
