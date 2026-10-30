"""Agente que roda um modelo treinado com python/treinar.py, pelo mesmo caminho de qualquer agente Python:

    MODELO=ultimo node headless/rodar.js --seg 120 --py python/agentes/treinado.py --py-classe AgenteTreinado --carro 5

(MODELO = nome em python/modelos/; padrão 'ultimo'. No Windows: `set MODELO=ultimo` antes do comando.)
Usa a MESMA observacao.vetor/comando do treino e decide na mesma frequência (`repetir` ticks), segurando
a ação entre uma decisão e outra. Resultado determinístico (sem sorteio na ação).
"""
import json
import os

import observacao

MODELOS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "modelos")


class AgenteTreinado:
    def __init__(self, nome=None):
        import torch
        from stable_baselines3 import PPO
        torch.set_num_threads(1)                      # 1 processo por carro: não disputar CPU
        base = os.path.join(MODELOS, nome or os.environ.get("MODELO", "ultimo"))
        self.modelo = PPO.load(base, device="cpu")
        with open(base + ".json") as f:
            self.repetir = json.load(f)["repetir"]
        self.tick, self.acao = 0, [0.0, 0.0]

    def controlar(self, carro):
        if self.tick % self.repetir == 0:             # decide na frequência do treino
            obs = observacao.vetor(carro.retorno(), carro.tipo, carro.estado())
            self.acao, _ = self.modelo.predict(obs, deterministic=True)
        self.tick += 1
        carro.guiar(observacao.comando(self.acao))


def criar_agente(i):
    return AgenteTreinado()
