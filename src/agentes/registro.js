/* Registro: define QUAL agente controla CADA carro. Edite aqui para trocar de agente.
   Chamado por Simulacao.reiniciar(). `i` = índice do carro (0 = pole). */
const VMAX=[38,41,43,45,47,50];   // perfis do agente reativo: os mais rápidos largam atrás
function criarAgente(i){
  return new AgenteReativo({vmax:VMAX[i%6],freio:5+.3*(i%6)});
}
