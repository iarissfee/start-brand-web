const BOOTSTRAP_HASH = "f434c141ec71e788baa6b5d3a812f2abc21280a9ea4bcadc556fc61aa96f26d7";
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 210000;
const MAX_BODY = 24000;
const COURSE_ID = "start-brand-course";
let schemaPromise;

const MODULE_SEED = [
  [1,"Punto de partida","Objetivo, diagnóstico y foco.","Antes de pensar en colores, posteos o anuncios, necesitás saber qué estás construyendo y para qué.",JSON.stringify(["Definí un objetivo de 90 días.","Escribí qué está frenando hoy tu marca.","Elegí una sola prioridad para empezar."])],
  [2,"Posicionamiento & propuesta","Que se entienda por qué elegirte.","Una propuesta fuerte define a quién ayuda, qué transformación ofrece y qué hace diferente a tu forma de resolverlo.",JSON.stringify(["Describí a tu cliente por situación y necesidad.","Completá: Ayudo a ___ a lograr ___ sin ___.","Listá 3 razones reales por las que alguien podría elegirte."])],
  [3,"Identidad & mensaje","Una marca reconocible y coherente.","Tu identidad combina concepto, tono, estética y repetición. Acá empezás a construir un lenguaje reconocible.",JSON.stringify(["Elegí 3 palabras para describir tu marca.","Definí 3 cosas que tu marca nunca haría.","Escribí una frase que resuma tu idea central."])],
  [4,"Contenido que mueve","Redes con dirección, no por obligación.","Cada pieza de contenido tiene una función. Separamos autoridad, conexión, deseo y conversión.",JSON.stringify(["Definí 3 pilares de contenido.","Creá una idea para atraer, una para conectar y una para vender.","Anotá un CTA concreto para cada pieza."])],
  [5,"Oferta & conversión","Transformá atención en una acción.","La gente necesita entender qué recibe, para quién es, qué problema resuelve y cuál es el siguiente paso.",JSON.stringify(["Nombrá tu oferta.","Escribí qué incluye en términos concretos.","Definí el siguiente paso para una persona interesada."])],
  [6,"Landing & recorrido de venta","Un lugar propio para presentar y convertir.","La landing ordena la historia de tu oferta y conduce a una acción clara.",JSON.stringify(["Definí tu titular principal.","Listá 3 objeciones que la página debe responder.","Elegí un único CTA principal."])],
  [7,"Sistema & lanzamiento","Checkout, seguimiento y próximos 30 días.","Cerramos el recorrido: cómo llega alguien, qué ve, cómo compra o consulta y qué vas a sostener después.",JSON.stringify(["Revisá todos tus links y llamados a la acción.","Definí tu proceso de seguimiento.","Escribí tu plan de 30 días con 3 acciones semanales."])]
];

