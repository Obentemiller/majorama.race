"""Recompensa do treino: EDITE AQUI os pesos para mudar o comportamento que o agente aprende.

Chamada uma vez por passo do ambiente (que agrupa `repetir` ticks de 1/60 s). Entradas, todas medidas
pelo simulador (o agente nunca as vê, só o treinador):
  ds       metros avançados ao longo da pista (negativo = andando para trás)
  fora     nº de ticks na grama
  contato  nº de ticks encostando em outro carro
  dpos     posições ganhas (+1 = ultrapassou um carro, -1 = foi ultrapassado)
  caiu     True no passo em que o episódio acaba por erro (grama demais / parado)

Dicas:
  - Só correr rápido sozinho: oponentes=0 e posicao=0.
  - Aprender a ultrapassar: oponentes>=1 e posicao alto. Como o ganho de posição soma zero no fim
    (ganhar e perder se cancelam), repetir o truque de ida e volta não rende pontos.
  - Mais cuidadoso: aumente `contato` e `fora`. Mais agressivo: diminua.
Para algo diferente, passe sua função: PistaEnv(recompensa=minha_funcao) com a mesma assinatura.
"""


class Recompensa:
    def __init__(self, progresso=0.1, fora=0.2, contato=0.5, posicao=2.0, queda=20.0):
        self.progresso, self.fora, self.contato, self.posicao, self.queda = progresso, fora, contato, posicao, queda

    def __call__(self, ds, fora, contato, dpos, caiu):
        """Devolve (total, partes) — `partes` aparece em info['recompensa'] para depurar."""
        partes = {"progresso": self.progresso * ds,        # ~0,1 por metro: uma volta (2258 m) ≈ 226
                  "fora": -self.fora * fora,
                  "contato": -self.contato * contato,
                  "posicao": self.posicao * dpos,
                  "queda": -self.queda if caiu else 0.0}
        return sum(partes.values()), partes
