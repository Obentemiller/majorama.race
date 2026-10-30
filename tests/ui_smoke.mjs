// Teste de fumaça da interface (jsdom): carrega index.html, exercita layout (abrir/fechar/redimensionar),
// tutorial e o protocolo página<->Worker (Worker simulado). Não mede pixels reais: só a lógica.
//   npm install --no-save jsdom && node tests/ui_smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {JSDOM,VirtualConsole} from 'jsdom';

const RAIZ=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let html=fs.readFileSync(path.join(RAIZ,'index.html'),'utf8');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,f)=>`<script>${fs.readFileSync(path.join(RAIZ,f),'utf8').replace(/<\/script>/g,'<\\/script>')}</script>`);

const erros=[],vc=new VirtualConsole();
vc.on('jsdomError',e=>erros.push(String(e.stack||e)));
const dim={w:1000,h:600},mq={matches:false,ls:[]},workers=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const nada=new Proxy(function(){},{get:()=>nada,set:()=>true,apply:()=>undefined});
  w.HTMLCanvasElement.prototype.getContext=()=>nada;
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.matchMedia=()=>({get matches(){return mq.matches;},addEventListener:(_,f)=>mq.ls.push(f)});
  w.Worker=class{constructor(u){this.u=u;this.enviadas=[];workers.push(this);}postMessage(m){this.enviadas.push(m);}terminate(){this.morto=true;}};
  const tam=()=>parseFloat(w.document.getElementById('workspace').style.getPropertyValue('--editor-size'))||0;
  const def=(p,f)=>Object.defineProperty(w.HTMLElement.prototype,p,{get(){return f(this);},configurable:true});
  def('clientWidth',e=>e.id==='workspace'?dim.w:0);def('clientHeight',e=>e.id==='workspace'?dim.h:0);
  def('offsetWidth',e=>e.id==='splitter'?6:e.id==='editor-pane'?tam():0);
  def('offsetHeight',e=>e.id==='splitter'?(mq.matches?22:12):e.id==='editor-pane'?tam():0);
  w.Element.prototype.getBoundingClientRect=function(){const v=!this.closest('[hidden]');return{left:10,top:10,width:v?100:0,height:v?30:0,right:110,bottom:40};};
}});
const w=dom.window,d=w.document,g=id=>d.getElementById(id),esperar=ms=>new Promise(r=>setTimeout(r,ms));
const ev=(el,tipo,o={})=>el.dispatchEvent(new w.MouseEvent(tipo,{bubbles:true,button:0,...o}));
const tecla=(el,key,o={})=>el.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...o}));
const tam=()=>parseFloat(g('workspace').style.getPropertyValue('--editor-size'));
let falhas=0;
async function teste(nome,f){try{await f();console.log('ok     ',nome);}catch(e){falhas++;console.log('FALHOU ',nome,'->',e.message);}}

await teste('a página carrega sem erros de script',()=>{assert.deepEqual(erros,[]);assert.ok(w.Sim.carros.length===6);});
await teste('layout: abrir/fechar pelo botão Scripts e pelo ✕',()=>{
  assert.equal(g('editor-pane').hidden,false);assert.equal(tam(),380);
  g('bY').click();assert.ok(g('editor-pane').hidden&&g('splitter').hidden);assert.equal(g('bY').getAttribute('aria-pressed'),'false');
  g('bY').click();assert.ok(!g('editor-pane').hidden);
  g('closeEditor').click();assert.ok(g('editor-pane').hidden);g('bY').click();});
await teste('layout: arrastar o divisor respeita o mínimo do editor e o mínimo da simulação',()=>{
  const sp=g('splitter');ev(sp,'pointerdown',{clientX:700});
  ev(sp,'pointermove',{clientX:600});assert.equal(tam(),480);          // arrastar p/ esquerda aumenta
  ev(sp,'pointermove',{clientX:0});assert.equal(tam(),1000-6-320);     // simulação mantém >= 320 px
  ev(sp,'pointermove',{clientX:2000});assert.equal(tam(),260);         // editor mantém >= 260 px
  ev(sp,'pointerup');
  assert.ok(JSON.parse(w.localStorage.getItem('majorama.layout')).tam.h>=260);});
await teste('layout: teclado (setas, Home/End) e duplo clique',()=>{
  const sp=g('splitter');tecla(sp,'ArrowLeft');assert.equal(tam(),280);tecla(sp,'ArrowLeft',{shiftKey:true});assert.equal(tam(),340);
  tecla(sp,'End');assert.equal(tam(),674);tecla(sp,'Home');assert.equal(tam(),260);
  ev(sp,'dblclick');assert.equal(tam(),380);});