function now(){ return Date.now(); }
function enc(s){ return new TextEncoder().encode(s); }
function bytesToB64url(bytes){
  let binary="";
  for(const b of bytes) binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64urlToBytes(s){
  s=s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4) s+="=";
  const binary=atob(s);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function randomToken(size=32){
  const b=new Uint8Array(size);
  crypto.getRandomValues(b);
  return bytesToB64url(b);
}
async function sha256Hex(value){
  const out=new Uint8Array(await crypto.subtle.digest("SHA-256",enc(value)));
  return Array.from(out,b=>b.toString(16).padStart(2,"0")).join("");
}
async function hashPassword(password,salt){
  const key=await crypto.subtle.importKey("raw",enc(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:b64urlToBytes(salt),iterations:PBKDF2_ITERATIONS},key,256);
  return bytesToB64url(new Uint8Array(bits));
}
function timingSafe(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function emailOk(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254; }
function passwordOk(p){
  return typeof p==="string" && p.length>=12 && p.length<=128 &&
    /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p);
}
function parseCookies(request){
  const out={};
  const raw=request.headers.get("cookie")||"";
  for(const piece of raw.split(";")){
    const i=piece.indexOf("=");
    if(i>0) out[piece.slice(0,i).trim()]=decodeURIComponent(piece.slice(i+1).trim());
  }
  return out;
}
function sessionCookie(token,maxAge=SESSION_DAYS*86400){
  return "sb_session="+encodeURIComponent(token)+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age="+maxAge;
}
function json(data,status=200,extraHeaders={}){
  const h=new Headers({"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
  for(const [k,v] of Object.entries(extraHeaders)) h.set(k,v);
  return new Response(JSON.stringify(data),{status,headers:h});
}
function redirect(location,status=302,headers={}){
  const h=new Headers({location,"cache-control":"no-store"});
  for(const [k,v] of Object.entries(headers)) h.set(k,v);
  return new Response(null,{status,headers:h});
}
function isCrossSite(request){
  const url=new URL(request.url);
  const origin=request.headers.get("origin");
  if(origin && origin!==url.origin) return true;
  const site=request.headers.get("sec-fetch-site");
  return site==="cross-site";
}
async function readJson(request){
  const len=Number(request.headers.get("content-length")||0);
  if(len>MAX_BODY) throw new Error("BODY_TOO_LARGE");
  const type=request.headers.get("content-type")||"";
  if(!type.includes("application/json")) throw new Error("BAD_CONTENT_TYPE");
  return request.json();
}
function securityHeaders(response,campus=false){
  const h=new Headers(response.headers);
  h.set("X-Content-Type-Options","nosniff");
  h.set("Referrer-Policy","strict-origin-when-cross-origin");
  h.set("X-Frame-Options","DENY");
  h.set("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  h.set("Strict-Transport-Security","max-age=31536000");
  if(campus){
    h.set("Cache-Control","private, no-store, max-age=0");
    h.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
async function ensureSchema(env){
  if(schemaPromise) return schemaPromise;
  schemaPromise=(async()=>{
    if(!env.DB) throw new Error("DB_BINDING_MISSING");
    const stmts=[
      env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS progress (user_id TEXT NOT NULL, module_id INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,module_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS notes (user_id TEXT NOT NULL, note_key TEXT NOT NULL, value TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,note_key), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS login_attempts (attempt_key TEXT NOT NULL, attempted_at INTEGER NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_attempt_key_time ON login_attempts(attempt_key,attempted_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS invites (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL, created_by TEXT NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL, created_by TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS mentor_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_name TEXT NOT NULL, preferred_date TEXT NOT NULL, slot TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', meet_url TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_mentor_user ON mentor_requests(user_id,created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_mentor_status ON mentor_requests(status,created_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS modules (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, copy TEXT NOT NULL, exercises TEXT NOT NULL, video_url TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT NOT NULL, price_cents INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'ARS', active INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, product_id TEXT NOT NULL, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'created', claim_token_hash TEXT NOT NULL, preference_id TEXT NOT NULL DEFAULT '', payment_id TEXT NOT NULL DEFAULT '', mp_status TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY(product_id) REFERENCES products(id))"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_purchase_email ON purchases(email,created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_purchase_payment ON purchases(payment_id)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS enrollments (user_id TEXT NOT NULL, product_id TEXT NOT NULL, source TEXT NOT NULL, purchase_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, PRIMARY KEY(user_id,product_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)")
    ];
    await env.DB.batch(stmts);
    const t=now();
    await env.DB.batch(MODULE_SEED.map(m=>env.DB.prepare("INSERT OR IGNORE INTO modules(id,title,description,copy,exercises,video_url,updated_at) VALUES(?,?,?,?,?,'',?)").bind(m[0],m[1],m[2],m[3],m[4],t)));
    await env.DB.prepare("INSERT OR IGNORE INTO products(id,title,price_cents,currency,active,updated_at) VALUES(?,?,0,'ARS',0,?)").bind(COURSE_ID,"START BRAND · Programa",t).run();
  })().catch(e=>{ schemaPromise=null; throw e; });
  return schemaPromise;
}
async function getSession(request,env){
  const token=parseCookies(request).sb_session;
  if(!token) return null;
  const idHash=await sha256Hex(token);
  const row=await env.DB.prepare("SELECT s.id_hash,s.user_id,s.csrf_token,s.expires_at,s.last_seen,u.email,u.name,u.role,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id_hash=? AND s.expires_at>? AND u.status='active'").bind(idHash,now()).first();
  if(!row) return null;
  if(now()-Number(row.last_seen)>3600000){
    env.DB.prepare("UPDATE sessions SET last_seen=? WHERE id_hash=?").bind(now(),idHash).run().catch(()=>{});
  }
  row.raw_token=token;
  return row;
}
async function createSession(env,userId){
  const raw=randomToken(32);
  const idHash=await sha256Hex(raw);
  const csrf=randomToken(24);
  const t=now(), exp=t+SESSION_DAYS*86400000;
  await env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND expires_at<=?").bind(userId,t).run();
  await env.DB.prepare("INSERT INTO sessions(id_hash,user_id,csrf_token,expires_at,created_at,last_seen) VALUES(?,?,?,?,?,?)").bind(idHash,userId,csrf,exp,t,t).run();
  return {raw,csrf,expires_at:exp,id_hash:idHash};
}
async function requireSession(request,env,role){
  const s=await getSession(request,env);
  if(!s) return {response:json({error:"AUTH_REQUIRED"},401)};
  if(role && s.role!==role) return {response:json({error:"FORBIDDEN"},403)};
  return {session:s};
}
function csrfValid(request,session){
  const token=request.headers.get("x-csrf-token")||"";
  return timingSafe(token,session.csrf_token);
}
async function loginRateLimited(env,ip,email){
  const cutoff=now()-15*60*1000;
  const pair=await sha256Hex("pair|"+ip+"|"+email);
  const ipKey=await sha256Hex("ip|"+ip);
  const a=await env.DB.prepare("SELECT COUNT(*) c FROM login_attempts WHERE attempt_key=? AND attempted_at>?").bind(pair,cutoff).first();
  const b=await env.DB.prepare("SELECT COUNT(*) c FROM login_attempts WHERE attempt_key=? AND attempted_at>?").bind(ipKey,cutoff).first();
  return {limited:Number(a?.c||0)>=5 || Number(b?.c||0)>=20,pair,ipKey,cutoff};
}
async function recordLoginFailure(env,keys){
  const t=now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO login_attempts(attempt_key,attempted_at) VALUES(?,?)").bind(keys.pair,t),
    env.DB.prepare("INSERT INTO login_attempts(attempt_key,attempted_at) VALUES(?,?)").bind(keys.ipKey,t),
    env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at<?").bind(t-24*60*60*1000)
  ]);
}
async function verifyPassword(password,user){
  const got=await hashPassword(password,user.password_salt);
  return timingSafe(got,user.password_hash);
}
async function newPasswordRecord(password){
  const salt=randomToken(16);
  return {salt,hash:await hashPassword(password,salt)};
}
async function hmacSha256Hex(secret,message){
  const key=await crypto.subtle.importKey("raw",enc(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,enc(message)));
  return Array.from(sig,b=>b.toString(16).padStart(2,"0")).join("");
}
function purchaseCookie(token,maxAge=86400){
  return "sb_purchase="+encodeURIComponent(token)+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age="+maxAge;
}
async function hasCourseAccess(env,s){
  if(s.role==="admin") return true;
  const r=await env.DB.prepare("SELECT 1 ok FROM enrollments WHERE user_id=? AND product_id=? AND status='active' LIMIT 1").bind(s.user_id,COURSE_ID).first();
  return !!r;
}
async function verifyMpWebhook(request,url,secret){
  if(!secret) return false;
  const sig=request.headers.get("x-signature")||"", reqId=request.headers.get("x-request-id")||"";
  const dataId=(url.searchParams.get("data.id")||url.searchParams.get("data_id")||"").toLowerCase();
  let ts="",v1="";
  for(const p of sig.split(",")){
    const i=p.indexOf("="); if(i<0) continue;
    const k=p.slice(0,i).trim(),v=p.slice(i+1).trim();
    if(k==="ts") ts=v; if(k==="v1") v1=v;
  }
  if(!ts||!v1) return false;
  let manifest="";
  if(dataId) manifest+="id:"+dataId+";";
  if(reqId) manifest+="request-id:"+reqId+";";
  manifest+="ts:"+ts+";";
  return timingSafe(await hmacSha256Hex(secret,manifest),v1);
}
async function mpGetPayment(env,paymentId){
  if(!env.MP_ACCESS_TOKEN) throw new Error("MP_NOT_CONFIGURED");
  const r=await fetch("https://api.mercadopago.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{Authorization:"Bearer "+env.MP_ACCESS_TOKEN}});
  if(!r.ok) throw new Error("MP_LOOKUP_FAILED");
  return r.json();
}
async function syncPayment(env,paymentId){
  const p=await mpGetPayment(env,paymentId);
  const purchaseId=cleanText(p.external_reference,100);
  if(!purchaseId) throw new Error("NO_REFERENCE");
  const purchase=await env.DB.prepare("SELECT * FROM purchases WHERE id=?").bind(purchaseId).first();
  if(!purchase) throw new Error("PURCHASE_NOT_FOUND");
  const cents=Math.round(Number(p.transaction_amount||0)*100);
  if(cents!==Number(purchase.amount_cents)||String(p.currency_id||"")!==String(purchase.currency)) throw new Error("AMOUNT_MISMATCH");
  const mp=String(p.status||"");
  const local=mp==="approved"?"approved":["rejected","cancelled","refunded","charged_back"].includes(mp)?"failed":"pending";
  await env.DB.prepare("UPDATE purchases SET status=?,payment_id=?,mp_status=?,updated_at=? WHERE id=?").bind(local,String(p.id||paymentId),mp,now(),purchaseId).run();
  return {purchaseId,status:local,mpStatus:mp};
}
async function purchaseFromCookie(request,env,purchaseId){
  const raw=parseCookies(request).sb_purchase;
  if(!raw||!purchaseId) return null;
  return env.DB.prepare("SELECT * FROM purchases WHERE id=? AND claim_token_hash=?").bind(purchaseId,await sha256Hex(raw)).first();
}
function cleanText(v,max=500){
  return typeof v==="string"?v.trim().slice(0,max):"";
}
function validHttps(v){
  try{ const u=new URL(v); return u.protocol==="https:"; }catch(_){ return false; }
}
async function serveAsset(request,env,path,campus=true){
  const u=new URL(request.url);
  u.pathname=path;
  const resp=await env.ASSETS.fetch(new Request(u.toString(),request));
  return securityHeaders(resp,campus);
}

async function handleApi(request,env){
  await ensureSchema(env);
  const url=new URL(request.url);
  const path=url.pathname;

  if(path==="/api/health") return json({ok:true,db:true,service:"start-brand-campus"});

  if(path==="/api/payments/mercadopago/webhook" && request.method==="POST"){
    if(!await verifyMpWebhook(request,url,env.MP_WEBHOOK_SECRET)) return json({error:"INVALID_SIGNATURE"},401);
    let body={}; try{ body=await request.json(); }catch(_){}
    const paymentId=String(url.searchParams.get("data.id")||url.searchParams.get("data_id")||body?.data?.id||"");
    if(paymentId){ try{ await syncPayment(env,paymentId); }catch(_){} }
    return json({ok:true});
  }

  if(request.method!=="GET" && isCrossSite(request)) return json({error:"CROSS_SITE_BLOCKED"},403);

  if(path==="/api/product" && request.method==="GET"){
    const product=await env.DB.prepare("SELECT id,title,price_cents,currency,active FROM products WHERE id=?").bind(COURSE_ID).first();
    return json({product});
  }

  if(path==="/api/checkout" && request.method==="POST"){
    if(!env.MP_ACCESS_TOKEN) return json({error:"PAYMENTS_NOT_CONFIGURED"},503);
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const email=cleanText(body.email,254).toLowerCase(), name=cleanText(body.name,100);
    if(!emailOk(email)||!name) return json({error:"INVALID_DATA"},400);
    const product=await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(COURSE_ID).first();
    if(!product||!Number(product.active)||Number(product.price_cents)<=0) return json({error:"PRODUCT_NOT_AVAILABLE"},409);
    const id=crypto.randomUUID(), claimRaw=randomToken(32), claimHash=await sha256Hex(claimRaw), t=now();
    await env.DB.prepare("INSERT INTO purchases(id,email,name,product_id,amount_cents,currency,status,claim_token_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,'created',?,?,?)").bind(id,email,name,product.id,Number(product.price_cents),product.currency,claimHash,t,t).run();
    const origin=url.origin;
    const preference={
      items:[{id:product.id,title:product.title,quantity:1,currency_id:product.currency,unit_price:Number(product.price_cents)/100}],
      payer:{email},
      external_reference:id,
      back_urls:{
        success:origin+"/campus/payment.html?purchase="+encodeURIComponent(id),
        pending:origin+"/campus/payment.html?purchase="+encodeURIComponent(id),
        failure:origin+"/campus/payment.html?purchase="+encodeURIComponent(id)
      },
      auto_return:"approved",
      notification_url:origin+"/api/payments/mercadopago/webhook",
      metadata:{purchase_id:id}
    };
    const mp=await fetch("https://api.mercadopago.com/checkout/preferences",{
      method:"POST",
      headers:{Authorization:"Bearer "+env.MP_ACCESS_TOKEN,"Content-Type":"application/json","X-Idempotency-Key":id},
      body:JSON.stringify(preference)
    });
    if(!mp.ok){
      await env.DB.prepare("UPDATE purchases SET status='checkout_error',updated_at=? WHERE id=?").bind(now(),id).run();
      return json({error:"CHECKOUT_CREATE_FAILED"},502);
    }
    const pref=await mp.json();
    await env.DB.prepare("UPDATE purchases SET preference_id=?,status='pending',updated_at=? WHERE id=?").bind(String(pref.id||""),now(),id).run();
    return json({ok:true,checkout_url:pref.init_point,purchase_id:id},200,{"set-cookie":purchaseCookie(claimRaw)});
  }

  if(path==="/api/purchase-status" && request.method==="GET"){
    const purchaseId=cleanText(url.searchParams.get("purchase"),100);
    const purchase=await purchaseFromCookie(request,env,purchaseId);
    if(!purchase) return json({error:"PURCHASE_NOT_FOUND"},404);
    return json({purchase:{id:purchase.id,email:purchase.email,name:purchase.name,status:purchase.status,mp_status:purchase.mp_status}});
  }

  if(path==="/api/purchase-sync" && request.method==="POST"){
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const purchaseId=cleanText(body.purchase_id,100), paymentId=cleanText(body.payment_id,100);
    const purchase=await purchaseFromCookie(request,env,purchaseId);
    if(!purchase) return json({error:"PURCHASE_NOT_FOUND"},404);
    if(paymentId){ try{ await syncPayment(env,paymentId); }catch(_){} }
    const fresh=await env.DB.prepare("SELECT id,email,name,status,mp_status FROM purchases WHERE id=?").bind(purchaseId).first();
    return json({purchase:fresh});
  }

  if(path==="/api/claim-purchase" && request.method==="POST"){
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const purchaseId=cleanText(body.purchase_id,100), password=body.password;
    if(!passwordOk(password)) return json({error:"WEAK_PASSWORD","message":"Usá 12+ caracteres, mayúscula, minúscula y número."},400);
    const purchase=await purchaseFromCookie(request,env,purchaseId);
    if(!purchase||purchase.status!=="approved") return json({error:"PAYMENT_NOT_APPROVED"},403);
    const existing=await env.DB.prepare("SELECT * FROM users WHERE email=? LIMIT 1").bind(purchase.email).first();
    if(existing){
      await env.DB.prepare("INSERT INTO enrollments(user_id,product_id,source,purchase_id,status,created_at) VALUES(?,?,'payment',?,'active',?) ON CONFLICT(user_id,product_id) DO UPDATE SET status='active',purchase_id=excluded.purchase_id").bind(existing.id,purchase.product_id,purchase.id,now()).run();
      return json({error:"ACCOUNT_EXISTS_LOGIN","message":"Ese email ya tiene cuenta. Iniciá sesión para entrar."},409);
    }
    const pw=await newPasswordRecord(password), userId=crypto.randomUUID(), t=now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users(id,email,name,password_hash,password_salt,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'student','active',?,?)").bind(userId,purchase.email,purchase.name,pw.hash,pw.salt,t,t),
      env.DB.prepare("INSERT INTO enrollments(user_id,product_id,source,purchase_id,status,created_at) VALUES(?,?,'payment',?,'active',?)").bind(userId,purchase.product_id,purchase.id,t),
      env.DB.prepare("UPDATE purchases SET status='claimed',updated_at=? WHERE id=?").bind(t,purchase.id)
    ]);
    const s=await createSession(env,userId);
    return json({ok:true},200,{"set-cookie":sessionCookie(s.raw)});
  }

  if(path==="/api/bootstrap" && request.method==="POST"){
    const admin=await env.DB.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first();
    if(admin) return json({error:"BOOTSTRAP_CLOSED"},410);
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const token=cleanText(body.token,200), email=cleanText(body.email,254).toLowerCase(), name=cleanText(body.name,100), password=body.password;
    if(!timingSafe(await sha256Hex(token),BOOTSTRAP_HASH)) return json({error:"INVALID_BOOTSTRAP"},403);
    if(!emailOk(email)||!name||!passwordOk(password)) return json({error:"INVALID_DATA","message":"Usá un email válido y una contraseña de 12+ caracteres con mayúscula, minúscula y número."},400);
    const pw=await newPasswordRecord(password), id=crypto.randomUUID(), t=now();
    try{
      await env.DB.prepare("INSERT INTO users(id,email,name,password_hash,password_salt,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'admin','active',?,?)").bind(id,email,name,pw.hash,pw.salt,t,t).run();
    }catch(_){ return json({error:"ACCOUNT_EXISTS"},409); }
    const s=await createSession(env,id);
    return json({ok:true,user:{id,email,name,role:"admin"},csrf:s.csrf},200,{"set-cookie":sessionCookie(s.raw)});
  }

  if(path==="/api/login" && request.method==="POST"){
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const email=cleanText(body.email,254).toLowerCase(), password=body.password||"";
    if(!emailOk(email)||typeof password!=="string") return json({error:"INVALID_CREDENTIALS"},401);
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    const rate=await loginRateLimited(env,ip,email);
    if(rate.limited) return json({error:"TOO_MANY_ATTEMPTS","message":"Demasiados intentos. Probá de nuevo en 15 minutos."},429);
    const user=await env.DB.prepare("SELECT * FROM users WHERE email=? LIMIT 1").bind(email).first();
    const valid=user && user.status==="active" && await verifyPassword(password,user);
    if(!valid){
      await recordLoginFailure(env,rate);
      return json({error:"INVALID_CREDENTIALS"},401);
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM login_attempts WHERE attempt_key=?").bind(rate.pair),
      env.DB.prepare("DELETE FROM login_attempts WHERE attempt_key=?").bind(rate.ipKey)
    ]);
    const s=await createSession(env,user.id);
    return json({ok:true,user:{id:user.id,email:user.email,name:user.name,role:user.role},csrf:s.csrf},200,{"set-cookie":sessionCookie(s.raw)});
  }

  if(path==="/api/activate" && request.method==="POST"){
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const token=cleanText(body.token,300), password=body.password;
    if(!token||!passwordOk(password)) return json({error:"INVALID_DATA","message":"La contraseña debe tener 12+ caracteres, mayúscula, minúscula y número."},400);
    const tokenHash=await sha256Hex(token);
    const invite=await env.DB.prepare("SELECT * FROM invites WHERE token_hash=? AND used_at IS NULL AND expires_at>? LIMIT 1").bind(tokenHash,now()).first();
    if(!invite) return json({error:"INVALID_OR_EXPIRED_INVITE"},410);
    const existing=await env.DB.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(invite.email).first();
    if(existing) return json({error:"ACCOUNT_EXISTS"},409);
    const pw=await newPasswordRecord(password), id=crypto.randomUUID(), t=now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users(id,email,name,password_hash,password_salt,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'student','active',?,?)").bind(id,invite.email,invite.name||invite.email.split("@")[0],pw.hash,pw.salt,t,t),
      env.DB.prepare("INSERT INTO enrollments(user_id,product_id,source,purchase_id,status,created_at) VALUES(?,?,'invite','','active',?)").bind(id,COURSE_ID,t),
      env.DB.prepare("UPDATE invites SET used_at=? WHERE token_hash=? AND used_at IS NULL").bind(t,tokenHash)
    ]);
    const s=await createSession(env,id);
    return json({ok:true,user:{id,email:invite.email,name:invite.name,role:"student"},csrf:s.csrf},200,{"set-cookie":sessionCookie(s.raw)});
  }

  if(path==="/api/reset-password" && request.method==="POST"){
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const token=cleanText(body.token,300), password=body.password;
    if(!token||!passwordOk(password)) return json({error:"INVALID_DATA"},400);
    const tokenHash=await sha256Hex(token);
    const reset=await env.DB.prepare("SELECT * FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>? LIMIT 1").bind(tokenHash,now()).first();
    if(!reset) return json({error:"INVALID_OR_EXPIRED_RESET"},410);
    const user=await env.DB.prepare("SELECT * FROM users WHERE id=? AND status='active'").bind(reset.user_id).first();
    if(!user) return json({error:"ACCOUNT_UNAVAILABLE"},404);
    const pw=await newPasswordRecord(password), t=now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?").bind(pw.hash,pw.salt,t,user.id),
      env.DB.prepare("UPDATE password_resets SET used_at=? WHERE token_hash=?").bind(t,tokenHash),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id)
    ]);
    const s=await createSession(env,user.id);
    return json({ok:true,user:{id:user.id,email:user.email,name:user.name,role:user.role},csrf:s.csrf},200,{"set-cookie":sessionCookie(s.raw)});
  }

  const auth=await requireSession(request,env);
  if(auth.response) return auth.response;
  const s=auth.session;

  if(path==="/api/session" && request.method==="GET"){
    return json({user:{id:s.user_id,email:s.email,name:s.name,role:s.role},csrf:s.csrf,course_access:await hasCourseAccess(env,s)});
  }
  if(path==="/api/logout" && request.method==="POST"){
    if(!csrfValid(request,s)) return json({error:"CSRF"},403);
    await env.DB.prepare("DELETE FROM sessions WHERE id_hash=?").bind(s.id_hash).run();
    return json({ok:true},200,{"set-cookie":sessionCookie("",0)});
  }
  if(path==="/api/course" && request.method==="GET"){
    if(!await hasCourseAccess(env,s)) return json({error:"NO_COURSE_ACCESS"},403);
    const rows=await env.DB.prepare("SELECT id,title,description,copy,exercises,video_url FROM modules ORDER BY id").all();
    return json({modules:(rows.results||[]).map(m=>({...m,exercises:JSON.parse(m.exercises||"[]")}))});
  }
  if(path==="/api/state" && request.method==="GET"){
    if(!await hasCourseAccess(env,s)) return json({error:"NO_COURSE_ACCESS"},403);
    const [p,n,m]=await Promise.all([
      env.DB.prepare("SELECT module_id,completed FROM progress WHERE user_id=?").bind(s.user_id).all(),
      env.DB.prepare("SELECT note_key,value FROM notes WHERE user_id=?").bind(s.user_id).all(),
      env.DB.prepare("SELECT id,session_name,preferred_date,slot,notes,status,meet_url,created_at,updated_at FROM mentor_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 20").bind(s.user_id).all()
    ]);
    const notes={}; for(const row of n.results||[]) notes[row.note_key]=row.value;
    return json({completed:(p.results||[]).filter(x=>x.completed).map(x=>x.module_id),notes,mentoring:m.results||[]});
  }
  if(request.method==="POST" && !csrfValid(request,s)) return json({error:"CSRF"},403);

  if(path==="/api/progress" && request.method==="POST"){
    if(!await hasCourseAccess(env,s)) return json({error:"NO_COURSE_ACCESS"},403);
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const moduleId=Number(body.module_id), completed=body.completed?1:0;
    if(!Number.isInteger(moduleId)||moduleId<1||moduleId>100) return json({error:"INVALID_MODULE"},400);
    await env.DB.prepare("INSERT INTO progress(user_id,module_id,completed,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,module_id) DO UPDATE SET completed=excluded.completed,updated_at=excluded.updated_at").bind(s.user_id,moduleId,completed,now()).run();
    return json({ok:true});
  }
  if(path==="/api/notes" && request.method==="POST"){
    if(!await hasCourseAccess(env,s)) return json({error:"NO_COURSE_ACCESS"},403);
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const allowed=new Set(["goal","audience","offer","difference","content","actions"]);
    const key=cleanText(body.key,40), value=typeof body.value==="string"?body.value.slice(0,10000):"";
    if(!allowed.has(key)) return json({error:"INVALID_NOTE"},400);
    await env.DB.prepare("INSERT INTO notes(user_id,note_key,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,note_key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(s.user_id,key,value,now()).run();
    return json({ok:true});
  }
  if(path==="/api/mentoring" && request.method==="POST"){
    if(!await hasCourseAccess(env,s)) return json({error:"NO_COURSE_ACCESS"},403);
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    const sessionName=cleanText(body.session_name,120), date=cleanText(body.preferred_date,20), slot=cleanText(body.slot,40), notes=cleanText(body.notes,2000);
    if(!sessionName||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!slot) return json({error:"INVALID_DATA"},400);
    const id=crypto.randomUUID(),t=now();
    await env.DB.prepare("INSERT INTO mentor_requests(id,user_id,session_name,preferred_date,slot,notes,status,meet_url,created_at,updated_at) VALUES(?,?,?,?,?,?,'pending','',?,?)").bind(id,s.user_id,sessionName,date,slot,notes,t,t).run();
    return json({ok:true,id});
  }
  if(path==="/api/change-password" && request.method==="POST"){
    let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
    if(!passwordOk(body.new_password)) return json({error:"WEAK_PASSWORD","message":"Usá 12+ caracteres, mayúscula, minúscula y número."},400);
    const user=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(s.user_id).first();
    if(!await verifyPassword(body.current_password||"",user)) return json({error:"WRONG_PASSWORD"},403);
    const pw=await newPasswordRecord(body.new_password),t=now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?").bind(pw.hash,pw.salt,t,s.user_id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id_hash<>?").bind(s.user_id,s.id_hash)
    ]);
    return json({ok:true});
  }

  if(path.startsWith("/api/admin/")){
    if(s.role!=="admin") return json({error:"FORBIDDEN"},403);

    if(path==="/api/admin/dashboard" && request.method==="GET"){
      const [users,invites,mentor,mods]=await Promise.all([
        env.DB.prepare("SELECT id,email,name,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 500").all(),
        env.DB.prepare("SELECT email,name,expires_at,used_at,created_at FROM invites ORDER BY created_at DESC LIMIT 100").all(),
        env.DB.prepare("SELECT mr.id,mr.session_name,mr.preferred_date,mr.slot,mr.notes,mr.status,mr.meet_url,mr.created_at,u.email,u.name FROM mentor_requests mr JOIN users u ON u.id=mr.user_id ORDER BY mr.created_at DESC LIMIT 200").all(),
        env.DB.prepare("SELECT id,title,video_url FROM modules ORDER BY id").all()
      ]);
      return json({users:users.results||[],invites:invites.results||[],mentoring:mentor.results||[],modules:mods.results||[]});
    }
    if(path==="/api/admin/invites" && request.method==="POST"){
      let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
      const email=cleanText(body.email,254).toLowerCase(), name=cleanText(body.name,100);
      if(!emailOk(email)) return json({error:"INVALID_EMAIL"},400);
      const existing=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
      if(existing) return json({error:"ACCOUNT_EXISTS"},409);
      const raw=randomToken(32), hash=await sha256Hex(raw),t=now(),exp=t+14*86400000;
      await env.DB.prepare("INSERT INTO invites(token_hash,email,name,expires_at,used_at,created_at,created_by) VALUES(?,?,?,?,NULL,?,?)").bind(hash,email,name,exp,t,s.user_id).run();
      return json({ok:true,url:new URL("/campus/activate.html?t="+encodeURIComponent(raw),url.origin).toString(),expires_at:exp});
    }
    if(path==="/api/admin/user-status" && request.method==="POST"){
      let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
      const id=cleanText(body.user_id,100), status=body.status==="active"?"active":body.status==="suspended"?"suspended":"";
      if(!id||!status||id===s.user_id) return json({error:"INVALID_DATA"},400);
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET status=?,updated_at=? WHERE id=? AND role<>'admin'").bind(status,now(),id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND ?='suspended'").bind(id,status)
      ]);
      return json({ok:true});
    }
    if(path==="/api/admin/password-reset" && request.method==="POST"){
      let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
      const id=cleanText(body.user_id,100);
      const user=await env.DB.prepare("SELECT id FROM users WHERE id=? AND status='active'").bind(id).first();
      if(!user) return json({error:"USER_NOT_FOUND"},404);
      const raw=randomToken(32),hash=await sha256Hex(raw),t=now(),exp=t+2*86400000;
      await env.DB.prepare("INSERT INTO password_resets(token_hash,user_id,expires_at,used_at,created_at,created_by) VALUES(?,?,?,NULL,?,?)").bind(hash,id,exp,t,s.user_id).run();
      return json({ok:true,url:new URL("/campus/reset.html?t="+encodeURIComponent(raw),url.origin).toString(),expires_at:exp});
    }
    if(path==="/api/admin/mentor-update" && request.method==="POST"){
      let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
      const id=cleanText(body.id,100), status=["pending","confirmed","completed","cancelled"].includes(body.status)?body.status:"pending", meet=cleanText(body.meet_url,500);
      if(meet && !validHttps(meet)) return json({error:"INVALID_MEET_URL"},400);
      await env.DB.prepare("UPDATE mentor_requests SET status=?,meet_url=?,updated_at=? WHERE id=?").bind(status,meet,now(),id).run();
      return json({ok:true});
    }
    if(path==="/api/admin/module-video" && request.method==="POST"){
      let body; try{ body=await readJson(request); }catch(e){ return json({error:e.message},400); }
      const id=Number(body.module_id), video=cleanText(body.video_url,500);
      if(!Number.isInteger(id)||id<1||id>100||(video&&!validHttps(video))) return json({error:"INVALID_DATA"},400);
      await env.DB.prepare("UPDATE modules SET video_url=?,updated_at=? WHERE id=?").bind(video,now(),id).run();
      return json({ok:true});
    }
  }

  return json({error:"NOT_FOUND"},404);
}

