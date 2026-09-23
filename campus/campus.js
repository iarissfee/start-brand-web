let CSRF="";
let user=null;
let modules=[];
let state={completed:[],notes:{},mentoring:[]};
const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];

async function api(path,opts={}){
  const headers=new Headers(opts.headers||{});
  if(opts.body && !(opts.body instanceof FormData)) headers.set("content-type","application/json");
  if(opts.method && opts.method!=="GET" && CSRF) headers.set("x-csrf-token",CSRF);
  const r=await fetch(path,{credentials:"same-origin",...opts,headers});
  let data={}; try{data=await r.json();}catch(_){ }
  if(r.status===401){ location.href="/campus/login.html"; throw new Error("AUTH"); }
  if(!r.ok) throw Object.assign(new Error(data.message||data.error||"Error"),{data,status:r.status});
  return data;
}

function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function progress(){return modules.length?Math.round(state.completed.length/modules.length*100):0;}
function youtubeEmbed(url){
  if(!url)return "";
  try{
    const u=new URL(url);
    let id="";
    if(u.hostname.includes("youtu.be")) id=u.pathname.slice(1);
    else if(u.hostname.includes("youtube.com")) id=u.searchParams.get("v")||u.pathname.split("/").filter(Boolean).pop();
    return id?"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id):"";
  }catch(_){return "";}
}

async function boot(){
  const session=await api("/api/session");
  user=session.user; CSRF=session.csrf;
  if(!session.course_access && user.role!=="admin"){location.href="/campus/comprar.html";return;}
  const [course,studentState]=await Promise.all([api("/api/course"),api("/api/state")]);
  modules=course.modules||[]; state=studentState;
  qs("#student-display").textContent=(user.name||"ALUMNO").toUpperCase();
  qs("#student-email").textContent=user.email||"";
  if(user.role==="admin") qs("#admin-link").hidden=false;
  render(); loadNotes(); renderMentoring();
}

function render(){
  const list=qs("#module-list"); list.innerHTML="";
  modules.forEach(m=>{
    const done=state.completed.includes(m.id);
    const row=document.createElement("article"); row.className="module";
    row.innerHTML='<div class="module-number">'+String(m.id).padStart(2,"0")+'</div><div><h3>'+esc(m.title)+'</h3><p>'+esc(m.description)+'</p></div><div class="module-actions"><button class="open-module" data-id="'+m.id+'">Abrir →</button><button class="complete '+(done?'done':'')+'" data-complete="'+m.id+'" aria-label="Marcar módulo">'+(done?'✓':'○')+'</button></div>';
    list.appendChild(row);
  });
  const p=progress();
  qs("#hero-progress").textContent=p+"%"; qs("#side-progress").textContent=p+"%";
  qs("#hero-bar").style.width=p+"%"; qs("#side-bar").style.width=p+"%";
  qs("#progress-message").textContent=p===100?"Programa completado. Ahora el trabajo es sostenerlo.":p>=60?"Ya hay sistema. Seguí cerrando las piezas que faltan.":p>=20?"Bien. Estás convirtiendo ideas en decisiones concretas.":"Empezá por el punto de partida.";
  const next=modules.find(m=>!state.completed.includes(m.id))||modules.at(-1);
  if(next){qs("#next-number").textContent=String(next.id).padStart(2,"0");qs("#next-title").textContent=next.title;qs("#next-desc").textContent=next.description;}
  qsa(".open-module").forEach(b=>b.onclick=()=>openModule(Number(b.dataset.id)));
  qsa(".complete").forEach(b=>b.onclick=()=>toggleComplete(Number(b.dataset.complete)));
}

async function toggleComplete(id){
  const done=state.completed.includes(id);
  await api("/api/progress",{method:"POST",body:JSON.stringify({module_id:id,completed:!done})});
  state.completed=done?state.completed.filter(x=>x!==id):[...state.completed,id];
  render();
}

