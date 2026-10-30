class Simulacao{
  constructor(n){this.pista=new Pista(PTS,16);this.reiniciar(n);}
  reiniciar(n=this.n){this.n=n;this.tick=0;this.t=0;this.carros=[];
    const cores=['#ff595e','#ffca3a','#8ac926','#1982c4','#c77dff','#ff924c'];
    for(let i=0;i<n;i++){const c=new Carro(this,i,-6-(i>>1)*10,(i%2?1:-1)*3.5,cores[i%6]);
      c.base=c.agente=criarAgente(i);this.carros.push(c);}}
  passo(){const P=this.pista,cs=this.carros;
    for(const c of cs)if(c.agente)c.guiar(c.agente.decidir({dist:c.retorno(),tipo:c.tipo.slice(),estado:c.estado()}));
    for(let k=0;k<SUB;k++){for(const c of cs)c.passo(DT/SUB);this.colisoes();}
    for(const c of cs){const l=P.localiza(c.x,c.y,c.idx);c.idx=l.i;c.lat=l.lat;const s=((l.s%P.len)+P.len)%P.len;
      if(c.s>P.len*.75&&s<P.len*.25){if(c.tVolta!==null){c.ult=this.t-c.tVolta;c.melhor=Math.min(c.melhor??1e9,c.ult);c.voltas++;}c.tVolta=this.t;}
      c.s=s;c.ader=Math.abs(l.lat)>P.w/2?.5:1;                    // fora da pista = grama
      const lim=P.w/2+8;
      if(Math.abs(l.lat)>lim){const e=(Math.abs(l.lat)-lim)*Math.sign(l.lat);c.x-=e*l.q.nx;c.y-=e*l.q.ny;c.vx*=.6;c.vy*=.4;c.w*=.5;} // barreira
    }
    this.tick++;this.t+=DT;}
  colisoes(){const cs=this.carros,hl=CARRO.L/2,hw=CARRO.W/2;
    for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){
      const a=cs[i],b=cs[j],dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy>25)continue;
      const ax=[[Math.cos(a.th),Math.sin(a.th)],[-Math.sin(a.th),Math.cos(a.th)],[Math.cos(b.th),Math.sin(b.th)],[-Math.sin(b.th),Math.cos(b.th)]];
      let pm=1e9,n=null;
      for(const [ux,uy] of ax){   // teorema do eixo separador (SAT) entre dois retângulos
        const r=q=>Math.abs(ux*Math.cos(q.th)+uy*Math.sin(q.th))*hl+Math.abs(-ux*Math.sin(q.th)+uy*Math.cos(q.th))*hw;
        const pr=dx*ux+dy*uy,ov=r(a)+r(b)-Math.abs(pr);
        if(ov<0){n=null;break;}if(ov<pm){pm=ov;n=pr<0?[-ux,-uy]:[ux,uy];}}
      if(!n)continue;
      const va=a.vw(),vb=b.vw(),rel=(vb[0]-va[0])*n[0]+(vb[1]-va[1])*n[1];
      a.x-=n[0]*pm/2;a.y-=n[1]*pm/2;b.x+=n[0]*pm/2;b.y+=n[1]*pm/2;
      if(rel<0){const j2=-1.2*rel/2;                                 // impulso por massa (restituição 0,2)
        a.defV(va[0]-j2*n[0],va[1]-j2*n[1]);b.defV(vb[0]+j2*n[0],vb[1]+j2*n[1]);
        const dw=clamp(-.5*j2*CARRO.m*(dx*n[1]-dy*n[0])/CARRO.Iz,-2,2);a.w+=dw;b.w+=dw;}}}
}
