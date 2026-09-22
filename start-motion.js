'use strict';
(()=>{
const hero=document.querySelector('#inicio'),campaign=document.querySelector('#universo'),runway=document.querySelector('#proyectos'),track=document.querySelector('#runway-track'),windowEl=document.querySelector('.runway-window'),voices=document.querySelector('#conversacion');
const vision=document.querySelector('#vision'),film=document.querySelector('#campaign-video'),motionButton=document.querySelector('#motion-toggle');
const mobileFilm=matchMedia('(max-width:760px)');
function chooseFilm(){const name=mobileFilm.matches?'start-film-mobile':'start-film';film.src='assets/'+name+'.mp4';film.poster='assets/'+name+'.jpg';film.load()}
chooseFilm();mobileFilm.addEventListener('change',chooseFilm);
const targets=new Map();let queued=false,activeCard=0;
function progress(el){const r=el.getBoundingClientRect();return clamp(-r.top/Math.max(1,el.offsetHeight-innerHeight))}
function seek(video){if(lowMotion||document.hidden||video.readyState<2||video.seeking||!video.paused)return;const t=targets.get(video);if(Number.isFinite(t)&&Math.abs(video.currentTime-t)>.06){try{video.currentTime=t}catch{}}}
[vision,film].forEach(v=>{v.addEventListener('seeked',()=>seek(v));v.addEventListener('loadeddata',schedule)});
function update(){queued=false;const hp=progress(hero),cp=progress(campaign),rp=progress(runway);hero.style.setProperty('--hp',lowMotion?0:hp);hero.style.setProperty('--intro-opacity',lowMotion?1:clamp(1-hp*2.5));hero.style.setProperty('--reveal-opacity',lowMotion?0:clamp((hp-.38)*3));campaign.style.setProperty('--cp',lowMotion?0:cp);document.querySelector('.start-intro>div:first-child').inert=!lowMotion&&hp>.45;document.querySelector('#header').classList.toggle('scrolled',scrollY>30);document.querySelector('#progress').style.transform='scaleX('+scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+')';
 for(const [v,p,el] of [[film,cp,campaign]]){const rect=el.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){targets.set(v,Number.isFinite(v.duration)?p*Math.max(0,v.duration-.08):0);seek(v)}}
 if(!lowMotion){const distance=Math.max(0,track.scrollWidth-windowEl.clientWidth+windowEl.clientWidth*.1);track.style.transform='translate3d('+(-rp*distance)+'px,0,0)';activeCard=Math.round(rp*3)}
 {const vp=progress(voices);voices.style.setProperty('--vp',lowMotion?0:vp);let closest=0,best=Infinity;[...slides.children].forEach((card,i)=>{const distance=Math.abs(card.getBoundingClientRect().top-160);if(distance<best){best=distance;closest=i}});showVoice(closest);}
 document.querySelector('#runway-count').textContent='0'+(activeCard+1)+' / 04';
 document.querySelector('#runway-prev').disabled=activeCard===0;document.querySelector('#runway-next').disabled=activeCard===3;
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(update)}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
function changeMotion(){document.body.classList.toggle('motion-reduced',lowMotion);motionButton.setAttribute('aria-pressed',String(lowMotion));motionButton.textContent=lowMotion?'Activar movimiento':'Reducir movimiento';if(lowMotion){track.style.transform='none';[vision,film].forEach(v=>v.pause())}update()}
motionButton.addEventListener('click',()=>{lowMotion=!lowMotion;changeMotion()});motionPreference.addEventListener('change',e=>{lowMotion=e.matches;changeMotion()});
function goCard(index){index=clamp(index,0,3);activeCard=index;if(lowMotion){windowEl.scrollTo({left:index*(track.children[0].offsetWidth+parseFloat(getComputedStyle(track).gap)),behavior:'auto'});update()}else{const top=scrollY+runway.getBoundingClientRect().top;scrollTo({top:top+(runway.offsetHeight-innerHeight)*index/3,behavior:'smooth'})}}
document.querySelector('#runway-prev').addEventListener('click',()=>goCard(activeCard-1));document.querySelector('#runway-next').addEventListener('click',()=>goCard(activeCard+1));
track.addEventListener('focusin',e=>{if(!e.target.matches(':focus-visible'))return;const card=e.target.closest('.runway-card');if(card){const i=[...track.children].indexOf(card);if(i!==activeCard)goCard(i)}});
windowEl.addEventListener('scroll',()=>{if(lowMotion){activeCard=clamp(Math.round(windowEl.scrollLeft/(track.children[0].offsetWidth+parseFloat(getComputedStyle(track).gap))),0,3);update()}},{passive:true});
const comments=[
'Claro! Te venden la formula para hacer plata pero ellos no hacen plata con la formula que venden, la hacen con la gente que quiere la fórmula. Como los couch de empresas sin empresas 🤷🏻‍♀️',
'Es verdad!!!! Tengan cuidado, el mkt esta lleno, pero LLENO de estafadores que te prometen vender miles de dólares por hacer poco. Está lleno de falsas promesas y sin ética.',
'Me carga que jueguen con la vulnerabilidad de las personas. Y me pasa lo mismo con l@s que venden asesorías relacionadas con la maternidad. Cuando una está de lo más vulnerable entre embarazo y postparto el algoritmo te llena de estas “ofertas” de cursos que “son ultra necesarios para maternar”. Yo sé que hay varias que si son de gran ayuda y hacer un servicio personalizado y el acompañamiento necesario, pero me pasó que la mayoría vendía humo y te pasaban SU receta, y no la que a TI te servía o se acomodara a tu estilo de vida. En mi caso fue mucha plata perdida, más frustraciones y desgaste emocional.',
'Algo parecido pasa con las estafas piramidales (herbalife, omnilife, farmasi, etc) te ofrecen villas y castillas y que vas a facturar no se cuanta cantidad de plata en no se cuantos meses y que te irá de maravilla, etc etc etc, personas que (aunque tengan hijos) su vida es muy distinta a la de los demás. Yo caí una vez y hasta dos veces y ya no caí más 🤭'
];
const slides=document.querySelector('#voice-slides');
const crops=[[932,220],[942,194],[708,443],[820,293]];
comments.forEach((text,i)=>{const slide=document.createElement('blockquote');slide.className='voice-slide';slide.id='comentario-'+(i+1);const [y,h]=crops[i];slide.innerHTML='<div class="instagram-crop" style="aspect-ratio:673/'+h+'"><img src="assets/comment-'+(i+1)+'.png" alt="'+text.replaceAll('"','&quot;')+'" style="top:'+(-y/h*100)+'%"><span class="avatar-blur" aria-hidden="true" style="top:'+(18/h*100)+'%;height:'+(57/h*100)+'%"></span><span class="username-mask" aria-hidden="true" style="top:'+(10/h*100)+'%;height:'+(32/h*100)+'%"></span></div>';slides.append(slide)});

let voice=0;
function showVoice(n){voice=clamp(n,0,comments.length-1);[...slides.children].forEach((s,i)=>s.classList.toggle('is-current',i===voice));document.querySelector('#voice-count').textContent='0'+(voice+1)+' / 04';document.querySelector('#voice-prev').disabled=voice===0;document.querySelector('#voice-next').disabled=voice===comments.length-1;}
function goVoice(n){n=clamp(n,0,comments.length-1);const card=slides.children[n];scrollTo({top:scrollY+card.getBoundingClientRect().top-110,behavior:lowMotion?'auto':'smooth'});showVoice(n)}
document.querySelector('#voice-prev').addEventListener('click',()=>goVoice(voice-1));document.querySelector('#voice-next').addEventListener('click',()=>goVoice(voice+1));
const slogans=['EL SECRETO PARA VENDER','OTRO CURSO MÁS','LA FÓRMULA INFALIBLE','VENDÉ ESTE MISMO CURSO','DINERO SIN ESFUERZO','LA MASTERCLASS DEFINITIVA','EMPEZÁ DE CERO, OTRA VEZ','SOLO TENÉS QUE CREER'];
document.querySelector('.promise-wall').innerHTML=[0,1,2,3].map((col)=>'<div class="promise-column">'+Array.from({length:8},(_,i)=>'<div class="promise-video"><span>▶</span><strong>'+slogans[(i+col)%slogans.length]+'</strong><div>VIDEO '+String(col*8+i+1).padStart(2,'0')+' / EL CURSO DEL CURSO</div><i></i></div>').join('')+'</div>').join('');
document.querySelector('#copy-email').addEventListener('click',async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText('experienciawebdigital@gmail.com');status.textContent='Email copiado.'}catch{status.textContent='Seleccioná el email de arriba para copiarlo.'}});
changeMotion();
})();
