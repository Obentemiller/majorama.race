/* Agente reativo de exemplo: segue a maior abertura (pure pursuit) + centragem PD + velocidade pela visibilidade */
class AgenteReativo{
  constructor(p={}){this.vmax=p.vmax??45;this.freio=p.freio??6;}
  decidir(o){const d=o.dist,e=o.estado,v=e.v;
    let sw=0,sa=0,dm=0;
    for(let i=1;i<=5;i++){const k=d[i]**3;sw+=k;sa+=k*SENSORES[i]*Math.PI/180;dm=Math.max(dm,d[i]);}
    const al=sa/sw,Ld=Math.max(8,.7*v),sn=Math.abs(Math.sin(al));
    let vt=Math.min(this.vmax,8+Math.sqrt(2*this.freio*Math.max(0,dm-8)));
    if(sn>.03)vt=Math.min(vt,Math.sqrt(9*Ld/(2*sn)));            // limite de aceleração lateral
    // ultrapassagem: se há carro à frente, escolhe o lado mais livre e mantém até passar
    const bloq=[2,3,4].some(i=>o.tipo[i]==='carro'&&d[i]<35),ao=o.tipo[0]==='carro'||o.tipo[6]==='carro';
    if(bloq&&!this.lado)this.lado=d[6]>d[0]?1:-1;else if(!bloq&&!ao)this.lado=0;
    let dir;
    if(e.fora){dir=clamp(2*(-clamp(e.lat*.1,-.8,.8)-e.angRel),-1,1);vt=Math.min(vt,10);}
    else{const vv=Math.max(v,8),pp=Math.atan(5.4*Math.sin(al)/Ld),ce=-(1.7/(vv*vv)*(e.lat-(this.lado||0)*4.5)+3.5/vv*e.angRel);
      dir=clamp((pp+ce)/CARRO.dmax,-1,1);}
    const er=vt-v;
    return{aceleracao:clamp(er/4,0,1)*(1-.5*Math.abs(dir)),frenagem:clamp(-er/4,0,1),direcao:dir};}
}
