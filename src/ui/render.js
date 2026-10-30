/* ============ INTERFACE / RENDERIZAÇÃO ============ */
const sim=new Simulacao(6);window.Sim=sim;
const $=id=>document.getElementById(id),cv=$('cv'),ctx=cv.getContext('2d'),hudEl=$('hud');
let wk=null,snap=null,W=0,H=0,dpr=1,pausa=false,raios=true,cam=0,foco=0,vel=1,acc=0,ult=performance.now(),humano=false,fr=0,fpsN=0,fpsT=0;
let bb=[1e9,1e9,-1e9,-1e9];const m=sim.pista.w/2+10;
sim.pista.p.forEach(q=>{bb=[Math.min(bb[0],q.x-m),Math.min(bb[1],q.y-m),Math.max(bb[2],q.x+m),Math.max(bb[3],q.y+m)];});

function ajustar(){dpr=devicePixelRatio||1;const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;}
addEventListener('resize',ajustar);
if(window.ResizeObserver)new ResizeObserver(ajustar).observe(cv);   // o divisor muda o tamanho da janela de simulação sem evento de resize

function desenhar(){
  const P=sim.pista;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#35603a';ctx.fillRect(0,0,W,H);
  let sc,cx,cy;
  if(cam===0){sc=Math.min(W/(bb[2]-bb[0]),H/(bb[3]-bb[1]));cx=(bb[0]+bb[2])/2;cy=(bb[1]+bb[3])/2;}
  else{const f=sim.carros[foco];sc=Math.max(5,W/60);cx=f.x;cy=f.y;}
  ctx.setTransform(dpr*sc,0,0,dpr*sc,dpr*(W/2-cx*sc),dpr*(H/2-cy*sc));
  const px=1/sc;
  ctx.fillStyle='#44464a';ctx.fill(P.rd,'evenodd');
  ctx.lineWidth=Math.max(.4,2*px);ctx.strokeStyle='#f2f2f2';ctx.stroke(P.rd);
  const q=P.p[0];ctx.beginPath();ctx.moveTo(q.x-q.nx*6,q.y-q.ny*6);ctx.lineTo(q.x+q.nx*6,q.y+q.ny*6);ctx.lineWidth=1;ctx.stroke();
  if(raios){const c=sim.carros[foco];c.retorno();ctx.lineWidth=Math.max(.15,1.2*px);
    c.dist.forEach((d,i)=>{const o=c.orig[i];ctx.strokeStyle=c.tipo[i]==='carro'?'#ff4d4d':c.tipo[i]?'#2ec4b6':'rgba(200,200,200,.5)';
      ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(o[0]+o[2]*d,o[1]+o[3]*d);ctx.stroke();
      ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(o[0]+o[2]*d,o[1]+o[3]*d,Math.max(.3,2*px),0,7);ctx.fill();});}
  const kv=1;  // tamanho real sempre (a física usa o mesmo retângulo)
  sim.carros.forEach((c,i)=>{ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.th);ctx.scale(kv,kv);
    if(sc*CARRO.L<8){ctx.beginPath();ctx.arc(0,0,3.5*px,0,7);ctx.fillStyle=c.cor;ctx.fill();}  // marcador só para achar o carro na vista geral
    ctx.fillStyle=c.cor;ctx.fillRect(-CARRO.L/2,-CARRO.W/2,CARRO.L,CARRO.W);
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-.6,-.7,1.3,1.4);ctx.fillStyle='#fff';ctx.fillRect(CARRO.L/2-.5,-CARRO.W/2,.5,CARRO.W);
    if(i===foco){ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(.15,1.5*px/kv);ctx.strokeRect(-CARRO.L/2,-CARRO.W/2,CARRO.L,CARRO.W);}
    ctx.restore();});
  if(fr++%8===0)hud();
}
function hud(){
  if(hudEl.hidden)return;const P=sim.pista;
  const r=sim.carros.map(c=>({c,k:c.voltas*P.len+(c.voltas===0&&c.s>P.len/2?c.s-P.len:c.s)})).sort((a,b)=>b.k-a.k);
  hudEl.textContent='';
  r.forEach((o,i)=>{const c=o.c,l=document.createElement('div'),q=document.createElement('span');
    q.textContent='■';q.style.color=c.cor;                // CSSOM (não atributo style): compatível com CSP style-src 'self'
    l.append(q,` ${i+1}º C${c.id+1}${c.id===foco?'*':' '} ${(c.vx*3.6).toFixed(0).padStart(3)} km/h  voltas ${c.voltas}  ult ${c.ult?c.ult.toFixed(1)+'s':'--'}${c.ader<1?'  grama':''}`);
    hudEl.append(l);});
  const t=document.createElement('div');t.className='dim';t.textContent=`t=${sim.t.toFixed(1)}s  pista ${P.len.toFixed(0)} m`;hudEl.append(t);
}
function quadro(t){const dt=Math.min(.1,(t-ult)/1000);ult=t;
  if(wk){if(snap){aplicaSnap(snap);snap=null;}}   // modo Python: o worker simula, aqui só se espelha
  else if(!pausa){acc+=dt*vel;let n=0;while(acc>=DT&&n<600){sim.passo();acc-=DT;n++;}if(acc>DT)acc=0;}
  desenhar();fpsN++;
  if(t-fpsT>=500){$('fps').textContent='FPS: '+Math.round(fpsN*1000/(t-fpsT));$('tempo').textContent='Tempo: '+sim.t.toFixed(1)+' s';fpsN=0;fpsT=t;}
  requestAnimationFrame(quadro);}