function openModule(id){
  const m=modules.find(x=>x.id===id); if(!m)return;
  const embed=youtubeEmbed(m.video_url);
  const video=embed?'<div class="video-frame"><iframe src="'+esc(embed)+'" title="'+esc(m.title)+'" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>':'<div class="video-placeholder"><div><b>CLASE '+String(m.id).padStart(2,"0")+'</b><span>Esta clase todavía no fue publicada.</span></div></div>';
  qs("#module-content").innerHTML='<span class="lesson-tag">MÓDULO '+String(m.id).padStart(2,"0")+'</span><h2 class="lesson-title">'+esc(m.title)+'</h2><p class="lesson-copy">'+esc(m.copy)+'</p>'+video+'<div class="exercise"><h4>Antes de marcarlo como completado</h4><ol>'+(m.exercises||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><button class="btn '+(state.completed.includes(id)?'outline':'primary')+'" id="modal-complete">'+(state.completed.includes(id)?'Quitar completado':'Marcar como completado ✓')+'</button></div>';
  qs("#module-dialog").showModal();
  qs("#modal-complete").onclick=async()=>{await toggleComplete(id);qs("#module-dialog").close();};
}

function loadNotes(){
  qsa("[data-note]").forEach(t=>{
    t.value=state.notes?.[t.dataset.note]||"";
    let timer;
    t.addEventListener("input",()=>{
      clearTimeout(timer); qs("#save-note").textContent="Guardando…";
      timer=setTimeout(async()=>{
        try{await api("/api/notes",{method:"POST",body:JSON.stringify({key:t.dataset.note,value:t.value})});state.notes[t.dataset.note]=t.value;qs("#save-note").textContent="✓ Guardado";}
        catch(_){qs("#save-note").textContent="No se pudo guardar. Reintentá.";}
      },650);
    });
  });
}

function renderMentoring(){
  const box=qs("#mentor-history"); box.innerHTML="";
  if(!state.mentoring?.length){box.innerHTML='<p class="empty-state">Todavía no pediste ninguna mentoría.</p>';return;}
  state.mentoring.forEach(m=>{
    const a=document.createElement("article");a.className="mentor-request";
    const meet=m.meet_url&&m.status==="confirmed"?'<a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+esc(m.meet_url)+'">Entrar a Google Meet ↗</a>':'';
    a.innerHTML='<div><span>'+esc(m.status.toUpperCase())+'</span><h3>'+esc(m.session_name)+'</h3><p>'+esc(m.preferred_date)+' · '+esc(m.slot)+'</p></div>'+meet;
    box.appendChild(a);
  });
}

let currentSession="";
qsa(".booking-btn").forEach(b=>b.onclick=()=>{currentSession=b.dataset.session;qs("#booking-title").textContent=currentSession;qs("#booking-status").textContent="";qs("#booking-dialog").showModal();});
qs("#booking-form").addEventListener("submit",async e=>{
  e.preventDefault(); const btn=e.submitter; btn.disabled=true; qs("#booking-status").textContent="Enviando…";
  try{await api("/api/mentoring",{method:"POST",body:JSON.stringify({session_name:currentSession,preferred_date:qs("#booking-date").value,slot:qs("#booking-slot").value,notes:qs("#booking-notes").value})});const fresh=await api("/api/state");state.mentoring=fresh.mentoring||[];renderMentoring();qs("#booking-dialog").close();}
  catch(err){qs("#booking-status").textContent=err.message;}
  finally{btn.disabled=false;}
});

qs("#password-form").addEventListener("submit",async e=>{
  e.preventDefault(); const s=qs("#password-status");s.textContent="Actualizando…";
  try{await api("/api/change-password",{method:"POST",body:JSON.stringify({current_password:qs("#current-password").value,new_password:qs("#new-password").value})});e.target.reset();s.textContent="✓ Contraseña actualizada.";}
  catch(err){s.textContent=err.message;}
});

qs("#logout").onclick=async()=>{try{await api("/api/logout",{method:"POST",body:"{}"});}catch(_){} location.href="/campus/login.html";};
qs("#close-module").onclick=()=>qs("#module-dialog").close();
qs("#close-booking").onclick=()=>qs("#booking-dialog").close();
qsa(".nav-btn").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
qsa("[data-go]").forEach(b=>b.onclick=()=>switchView(b.dataset.go));
qs("#mobile-menu").onclick=()=>qs("#sidebar").classList.toggle("open");
function switchView(v){qsa(".view").forEach(x=>x.classList.toggle("active",x.dataset.viewPanel===v));qsa(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.view===v));qs("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});}

const resources={brief:{title:"Brief de marca",items:["¿Qué vendés u ofrecés?","¿Qué problema concreto resolvés?","¿A quién querés atraer?","¿Qué cambia para esa persona?","¿Qué te diferencia?","¿Cuál es tu objetivo de 90 días?"]},content:{title:"Matriz de contenido",items:["Pilar 1 · objetivo / idea / formato / CTA","Pilar 2 · objetivo / idea / formato / CTA","Pilar 3 · objetivo / idea / formato / CTA","Lunes · pieza / objetivo / CTA","Miércoles · pieza / objetivo / CTA","Viernes · pieza / objetivo / CTA"]},launch:{title:"Checklist de lanzamiento",items:["Propuesta clara","CTA probado","Links funcionando","Página revisada en celular","3 piezas de contenido listas","Seguimiento definido","Plan de 30 días anotado"]}};
qsa("[data-download]").forEach(b=>b.onclick=()=>printResource(b.dataset.download));
function printResource(type){const r=resources[type];const w=window.open("","_blank","noopener,noreferrer");if(!w)return;const rows=r.items.map((x,i)=>'<div class="row"><b>'+String(i+1).padStart(2,"0")+'</b><div>'+esc(x)+'<div class="line"></div></div></div>').join('');w.document.write('<!doctype html><meta charset="utf-8"><title>START BRAND · '+esc(r.title)+'</title><style>@page{margin:18mm}body{font-family:Arial;color:#111}.top{font-weight:800;font-size:20px;border-bottom:2px solid;padding-bottom:12px}.hero{padding:40px 0}.hero h1{font:46px Georgia;margin:8px 0}.hero small{color:#ff4f91}.row{display:grid;grid-template-columns:40px 1fr;gap:12px;border-top:1px solid #ddd;padding:18px 0}.row>b{color:#ff4f91}.line{height:55px;background:repeating-linear-gradient(transparent 0,transparent 17px,#ddd 18px);margin-top:10px}</style><div class="top">START BRAND ↗</div><div class="hero"><small>WORKBOOK · CAMPUS</small><h1>'+esc(r.title)+'</h1></div>'+rows+'<script>onload=()=>setTimeout(()=>print(),250)<\/script>');w.document.close();}

boot().catch(err=>{console.error(err);});