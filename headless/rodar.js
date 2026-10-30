#!/usr/bin/env node
// Simula sem renderização e imprime métricas. Uso: node headless/rodar.js --help
const path=require('path'),fs=require('fs'),vm=require('vm'),{carregar}=require('./carregar'),{PontePy}=require('./ponte_py');
const A=process.argv,arg=(k,d)=>{const i=A.indexOf('--'+k);return i>0?A[i+1]:d;};
if(A.includes('--help')){console.log('--seg 120  --carros 6  --agente arquivo.js --classe NomeDaClasse  --carro 0  --json\n'+
  'Agentes em Python (1 processo por carro): --py arquivo.py [--py-classe Nome]  --carro 0,2,5|todos');process.exit(0);}
const seg=+arg('seg',120),n=+arg('carros',6),L=carregar(),sim=new L.Simulacao(n);
const ks=arg('carro','0')==='todos'?[...Array(n).keys()]:String(arg('carro','0')).split(',').map(Number),k=ks[0];
if(arg('agente')){
  vm.runInThisContext(fs.readFileSync(path.resolve(arg('agente')),'utf8'),{filename:arg('agente')});
  sim.carros[k].base=sim.carros[k].agente=new (vm.runInThisContext(arg('classe')))();
}
(async()=>{
const ponte=arg('py')?new PontePy(sim,L):null;     // agentes Python nos carros de --carro (sem --py: tudo como antes)
if(ponte)for(const i of ks)await ponte.adicionar(i,arg('py'),arg('py-classe'));
const P=sim.pista,met=sim.carros.map(()=>({fora:0,vs:0,vmax:0}));
const pos=()=>{const o=sim.carros.map((c,i)=>({i,k:c.voltas*P.len+(c.voltas===0&&c.s>P.len/2?c.s-P.len:c.s)})).sort((a,b)=>b.k-a.k),r=[];o.forEach((x,p)=>r[x.i]=p);return r;};
let rp=pos(),ult=0;const N=Math.round(seg/L.DT);
for(let t=0;t<N;t++){
  if(ponte)await ponte.passo();else sim.passo();
  sim.carros.forEach((c,i)=>{const m=met[i];if(c.ader<1)m.fora++;m.vs+=c.vx;m.vmax=Math.max(m.vmax,c.vx);});
  if(t%30===0){const rn=pos();for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if((rp[i]-rp[j])*(rn[i]-rn[j])<0)ult++;rp=rn;}
}
if(ponte)await ponte.fechar();
const rows=sim.carros.map((c,i)=>({carro:'C'+(i+1),voltas:c.voltas,melhor_s:c.melhor?+c.melhor.toFixed(2):null,vmed_kmh:+(met[i].vs/N*3.6).toFixed(1),vmax_kmh:+(met[i].vmax*3.6).toFixed(1),fora_pct:+(100*met[i].fora/N).toFixed(1)}));
if(A.includes('--json'))console.log(JSON.stringify({seg,ultrapassagens:ult,carros:rows}));
else{console.log(`${seg}s simulados, pista ${P.len.toFixed(0)} m, trocas de posição: ${ult}`);console.table(rows);}
})().catch(e=>{console.error(e.message||e);process.exit(1);});
