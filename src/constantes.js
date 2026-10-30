/* ============ NÚCLEO DA SIMULAÇÃO (independe do desenho) ============
   API para agentes:
   carro.guiar({aceleracao:0..1, frenagem:0..1, direcao:-1..1})   (direcao>0 = direita)
   carro.retorno()  -> array de distâncias (m), uma por sensor, em SENSORES
   carro.tipo[i]    -> 'pista' | 'carro' | null (o que cada raio acertou)
   carro.estado()   -> velocidade, taxa de guinada, posição na pista etc.
   Agente próprio:  Sim.carros[i].agente = { decidir(obs){ return {aceleracao,frenagem,direcao}; } }
   obs = { dist:[...], tipo:[...], estado:{...} }                                   */
const DT=1/60, SUB=2, G=9.81, RANGE=150;
// Carro pré-definido (SI): dimensões, massa, geometria e pneus
const CARRO={L:4.5,W:1.9,m:1500,Iz:2500,a:1.3,b:1.4,mu:1.5,k:8,Pmax:150e3,Fmax:9000,Fbrk:16000,CdA:0.6,dmax:0.5,dRate:2.5};
// Ângulos dos sensores (graus, 0 = frente, + = direita). 0, ±90 e 180 são normais às faces do carro.
const SENSORES=[-90,-45,-20,0,20,45,90,180];
const PTS=[[-200,-100],[0,-120],[200,-100],[330,-40],[340,60],[240,110],[140,90],[60,130],[80,220],[200,260],[260,340],[160,400],[-40,380],[-180,320],[-260,200],[-300,60]];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
