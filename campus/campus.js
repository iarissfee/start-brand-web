const ACCESS_HASH="c5b3805e4821bc32926b6e84690eae54a40e9fbc86fdbbec2c06dbad6615a469";
const EMAIL="experienciawebdigital@gmail.com";
const modules=[
{id:1,title:"Punto de partida",desc:"Objetivo, diagnóstico y foco.",copy:"Antes de pensar en colores, posteos o anuncios, necesitás saber qué estás construyendo y para qué. Este módulo ordena el punto de partida para que las decisiones siguientes tengan sentido.",exercise:["Definí un objetivo de 90 días.","Escribí qué está frenando hoy tu marca.","Elegí una sola prioridad para empezar." ]},
{id:2,title:"Posicionamiento & propuesta",desc:"Que se entienda por qué elegirte.",copy:"Una propuesta fuerte no intenta hablarle a todo el mundo. Define a quién ayuda, qué transformación ofrece y qué hace diferente a tu forma de resolverlo.",exercise:["Describí a tu cliente ideal sin hablar de edad o género: hablá de situación y necesidad.","Completá: Ayudo a ___ a lograr ___ sin ___.","Listá 3 razones reales por las que alguien podría elegirte." ]},
{id:3,title:"Identidad & mensaje",desc:"Una marca reconocible y coherente.",copy:"Tu identidad no es solo un logo. Es la combinación entre concepto, tono, estética y repetición. Acá empezás a construir un lenguaje que pueda reconocerse sin explicar demasiado.",exercise:["Elegí 3 palabras que describan cómo querés que se sienta tu marca.","Definí 3 cosas que tu marca nunca haría.","Escribí una frase corta que resuma tu idea central." ]},
{id:4,title:"Contenido que mueve",desc:"Redes con dirección, no por obligación.",copy:"Crear contenido se vuelve más fácil cuando cada pieza tiene una función. Vamos a separar autoridad, conexión, deseo y conversión para que no publiques por publicar.",exercise:["Definí 3 pilares de contenido.","Creá una idea de contenido para atraer, una para conectar y una para vender.","Anotá un CTA concreto para cada pieza." ]},
{id:5,title:"Oferta & conversión",desc:"Transformá atención en una acción.",copy:"La gente necesita entender qué recibe, para quién es, qué problema resuelve y cuál es el siguiente paso. Este módulo convierte una idea difusa en una oferta presentable.",exercise:["Nombrá tu oferta.","Escribí qué incluye en términos concretos.","Definí el siguiente paso que querés que haga una persona interesada." ]},
{id:6,title:"Landing & recorrido de venta",desc:"Un lugar propio para presentar y convertir.",copy:"La landing ordena la historia de tu oferta. No necesita tener veinte secciones: necesita responder las preguntas correctas y conducir a una acción clara.",exercise:["Definí tu titular principal.","Listá 3 objeciones que la página debe responder.","Elegí un único CTA principal." ]},
{id:7,title:"Sistema & lanzamiento",desc:"Checkout, seguimiento y próximos 30 días.",copy:"Una marca no termina cuando se publica una web. Cerramos el recorrido: cómo llega alguien, qué ve, cómo compra o consulta y qué vas a sostener después.",exercise:["Revisá todos tus links y llamados a la acción.","Definí tu proceso de seguimiento.","Escribí tu plan de 30 días con 3 acciones semanales." ]}
];

function sha256(text){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)).then(buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""))}
const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
const key="startBrandCampus";
const state=JSON.parse(localStorage.getItem(key)||"{}");
state.completed=state.completed||[];
state.notes=state.notes||{};
function save(){localStorage.setItem(key,JSON.stringify(state))}
function showApp(){qs("#gate").hidden=true;qs("#app").hidden=false;qs("#student-display").textContent=(state.name||"ALUMNA").toUpperCase();render();loadNotes()}
function showGate(){qs("#gate").hidden=false;qs("#app").hidden=true}
if(state.loggedIn)showApp(); else showGate();

