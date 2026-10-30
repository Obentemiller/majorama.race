/* Ambiente: camada de treino sobre a simulação. UM protocolo JSON, dois transportes:
   Node (headless/servidor.js, stdin/stdout) e navegador (src/web/worker.js, chamada direta).
   O carro `k` fica sem agente (quem comanda é o Python); os demais seguem registro.js (JS).
   `resumo` traz medidas para a RECOMPENSA (progresso, grama, contato, posição): só o treinador as vê.
   {cmd:'info'}                       -> {len,w,DT,RANGE,SENSORES,CARRO}
   {cmd:'reiniciar',n,carro,posicoes?} -> {obs,pos,prog,t,voltas,v,ds,fora,contato}   (posicoes: [{i,s,lat,v}])
   {cmd:'passo',acao,ticks}           -> idem, com ds/fora/contato acumulados nos `ticks`
   {cmd:'estado'}                     -> {tempo,carros:[[x,y,th,vx,vy,w,delta,lat,s,idx,ader,voltas,ult,melhor],..]} (desenho) */
function snapshotDe(sim){
  return{tempo:sim.t,carros:sim.carros.map(c=>[c.x,c.y,c.th,c.vx,c.vy,c.w,c.delta,c.lat,c.s,c.idx,c.ader,c.voltas,c.ult,c.melhor])};
}
class Ambiente{
  constructor(){this.sim=null;this.k=0;this.sAnt=0;this.prog=0;}
  obsDe(c){return{dist:c.retorno(),tipo:c.tipo.slice(),estado:c.estado()};}
  // posição na corrida do carro k (0 = líder), mesmo critério de headless/rodar.js
  posicao(){const P=this.sim.pista;
    const o=this.sim.carros.map((c,i)=>({i,v:c.voltas*P.len+(c.voltas===0&&c.s>P.len/2?c.s-P.len:c.s)})).sort((a,b)=>b.v-a.v);
    return o.findIndex(x=>x.i===this.k);}
  resumo(extra={}){const c=this.sim.carros[this.k];
    return{obs:this.obsDe(c),pos:this.posicao(),prog:this.prog,t:this.sim.t,voltas:c.voltas,v:c.vx,ds:0,fora:0,contato:0,...extra};}
  info(){const s=this.sim||(this.sim=new Simulacao(1));
    return{len:s.pista.len,w:s.pista.w,DT,RANGE,SENSORES,CARRO};}
  reiniciar(m){
    const n=m.n??6;this.k=m.carro??n-1;
    if(!this.sim)this.sim=new Simulacao(n);else this.sim.reiniciar(n);
    const sim=this.sim,P=sim.pista;
    for(const p of m.posicoes||[]){                     // posições escolhidas pelo treinador (largada aleatória)
      const c=sim.carros[p.i],g=P.em(p.s,p.lat),l=P.localiza(g.x,g.y,-1);
      Object.assign(c,{x:g.x,y:g.y,th:g.th,vx:p.v||0,vy:0,w:0,delta:0,idx:l.i,lat:l.lat,s:((l.s%P.len)+P.len)%P.len});}
    sim.carros[this.k].agente=null;
    this.sAnt=sim.carros[this.k].s;this.prog=0;
    return this.resumo();}
  passo(m){
    const sim=this.sim,c=sim.carros[this.k],P=sim.pista;let ds=0,fora=0,contato=0;
    c.guiar(m.acao);
    for(let t=0;t<(m.ticks||1);t++){
      sim.passo();
      let d=c.s-this.sAnt;if(d<-P.len/2)d+=P.len;else if(d>P.len/2)d-=P.len;   // trata a virada de s na linha de chegada
      ds+=d;this.sAnt=c.s;
      if(c.ader<1)fora++;
      c.retorno();if(c.dist.some((x,i)=>c.tipo[i]==='carro'&&x<.25))contato++;  // raio de carro a <25 cm = contato
    }
    this.prog+=ds;return this.resumo({ds,fora,contato});}
  cmd(m){
    switch(m.cmd){
      case'info':return this.info();
      case'reiniciar':return this.reiniciar(m);
      case'passo':return this.passo(m);
      case'estado':return snapshotDe(this.sim);
      default:return{erro:'comando desconhecido: '+m.cmd};}}
}
