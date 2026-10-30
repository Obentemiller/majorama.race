class Pista{
  constructor(pts,w){
    this.w=w;const P=pts.length,N=12,c=[];
    for(let i=0;i<P;i++){const p0=pts[(i+P-1)%P],p1=pts[i],p2=pts[(i+1)%P],p3=pts[(i+2)%P];
      for(let k=0;k<N;k++){const t=k/N,t2=t*t,t3=t2*t;
        c.push([0,1].map(j=>.5*(2*p1[j]+(p2[j]-p0[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(3*p1[j]-p0[j]-3*p2[j]+p3[j])*t3)));}}
    const n=this.n=c.length;this.p=[];let s=0;
    for(let i=0;i<n;i++){const a=c[(i+n-1)%n],b=c[(i+1)%n],q=c[i];
      let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty);tx/=l;ty/=l;
      this.p.push({x:q[0],y:q[1],tx,ty,nx:-ty,ny:tx,s});          // n = normal à direita
      s+=Math.hypot(b[0]-q[0],b[1]-q[1]);}
    this.len=s;const h=w/2,L=[],R=[],S=[];
    this.p.forEach(q=>{L.push([q.x-q.nx*h,q.y-q.ny*h]);R.push([q.x+q.nx*h,q.y+q.ny*h]);});
    this.rd=typeof Path2D!=='undefined'?new Path2D():null;  // só existe no navegador
    for(const B of [L,R]){B.forEach((q,i)=>{if(this.rd)this.rd[i?'lineTo':'moveTo'](q[0],q[1]);const r=B[(i+1)%n];S.push(q[0],q[1],r[0],r[1]);});if(this.rd)this.rd.closePath();}
    this.segs=Float64Array.from(S);
  }
  localiza(x,y,h){const n=this.n;let bi=0,bd=1e18;const i0=h<0?0:h-25,cnt=h<0?n:51;
    for(let k=0;k<cnt;k++){const i=((i0+k)%n+n)%n,q=this.p[i],d=(x-q.x)**2+(y-q.y)**2;if(d<bd){bd=d;bi=i;}}
    const q=this.p[bi],dx=x-q.x,dy=y-q.y;
    return{i:bi,q,lat:dx*q.nx+dy*q.ny,s:q.s+dx*q.tx+dy*q.ty};}
  em(s,lat){s=((s%this.len)+this.len)%this.len;let i=0;while(i<this.n-1&&this.p[i+1].s<=s)i++;
    const q=this.p[i],d=s-q.s;return{x:q.x+q.tx*d+q.nx*lat,y:q.y+q.ty*d+q.ny*lat,th:Math.atan2(q.ty,q.tx)};}
  rayoPista(ox,oy,dx,dy,max){let best=max;const S=this.segs;
    for(let i=0;i<S.length;i+=4){const x1=S[i],y1=S[i+1],ex=S[i+2]-x1,ey=S[i+3]-y1,den=dx*ey-dy*ex;
      if(Math.abs(den)<1e-9)continue;
      const t=((x1-ox)*ey-(y1-oy)*ex)/den,u=((x1-ox)*dy-(y1-oy)*dx)/den;
      if(t>=0&&t<best&&u>=0&&u<=1)best=t;}
    return best;}
}
