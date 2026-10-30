"""Modelo mínimo de agente Python: copie, renomeie e implemente controlar().
Este exemplo só segue a linha central a ~20 m/s (não antecipa curvas: é ponto de partida).
Cada carro roda num processo próprio, então o estado em `self` é só deste carro."""
from constantes import clamp


class AgenteModelo:
    def controlar(self, carro):                  # chamado 1x por tick (60 Hz)
        dist, tipo, e = carro.retorno(), carro.tipo, carro.estado()   # dist[i] aponta para SENSORES[i] graus
        direcao = clamp(-(0.02 * e["lat"] + 0.5 * e["angRel"]), -1, 1)
        er = 20 - e["v"]
        carro.guiar({"aceleracao": clamp(er / 4, 0, 1), "frenagem": clamp(-er / 4, 0, 1), "direcao": direcao})


def criar_agente(i):                             # usado se --py-classe não for informado
    return AgenteModelo()