async function handleCampus(request,env){
  await ensureSchema(env);
  const url=new URL(request.url);
  let path=url.pathname;
  if(path==="/campus") return redirect("/campus/");
  const publicPaths=new Set([
    "/campus/login.html","/campus/login.js","/campus/auth.css",
    "/campus/activate.html","/campus/activate.js",
    "/campus/reset.html","/campus/reset.js",
    "/campus/bootstrap.html","/campus/bootstrap.js"
  ]);
  if(path==="/campus/login") return redirect("/campus/login.html");
  if(path==="/campus/activate") return redirect("/campus/activate.html"+url.search);
  if(path==="/campus/reset") return redirect("/campus/reset.html"+url.search);
  if(path==="/campus/bootstrap") return redirect("/campus/bootstrap.html"+url.search);

  const session=await getSession(request,env);

  if(publicPaths.has(path)){
    if(path==="/campus/login.html" && session) return redirect(session.role==="admin"?"/campus/admin.html":"/campus/");
    return serveAsset(request,env,path,true);
  }

  if(!session) return redirect("/campus/login.html");

  if(path==="/campus/"||path==="/campus/index.html") return serveAsset(request,env,"/campus/index.html",true);

  const adminAsset=path==="/campus/admin.html"||path==="/campus/admin.js"||path==="/campus/admin.css";
  if(adminAsset && session.role!=="admin") return new Response("Forbidden",{status:403});

  const allowedProtected=new Set([
    "/campus/campus.js","/campus/campus.css",
    "/campus/admin.html","/campus/admin.js","/campus/admin.css"
  ]);
  if(allowedProtected.has(path)) return serveAsset(request,env,path,true);
  return new Response("Not found",{status:404});
}

export default {
  async fetch(request,env){
    try{
      const url=new URL(request.url);
      if(url.pathname.startsWith("/api/")) return securityHeaders(await handleApi(request,env),true);
      if(url.pathname==="/campus"||url.pathname.startsWith("/campus/")) return await handleCampus(request,env);
      return securityHeaders(await env.ASSETS.fetch(request),false);
    }catch(err){
      const message=err && err.message==="DB_BINDING_MISSING"?"DATABASE_NOT_CONNECTED":"SERVER_ERROR";
      return securityHeaders(json({error:message},500),true);
    }
  }
};
