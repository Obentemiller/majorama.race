/* Lado da página: cria o Worker (src/web/worker.js) e entrega as mensagens aos callbacks onquadro,
   onlog, onerro, onfim, onstatus, onpronto. Encerrar = terminar o Worker (único jeito de parar um script). */
class PonteWeb{
  constructor(cb){
    this.base=new URL('./',location.href).href;
    this.w=new Worker('src/web/worker.js');
    this.w.onmessage=e=>{const m=e.data,f=cb['on'+m.t];if(f)f(m);};
    this.w.onerror=e=>{if(cb.onerro)cb.onerro({s:e.message||'erro no worker'});};
  }
  msg(o){this.w.postMessage({...o,base:this.base});}
  encerrar(){this.w.terminate();}
}
