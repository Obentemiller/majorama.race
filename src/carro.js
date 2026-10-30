class Carro{
  constructor(sim,id,s,lat,cor){
    const g=sim.pista.em(s,lat);
    Object.assign(this,{sim,id,cor,x:g.x,y:g.y,th:g.th,vx:0,vy:0,w:0,delta:0,
      cmd:{aceleracao:0,frenagem:0,direcao:0},agente:null,base:null,ader:1,lat,voltas:0,tVolta:null,melhor:null,ult:null,
      _tk:-1,dist:[],tipo:[],orig:[]});
    const l=sim.pista.localiza(g.x,g.y,-1);this.idx=l.i;this.s=((l.s%sim.pista.len)+sim.pista.len)%sim.pista.len;
  }
  guiar({aceleracao=0,frenagem=0,direcao=0}={}){
    this.cmd={aceleracao:clamp(aceleracao,0,1),frenagem:clamp(frenagem,0,1),direcao:clamp(direcao,-1,1)};}
  retorno(){if(this._tk!==this.sim.tick){this._sensorizar();this._tk=this.sim.tick;}return this.dist.slice();}
  estado(){const q=this.sim.pista.p[this.idx];let a=this.th-Math.atan2(q.ty,q.tx);a=Math.atan2(Math.sin(a),Math.cos(a));
    return{v:this.vx,vx:this.vx,vy:this.vy,w:this.w,delta:this.delta,lat:this.lat,angRel:a,s:this.s,voltas:this.voltas,fora:this.ader<1};}
  vw(){const c=Math.cos(this.th),s=Math.sin(this.th);return[this.vx*c-this.vy*s,this.vx*s+this.vy*c];}
  defV(wx,wy){const c=Math.cos(this.th),s=Math.sin(this.th);this.vx=wx*c+wy*s;this.vy=-wx*s+wy*c;}
  // raio contra o retângulo orientado deste carro
  rayo(ox,oy,dx,dy,max){const c=Math.cos(this.th),s=Math.sin(this.th),px=ox-this.x,py=oy-this.y;
    const o=[px*c+py*s,-px*s+py*c],d=[dx*c+dy*s,-dx*s+dy*c],h=[CARRO.L/2,CARRO.W/2];let t0=0,t1=max;
    for(let j=0;j<2;j++){
      if(Math.abs(d[j])<1e-9){if(Math.abs(o[j])>h[j])return max;}
      else{let a=(-h[j]-o[j])/d[j],b=(h[j]-o[j])/d[j];if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return max;}}
    return t0;}
  // cada raio nasce no contorno do carro e vai na direção do sensor; mede até o limite da pista ou outro carro
  _sensorizar(){const P=this.sim.pista,c=Math.cos(this.th),s=Math.sin(this.th),hl=CARRO.L/2,hw=CARRO.W/2;
    SENSORES.forEach((g,i)=>{const r=g*Math.PI/180,lx=Math.cos(r),ly=Math.sin(r);
      const k=Math.min(Math.abs(lx)>1e-9?hl/Math.abs(lx):1e9,Math.abs(ly)>1e-9?hw/Math.abs(ly):1e9);
      const px=lx*k,py=ly*k,ox=this.x+px*c-py*s,oy=this.y+px*s+py*c,dx=lx*c-ly*s,dy=lx*s+ly*c;
      let d=P.rayoPista(ox,oy,dx,dy,RANGE),t=d<RANGE?'pista':null;
      for(const o of this.sim.carros){if(o===this)continue;const e=o.rayo(ox,oy,dx,dy,d);if(e<d){d=e;t='carro';}}
      this.dist[i]=d;this.tipo[i]=t;this.orig[i]=[ox,oy,dx,dy];});}
  // dinâmica: modelo de bicicleta (corpo rígido 2D), 2º lei de Newton em x, y e rotação
  passo(dt){const C=CARRO,{vx,vy,w}=this;
    const al=this.cmd.direcao*C.dmax,dd=C.dRate*dt;this.delta+=clamp(al-this.delta,-dd,dd);const d=this.delta;
    const mu=C.mu*this.ader,Fzf=C.m*G*C.b/(C.a+C.b),Fzr=C.m*G*C.a/(C.a+C.b),capF=mu*Fzf,capR=mu*Fzr;
    const v=Math.hypot(vx,vy),vs=Math.max(Math.abs(vx),2),fl=Math.min(1,v/4);
    const Fd=this.cmd.aceleracao*Math.min(C.Fmax,C.Pmax/Math.max(vx,1));             // tração traseira, limitada por potência
    const Fb=this.cmd.frenagem*C.Fbrk*clamp(vx/.5,-1,1);                              // freio: 60% frente, 40% trás
    const Fxr=clamp(Fd-.4*Fb,-capR,capR),Fxf=clamp(-.6*Fb,-capF,capF);
    const af=Math.atan2(vy+C.a*w,vs)-d,ar=Math.atan2(vy-C.b*w,vs);                    // ângulos de deriva
    const Fyf=-fl*Math.sqrt(Math.max(0,capF*capF-Fxf*Fxf))*Math.tanh(C.k*af);         // círculo de atrito
    const Fyr=-fl*Math.sqrt(Math.max(0,capR*capR-Fxr*Fxr))*Math.tanh(C.k*ar);
    const cr=(this.ader<1?.12:.015)*C.m*G/(v+.5),cd=Math.cos(d),sd=Math.sin(d);       // rolamento + arrasto aerodinâmico
    const Fx=Fxr+Fxf*cd-Fyf*sd-(C.CdA*v+cr)*vx,Fy=Fyr+Fyf*cd+Fxf*sd-(C.CdA*v+cr)*vy;
    const Mz=C.a*(Fyf*cd+Fxf*sd)-C.b*Fyr;
    this.vx+=(Fx/C.m+vy*w)*dt;this.vy+=(Fy/C.m-vx*w)*dt;this.w+=Mz/C.Iz*dt;
    const c=Math.cos(this.th),s=Math.sin(this.th);
    this.x+=(this.vx*c-this.vy*s)*dt;this.y+=(this.vx*s+this.vy*c)*dt;this.th+=this.w*dt;}
}
