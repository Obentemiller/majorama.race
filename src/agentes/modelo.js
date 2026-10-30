/* Modelo mínimo de agente: copie, renomeie e implemente decidir().
   Este exemplo só segue a linha central a ~20 m/s (não antecipa curvas: é ponto de partida). */
class AgenteModelo{
  decidir(obs){
    const {dist,tipo,estado}=obs;                 // dist[i] está na direção SENSORES[i] graus
    const dir=clamp(-(0.02*estado.lat+0.5*estado.angRel),-1,1);
    const er=20-estado.v;
    return{aceleracao:clamp(er/4,0,1),frenagem:clamp(-er/4,0,1),direcao:dir};
  }
}
