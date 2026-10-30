/* Worker: o motor de simulação (JS) e o Pyodide (Python) rodam no MESMO thread, então se chamam de
   forma síncrona: sem mensagens por tick, determinístico, e a página só desenha os quadros recebidos.
   Dois modos:
     corrida : este arquivo conduz o tempo (60 Hz × velocidade) e chama o agente Python a cada tick
     script  : o script Python conduz (PistaEnv.reset/step, como no treino); env.render() manda quadros
   Página -> worker: {t:'corrida'|'script', base, codigo, pacotes, carros?, n?} {t:'pausa',v} {t:'vel',v} {t:'reiniciar'}
   Worker -> página: {t:'status'|'pronto'|'log'|'erro'|'fim'|'quadro', ...}      (ver src/web/README.md) */
const PYODIDE='https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const FONTES=['constantes','pista','carro','agentes/reativo','agentes/registro','simulacao','ambiente'];  // = ORDEM de headless/carregar.js
let py=null,amb=null,sim=null,timer=null,vel=1,pausa=false,acc=0,ult=0,pyPasso=null,cfg=null;
const post=(t,o={})=>postMessage({t,...o});

function motor(base){
  if(typeof Simulacao==='undefined')importScripts(...FONTES.map(f=>base+'src/'+f+'.js'));
  amb=amb||new Ambiente();
  globalThis.engine_cmd=s=>{const m=JSON.parse(s);            // ponte chamada pelo Python (python/backend.py)
    if(m.cmd==='render'){post('quadro',snapshotDe(amb.sim));return'{}';}
    return JSON.stringify(amb.cmd(m));};
}
async function carregarPy(base,pacotes=[]){
  if(!py){
    post('status',{s:'Carregando Python… (1ª vez: 10–20 s)'});
    importScripts(PYODIDE+'pyodide.js');
    py=await loadPyodide({indexURL:PYODIDE});
    py.setStdout({batched:s=>post('log',{s})});py.setStderr({batched:s=>post('log',{s})});
    await py.loadPackage('numpy');
    const man=await(await fetch(base+'python/manifest.json')).json();   // gerado por tools/gerar_manifesto.py
    for(const f of man.arquivos){
      py.FS.mkdirTree('/pa/'+(f.includes('/')?f.slice(0,f.lastIndexOf('/')):''));
      py.FS.writeFile('/pa/'+f,new Uint8Array(await(await fetch(base+'python/'+f)).arrayBuffer()));}
    py.runPython("import sys\nsys.path[:0]=['/pa']");
  }
  for(const p of pacotes){                                      // "# pacotes: scipy, ..." na 1ª linha do script
    await py.loadPackage(p);
    if(!(p in py.loadedPackages)){await py.loadPackage('micropip');await py.pyimport('micropip').install(p);}}
}
async function corrida(m){
  cfg=m;clearInterval(timer);
  await carregarPy(m.base,m.pacotes);motor(m.base);
  sim=new Simulacao(m.n||6);                                    // carros não escolhidos seguem o agente JS (registro.js)
  const R=py.pyimport('agente_runner');
  R.iniciar(m.codigo,JSON.stringify(m.carros),JSON.stringify({DT,RANGE,SENSORES,CARRO}));
  pyPasso=R.passo;
  for(const i of m.carros){const c=sim.carros[i];
    c.agente={decidir:o=>JSON.parse(pyPasso(i,JSON.stringify(o)))||c.cmd};}   // null = mantém o último comando
  acc=0;ult=performance.now();post('pronto');
  timer=setInterval(laco,16);
}
function laco(){
  const t=performance.now();acc=Math.min(acc+(t-ult)/1000*vel,.5*vel);ult=t;
  try{if(!pausa){const lim=t+12;while(acc>=DT&&performance.now()<lim){sim.passo();acc-=DT;}}}   // no máx. 12 ms por quadro
  catch(err){clearInterval(timer);post('erro',{s:String(err.message||err)});return;}
  post('quadro',snapshotDe(sim));
}
async function script(m){
  cfg=null;clearInterval(timer);
  await carregarPy(m.base,m.pacotes);motor(m.base);
  post('pronto');await py.runPythonAsync(m.codigo);post('fim');
}
onmessage=async e=>{const m=e.data;
  try{
    if(m.t==='corrida')await corrida(m);
    else if(m.t==='script')await script(m);
    else if(m.t==='pausa')pausa=m.v;
    else if(m.t==='vel')vel=m.v;
    else if(m.t==='reiniciar'&&cfg)await corrida(cfg);
  }catch(err){post('erro',{s:String(err.message||err)});}
};