function aplicaHumano(){const c=sim.carros[0];c.agente=humano?Humano:c.base;$('tc').hidden=!humano;$('bH').textContent='Humano: '+(humano?'on':'off');$('bH').setAttribute('aria-pressed',String(humano));
  if(humano){foco=0;cam=1;$('bF').textContent='Foco: C1';$('bC').textContent='Câmera: carro';}}
$('bP').onclick=e=>{pausa=!pausa;e.target.textContent=pausa?'▶ Seguir':'⏸ Pausa';sincWk();};
$('bR').onclick=()=>{if(wk)wk.msg({t:'reiniciar'});else{sim.reiniciar();aplicaHumano();}};
$('bL').onclick=e=>{raios=!raios;e.target.textContent='Raios: '+(raios?'on':'off');e.target.setAttribute('aria-pressed',String(raios));};
$('bC').onclick=e=>{cam=1-cam;e.target.textContent='Câmera: '+(cam?'carro':'pista');};
$('bF').onclick=e=>{foco=(foco+1)%sim.carros.length;e.target.textContent='Foco: C'+(foco+1);};
$('bV').onclick=e=>{vel=vel===1?4:vel===4?16:1;e.target.textContent='×'+vel;sincWk();};
$('bH').onclick=()=>{humano=!humano;aplicaHumano();};
$('bU').onclick=e=>{hudEl.hidden=!hudEl.hidden;e.target.setAttribute('aria-pressed',String(!hudEl.hidden));};
const mapa={ArrowUp:'a',w:'a',ArrowDown:'f',s:'f',ArrowLeft:'e',a:'e',ArrowRight:'d',d:'d'};
addEventListener('keydown',e=>{if(/^(TEXTAREA|SELECT|INPUT)$/.test(e.target.tagName))return;const k=mapa[e.key];if(k){teclas[k]=1;e.preventDefault();}});
addEventListener('keyup',e=>{const k=mapa[e.key];if(k)teclas[k]=0;});
document.querySelectorAll('#tc button').forEach(b=>{const k=b.dataset.k;
  b.onpointerdown=e=>{teclas[k]=1;e.preventDefault();};
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>{teclas[k]=0;}));});
ajustar();requestAnimationFrame(quadro);