qs("#login-form").addEventListener("submit",async e=>{
 e.preventDefault(); const name=qs("#student-name").value.trim(); const code=qs("#access-code").value;
 if(!name){qs("#login-error").textContent="Escribí tu nombre.";return}
 const h=await sha256(code);
 if(h!==ACCESS_HASH){qs("#login-error").textContent="Código incorrecto. Revisalo y volvé a intentar.";return}
 state.loggedIn=true;state.name=name;save();showApp()
});
qs("#logout").addEventListener("click",()=>{state.loggedIn=false;save();location.reload()});

function progress(){return Math.round((state.completed.length/modules.length)*100)}
function render(){
 const list=qs("#module-list");list.innerHTML="";
 modules.forEach(m=>{
  const done=state.completed.includes(m.id);
  const row=document.createElement("article");row.className="module";
  row.innerHTML='<div class="module-number">'+String(m.id).padStart(2,"0")+'</div><div><h3>'+m.title+'</h3><p>'+m.desc+'</p></div><div class="module-actions"><button class="open-module" data-id="'+m.id+'">Abrir →</button><button class="complete '+(done?"done":"")+'" data-complete="'+m.id+'" aria-label="Marcar módulo como completado">'+(done?"✓":"○")+'</button></div>';
  list.appendChild(row)
 });
 const p=progress();["#hero-progress","#side-progress"].forEach(s=>qs(s).textContent=p+"%");["#hero-bar","#side-bar"].forEach(s=>qs(s).style.width=p+"%");
 qs("#progress-message").textContent=p===100?"Programa completado. Ahora el trabajo es sostenerlo.":p>=60?"Ya hay sistema. Seguí cerrando las piezas que faltan.":p>=20?"Bien. Estás convirtiendo ideas en decisiones concretas.":"Empezá por el diagnóstico y tu punto de partida.";
 const next=modules.find(m=>!state.completed.includes(m.id))||modules[modules.length-1];
 qs("#next-number").textContent=String(next.id).padStart(2,"0");qs("#next-title").textContent=next.title;qs("#next-desc").textContent=next.desc;
 qsa(".open-module").forEach(b=>b.onclick=()=>openModule(+b.dataset.id));
 qsa(".complete").forEach(b=>b.onclick=()=>toggleComplete(+b.dataset.complete));
}
function toggleComplete(id){const i=state.completed.indexOf(id);if(i>=0)state.completed.splice(i,1);else state.completed.push(id);save();render()}
function openModule(id){
 const m=modules.find(x=>x.id===id);
 qs("#module-content").innerHTML='<span class="lesson-tag">MÓDULO '+String(m.id).padStart(2,"0")+'</span><h2 class="lesson-title">'+m.title+'</h2><p class="lesson-copy">'+m.copy+'</p><div class="video-placeholder"><div><b>CLASE '+String(m.id).padStart(2,"0")+'</b><span>Espacio listo para tu video de YouTube no listado.</span></div></div><div class="exercise"><h4>Antes de marcarlo como completado</h4><ol>'+m.exercise.map(x=>"<li>"+x+"</li>").join("")+'</ol><button class="btn '+(state.completed.includes(id)?"outline":"primary")+'" id="modal-complete">'+(state.completed.includes(id)?"Quitar completado":"Marcar como completado ✓")+'</button></div>';
 qs("#module-dialog").showModal();
 qs("#modal-complete").onclick=()=>{toggleComplete(id);qs("#module-dialog").close()}
}
qs("#close-module").onclick=()=>qs("#module-dialog").close();
qsa(".nav-btn").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
qsa("[data-go]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.go)));
function switchView(v){
 qsa(".view").forEach(x=>x.classList.toggle("active",x.dataset.viewPanel===v));
 qsa(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
 qs(".sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})
}
qs("#mobile-menu").onclick=()=>qs(".sidebar").classList.toggle("open");
function loadNotes(){qsa("[data-note]").forEach(t=>{t.value=state.notes[t.dataset.note]||"";t.addEventListener("input",()=>{state.notes[t.dataset.note]=t.value;save()})})}

let currentSession="";
qsa(".booking-btn").forEach(b=>b.onclick=()=>{currentSession=b.dataset.session;qs("#booking-title").textContent=currentSession;qs("#booking-dialog").showModal()});
qs("#close-booking").onclick=()=>qs("#booking-dialog").close();
qs("#booking-form").addEventListener("submit",e=>{
 e.preventDefault();
 const date=qs("#booking-date").value,slot=qs("#booking-slot").value,notes=qs("#booking-notes").value.trim();
 const subject=encodeURIComponent("START BRAND · Pedido de "+currentSession);
 const body=encodeURIComponent("Hola! Soy "+(state.name||"alumna/o")+".\n\nQuiero coordinar: "+currentSession+"\nFecha preferida: "+date+"\nFranja: "+slot+"\n\nQuiero revisar:\n"+(notes||"-")+"\n\nCuando confirmemos el horario, envíenme por favor la invitación de Google Calendar con el link de Meet.\n");
 location.href="mailto:"+EMAIL+"?subject="+subject+"&body="+body
});

const resources={
brief:{title:"Brief de marca",subtitle:"Las preguntas esenciales antes de diseñar o comunicar.",items:[
"¿Qué vendés u ofrecés?","¿Qué problema concreto resolvés?","¿A quién querés atraer?","¿Qué cambia para esa persona después de trabajar o comprar con vos?","¿Qué te diferencia de otras opciones?","¿Qué tres palabras deberían describir tu marca?","¿Qué tres cosas tu marca nunca debería transmitir?","¿Cuál es la acción principal que querés que haga alguien al conocerte?","¿Qué objeciones aparecen antes de comprar?","¿Cuál es tu objetivo de los próximos 90 días?"
]},
content:{title:"Matriz de contenido",subtitle:"Organizá contenido con una función concreta.",items:[
"Pilar 1 · objetivo / idea / formato / gancho / CTA","Pilar 2 · objetivo / idea / formato / gancho / CTA","Pilar 3 · objetivo / idea / formato / gancho / CTA","Lunes · pieza / objetivo / CTA","Miércoles · pieza / objetivo / CTA","Viernes · pieza / objetivo / CTA","Regla START · cada publicación tiene una función: atraer, conectar, demostrar o convertir."
]},
launch:{title:"Checklist de lanzamiento",subtitle:"Revisá el sistema completo antes de salir.",checks:[
"La propuesta se entiende en menos de 10 segundos.","El titular habla del resultado o necesidad principal.","El CTA principal es claro y se repite.","Links de compra o contacto probados.","Precio, modalidad y alcance claros.","Página revisada en celular.","Perfil de redes actualizado.","3 piezas de contenido listas.","Mensaje de lanzamiento preparado.","Respuestas para objeciones frecuentes.","Seguimiento definido.","Próximas 4 semanas de acciones anotadas."
]}}
function printResource(type){
 const r=resources[type]; if(!r)return;
 const rows=(r.items||r.checks).map((x,i)=>'<div class="row"><span>'+(r.checks?'□':String(i+1).padStart(2,"0"))+'</span><div><b>'+x+'</b><div class="lines"></div></div></div>').join("");
 const w=window.open("","_blank","noopener,noreferrer"); if(!w)return;
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>START BRAND · '+r.title+'</title><style>@page{margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#111}.top{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px}.brand{font-weight:800;font-size:22px}.tag{font-size:10px;letter-spacing:.15em}.hero{padding:42px 0 26px}.hero small{color:#ff4f91;font-weight:700;letter-spacing:.12em}.hero h1{font-family:Georgia,serif;font-size:46px;margin:12px 0 8px}.hero p{color:#666;max-width:560px}.row{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:18px 0;border-top:1px solid #ddd}.row>span{color:#ff4f91;font-weight:700}.row b{font-size:14px}.lines{height:54px;margin-top:10px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 17px,#ddd 18px)}.foot{margin-top:30px;border-top:2px solid #111;padding-top:10px;font-size:10px;display:flex;justify-content:space-between}@media print{button{display:none}}</style></head><body><div class="top"><div class="brand">START BRAND ↗</div><div class="tag">WORKBOOK · CAMPUS</div></div><div class="hero"><small>HACER &gt; ACUMULAR</small><h1>'+r.title+'</h1><p>'+r.subtitle+'</p></div>'+rows+'<div class="foot"><span>START BRAND · 2026</span><span>Guardá esta hoja como PDF o imprimila.</span></div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>');
 w.document.close()
}
qsa("[data-download]").forEach(b=>b.onclick=()=>printResource(b.dataset.download));