await teste('layout: janela pequena nunca deixa a simulação abaixo do mínimo; empilhado usa a altura',()=>{
  dim.w=700;w.dispatchEvent(new w.Event('resize'));assert.equal(tam(),700-6-320);
  dim.w=1000;mq.matches=true;dim.h=600;mq.ls.forEach(f=>f());
  assert.equal(tam(),300);dim.h=500;w.dispatchEvent(new w.Event('resize'));assert.equal(tam(),500-22-200);   // o cenário mantém >= 200 pxassert.equal(g('splitter').getAttribute('aria-orientation'),'horizontal');
  dim.h=400;w.dispatchEvent(new w.Event('resize'));assert.equal(tam(),400-22-200);
  mq.matches=false;dim.h=600;mq.ls.forEach(f=>f());assert.equal(tam(),380);});
await teste('tutorial: percorre todos os passos, abre a janela quando preciso e restaura o estado',async()=>{
  g('closeEditor').click();assert.ok(g('editor-pane').hidden);
  g('helpBtn').click();await esperar(80);assert.equal(g('tour').hidden,false);
  const n=w.Tutorial.PASSOS.length,vistos=[];
  for(let k=0;k<n;k++){vistos.push(g('tourTitulo').textContent);
    if(k===6){assert.equal(g('editor-pane').hidden,false);}
    assert.ok(g('tourTitulo').textContent&&g('tourPos').textContent.startsWith(String(k+1)));
    g('tourNext').click();await esperar(80);}
  assert.equal(g('tour').hidden,true);assert.equal(vistos.length,n);
  assert.ok(g('editor-pane').hidden,'deveria voltar a fechada');g('bY').click();});
await teste('tutorial: pula passos cujo alvo está oculto (HUD) e Esc sai',async()=>{
  g('bU').click();g('helpBtn').click();await esperar(80);
  for(let k=0;k<3;k++){g('tourNext').click();await esperar(80);}
  assert.notEqual(g('tourTitulo').textContent,'Painel de posições');
  tecla(d.body,'Escape');assert.equal(g('tour').hidden,true);g('bU').click();});
await teste('Python: Executar manda a mensagem certa ao Worker e espelha quadros',async()=>{
  g('runBtn').click();const wk=workers.at(-1);
  const m=wk.enviadas.find(x=>x.t==='corrida');assert.ok(m&&m.n===6&&m.carros[0]===5&&m.codigo.includes('class Agente'));
  assert.ok(g('runBtn').disabled&&!g('stopBtn').disabled);
  wk.onmessage({data:{t:'pronto'}});
  const car=w.Sim.carros.map((_,i)=>[100+i,50,0.5,20,0,0,0,0,300,5,1,0,null,null]);
  wk.onmessage({data:{t:'quadro',tempo:12.5,carros:car}});await esperar(60);
  assert.equal(w.Sim.carros[0].x,100);assert.equal(w.Sim.t,12.5);
  wk.onmessage({data:{t:'erro',s:'NameError: x'}});assert.ok(g('console-output').querySelector('.err'));
  g('stopBtn').click();assert.ok(wk.morto);assert.ok(g('stopBtn').disabled&&!g('runBtn').disabled);});
await teste('Python: modo script e carro "todos"',()=>{
  g('pyModo').value='script';g('runBtn').click();assert.ok(workers.at(-1).enviadas.some(x=>x.t==='script'));g('stopBtn').click();
  g('pyModo').value='agente';g('pyCar').value='todos';g('runBtn').click();
  assert.equal(JSON.stringify(workers.at(-1).enviadas.find(x=>x.t==='corrida').carros),'[0,1,2,3,4,5]');g('stopBtn').click();});
await teste('modo vertical (celular): exemplos vão para a gaveta, dock e maximizar',()=>{
  mq.matches=true;dim.h=700;mq.ls.forEach(f=>f());
  assert.equal(g('exampleSelect').parentNode.id,'editor-opts');assert.equal(tam(),300);
  g('maxEditor').click();assert.equal(tam(),700-22-200);g('maxEditor').click();assert.equal(tam(),300);
  for(const id of ['runBtn','stopBtn','bY','helpBtn'])assert.ok(g('controls').contains(g(id)),id+' na dock');
  mq.matches=false;dim.h=600;mq.ls.forEach(f=>f());assert.equal(g('exampleSelect').parentNode.id,'controls');});
await teste('tutorial: o último passo oferece o link do manual',async()=>{
  g('helpBtn').click();await esperar(80);const n=w.Tutorial.PASSOS.length;
  for(let k=0;k<n-1;k++){g('tourNext').click();await esperar(80);}
  assert.equal(g('tourLink').hidden,false);assert.ok(g('tourLink').href.includes('manual.md'));tecla(d.body,'Escape');});
await teste('sem erros de script ao longo de todos os testes',()=>assert.deepEqual(erros,[]));
if(falhas){console.log(`\n${falhas} teste(s) falharam`);process.exit(1);}
console.log('\ntodos os testes de interface passaram');process.exit(0);
