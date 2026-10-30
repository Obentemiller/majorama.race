"""Agente treinado (PPO) em NumPy puro: roda no NAVEGADOR (Pyodide) e no Node, sem PyTorch.
Gere o .npz a partir do modelo do stable-baselines3:   python python/exportar_npz.py --nome solo

    node headless/rodar.js --carros 1 --py python/agentes/treinado_numpy.py --carro 0

Mesma observação/ação do treino (observacao.py) e mesma frequência de decisão (`repetir` ticks)."""
import os

import numpy as np

import observacao

MODELOS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "modelos")


class AgenteTreinadoNumpy:
    def __init__(self, nome=None):
        z = np.load(os.path.join(MODELOS, (nome or os.environ.get("MODELO", "solo")) + ".npz"))
        self.W, self.b = [z["W1"], z["W2"], z["W3"]], [z["b1"], z["b2"], z["b3"]]
        self.repetir = int(z["repetir"])
        self.tick, self.acao = 0, [0.0, 0.0]

    def prever(self, x):                          # MLP 23 -> 64 -> 64 -> 2 (tanh); saída cortada em [-1, 1]
        h = np.tanh(self.W[0] @ x + self.b[0])
        h = np.tanh(self.W[1] @ h + self.b[1])
        return np.clip(self.W[2] @ h + self.b[2], -1, 1)

    def controlar(self, carro):
        if self.tick % self.repetir == 0:         # decide na frequência do treino
            self.acao = self.prever(observacao.vetor(carro.retorno(), carro.tipo, carro.estado()))
        self.tick += 1
        carro.guiar(observacao.comando(self.acao))


def criar_agente(i):
    return AgenteTreinadoNumpy()
