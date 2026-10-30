/* Agente humano: lê o teclado/toque (objeto `teclas`) e devolve comandos suavizados. */
const teclas={a:0,f:0,e:0,d:0};
const Humano={hd:0,decidir(o){const alvo=(teclas.d-teclas.e)/(1+Math.abs(o.estado.v)/18);this.hd+=(alvo-this.hd)*.25;
  return{aceleracao:teclas.a,frenagem:teclas.f,direcao:this.hd};}};
