const q=s=>document.querySelector(s);
const token=new URLSearchParams(location.search).get("t")||"";
q("#form").addEventListener("submit",async e=>{
  e.preventDefault();
  const b=e.submitter,s=q("#status");
  b.disabled=true;s.textContent="Creando tu acceso…";
  try{
    if(!token) throw new Error("Abriste un enlace incompleto. Usá el enlace directo que te pasé.");
    const r=await fetch("/api/bootstrap",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        token,
        name:q("#name").value,
        email:q("#email").value,
        password:q("#password").value
      })
    });
    const d=await r.json();
    if(!r.ok){
      if(d.error==="INVALID_DATA") throw new Error("La contraseña debe tener 12 caracteres o más.");
      if(d.error==="BOOTSTRAP_CLOSED") throw new Error("La cuenta admin ya fue creada. Entrá desde el login.");
      if(d.error==="PASSWORD_HASH_FAILED") throw new Error("Cloudflare rechazó el procesamiento de la contraseña. Ya lo estamos corrigiendo.");
      if(d.error==="ADMIN_CREATE_FAILED") throw new Error("No se pudo guardar la cuenta administradora.");
      if(d.error==="SESSION_CREATE_FAILED") throw new Error("La cuenta se creó, pero falló el inicio de sesión. Volvé a entrar desde el login.");
      throw new Error(d.message||d.error||"No se pudo crear la cuenta.");
    }
    location.href="/campus/admin";
  }catch(err){
    s.textContent=err.message;
    b.disabled=false;
  }
});