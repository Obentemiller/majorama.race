"""Ponte entre o mundo do carro e a rede neural: observação (vetor) e ação (comando).

É usada pelo treino (PistaEnv) E pelo agente treinado (agentes/treinado.py). Manter as duas pontas
no mesmo arquivo garante que o modelo veja, ao rodar, exatamente o que viu ao treinar.

Vetor de observação (float32), tamanho 2·len(SENSORES) + 7:
  dist/RANGE (0..1) por sensor | 1.0 se o raio acertou um CARRO, senão 0 (por sensor) |
  v/60 | vy/10 | w | delta/dmax | lat/8 | angRel/π | fora (0/1)
Ação (2 valores em -1..1): [pedal, direcao]. pedal > 0 = acelera, pedal < 0 = freia (nunca os dois).
"""
import math

import numpy as np

import constantes as C   # módulo (não `from`): RANGE/CARRO podem ser atualizados pelo JS ao iniciar


def tamanho():
    return 2 * len(C.SENSORES) + 7


def vetor(dist, tipo, e):
    """dist/tipo/estado (o mesmo que carro.retorno(), carro.tipo, carro.estado()) -> vetor float32."""
    n = len(dist)
    v = np.empty(2 * n + 7, dtype=np.float32)
    v[:n] = np.asarray(dist, dtype=np.float32) / C.RANGE
    v[n:2 * n] = [1.0 if t == "carro" else 0.0 for t in tipo]
    v[2 * n:] = [e["v"] / 60, e["vy"] / 10, e["w"], e["delta"] / C.CARRO.dmax,
                 e["lat"] / 8, e["angRel"] / math.pi, 1.0 if e["fora"] else 0.0]
    return v


def comando(acao):
    """[pedal, direcao] (-1..1) -> dict para carro.guiar()."""
    pedal, direcao = float(acao[0]), float(acao[1])
    return {"aceleracao": max(pedal, 0.0), "frenagem": max(-pedal, 0.0), "direcao": direcao}
