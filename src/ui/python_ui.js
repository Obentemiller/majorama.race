/* Janela de scripts (Python): exemplos, editor, executar/parar e console.
   A simulação roda no Worker (src/web/); aqui só se espelha o estado recebido. */
const EX={                                   // chave -> [modo, arquivo]  (arquivo null = modelo embutido)
  modelo:['agente',null],reativo:['agente','python/agentes/reativo.py'],treinado:['agente','python/agentes/treinado_numpy.py'],
  script_env:['script','python/exemplos/script_env.py'],busca:['script','python/exemplos/busca_aleatoria.py']};
const MODELO=`# Agente mínimo: segue a linha central a ~20 m/s. Contrato: classe com controlar(self, carro).
from constantes import clamp

class Agente:
    def controlar(self, carro):                    # chamado 1x por tick (60 Hz)
        d, tipo, e = carro.retorno(), carro.tipo, carro.estado()   # d[i] aponta para SENSORES[i] graus
        direcao = clamp(-(0.02 * e["lat"] + 0.5 * e["angRel"]), -1, 1)
        er = 20 - e["v"]
        carro.guiar({"aceleracao": clamp(er / 4, 0, 1), "frenagem": clamp(-er / 4, 0, 1), "direcao": direcao})
`;
const editor=$('code-editor'),consoleOut=$('console-output'),runBtn=$('runBtn'),stopBtn=$('stopBtn'),selEx=$('exampleSelect');
function log(s,cls){const l=document.createElement('div');if(cls)l.className=cls;l.textContent=s;consoleOut.appendChild(l);
  while(consoleOut.childElementCount>300)consoleOut.firstChild.remove();consoleOut.scrollTop=consoleOut.scrollHeight;}
const limpar=()=>{consoleOut.textContent='';};
function ui(rodando,msg){runBtn.disabled=rodando;stopBtn.disabled=!wk;$('status-msg').textContent=msg;
  $('engine-mode').textContent=wk?'Motor: JS + Pyodide (Worker)':'Motor: JS (página)';}
const pacotesDe=c=>{const m=c.match(/^#\s*pacotes:\s*(.+)$/m);return m?m[1].split(',').map(s=>s.trim()).filter(Boolean):[];};
let tSalvar=0;
const salvarCodigo=()=>{try{localStorage.setItem('pa_cod',editor.value);localStorage.setItem('pa_modo',$('pyModo').value);}catch(_){}};

sim.carros.forEach((c,i)=>$('pyCar').add(new Option('C'+(i+1),i)));$('pyCar').add(new Option('todos','todos'));$('pyCar').value=5;
try{const cod=localStorage.getItem('pa_cod');editor.value=cod||MODELO;$('pyModo').value=localStorage.getItem('pa_modo')||'agente';}catch(_){editor.value=MODELO;}

async function carregarExemplo(chave){
  const [modo,url]=EX[chave];$('pyModo').value=modo;
  try{if(!url)editor.value=MODELO;else{const r=await fetch(url);if(!r.ok)throw new Error(r.status);editor.value=await r.text();}}
  catch(_){editor.value=MODELO;log('Não consegui abrir o exemplo (arquivos precisam de http/https: use o GitHub Pages ou "python -m http.server"). Carreguei o modelo mínimo.','warn');}
  salvarCodigo();
}

// espelha um quadro do worker nos carros locais (o desenho e os raios do foco usam `sim` normalmente)
function aplicaSnap(s){
  if(sim.carros.length!==s.carros.length){sim.reiniciar(s.carros.length);foco=Math.min(foco,s.carros.length-1);}
  s.carros.forEach((a,i)=>{const c=sim.carros[i];[c.x,c.y,c.th,c.vx,c.vy,c.w,c.delta,c.lat,c.s,c.idx,c.ader,c.voltas,c.ult,c.melhor]=a;});
  sim.t=s.tempo;sim.tick++;
}
function sincWk(){if(wk){wk.msg({t:'pausa',v:pausa});wk.msg({t:'vel',v:vel});}}
function pyParar(quieto){
  if(!wk)return;wk.encerrar();wk=null;snap=null;sim.reiniciar(6);aplicaHumano();ui(false,'Parado.');
  if(!quieto)log('Execução interrompida pelo usuário.','warn');
}
function pyExecutar(){
  pyParar(true);limpar();salvarCodigo();
  const cod=editor.value,modo=$('pyModo').value,n=sim.carros.length,sc=$('pyCar').value,pacotes=pacotesDe(cod);
  wk=new PonteWeb({
    onstatus:m=>log(m.s),onlog:m=>log(m.s),onquadro:m=>{snap=m;},
    onpronto:()=>{log('Rodando…','ok');ui(true,'Executando…');},
    onerro:m=>{log('Erro:\n'+m.s,'err');ui(false,'Erro.');},
    onfim:()=>{log('Programa finalizado.','ok');ui(false,'Finalizado.');}});
  ui(true,'Carregando…');
  wk.msg(modo==='agente'?{t:'corrida',codigo:cod,pacotes,n,carros:sc==='todos'?[...Array(n).keys()]:[+sc]}:{t:'script',codigo:cod,pacotes});
  sincWk();
}

runBtn.addEventListener('click',pyExecutar);
stopBtn.addEventListener('click',()=>pyParar());
$('resetBtn').addEventListener('click',()=>carregarExemplo(selEx.value));
selEx.addEventListener('change',e=>{pyParar(true);carregarExemplo(e.target.value);});
$('pyLoad').addEventListener('click',()=>$('pyFile').click());
$('pyFile').addEventListener('change',async e=>{const f=e.target.files[0];if(f){editor.value=await f.text();salvarCodigo();}e.target.value='';});
$('pySave').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([editor.value],{type:'text/x-python'}));a.download='meu_agente.py';a.click();});
editor.addEventListener('input',()=>{clearTimeout(tSalvar);tSalvar=setTimeout(salvarCodigo,400);});
editor.addEventListener('keydown',e=>{
  if(e.key==='Tab'){e.preventDefault();const s=editor.selectionStart,en=editor.selectionEnd;
    editor.value=editor.value.slice(0,s)+'    '+editor.value.slice(en);editor.selectionStart=editor.selectionEnd=s+4;}
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();pyExecutar();}
});
log('Pronto. Escolha um exemplo e toque em "Executar" (ou Ctrl+Enter). Primeira vez? Toque em "? Ajuda" para o tutorial.');
