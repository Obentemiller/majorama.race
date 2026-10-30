"""Carro visto pelo agente Python: a MESMA interface do Carro em src/carro.js.

    carro.guiar({"aceleracao": 0..1, "frenagem": 0..1, "direcao": -1..1})   (direcao > 0 = direita)
    carro.retorno()  -> lista de distâncias (m), uma por sensor, em SENSORES
    carro.tipo[i]    -> 'pista' | 'carro' | None (o que cada raio acertou; None = nada até RANGE)
    carro.estado()   -> dict {v, vx, vy, w, delta, lat, angRel, s, voltas, fora}
    carro.id         -> índice do carro (0 = pole)

É só um proxy: o agente NÃO enxerga `sim`, a pista nem outros carros (regra 2 do AGENTS.md).
Os dados do tick chegam do Node; o comando sai de volta para ele.
"""
from constantes import clamp


class Carro:
    def __init__(self, id):
        self.id = id
        self.tipo = []
        self._obs = None
        self._cmd = None

    def _atualizar(self, obs):
        """Chamado pelo trabalhador a cada tick (60 Hz) com {dist, tipo, estado}."""
        self._obs = obs
        self.tipo = obs["tipo"]
        self._cmd = None          # sem guiar() neste tick = o JS mantém o último comando (igual ao JS)

    def retorno(self):
        return list(self._obs["dist"])        # cópia, como no JS

    def estado(self):
        return dict(self._obs["estado"])      # objeto novo a cada chamada, como no JS

    def guiar(self, cmd=None, **kw):
        """Aceita dict (como no JS) ou argumentos nomeados: guiar(aceleracao=1, direcao=-0.2).
        Campos ausentes valem 0; valores são cortados nas mesmas faixas do JS."""
        c = {**(cmd or {}), **kw}
        self._cmd = {                           # float(): aceita numpy/torch escalares
            "aceleracao": float(clamp(c.get("aceleracao", 0), 0, 1)),
            "frenagem": float(clamp(c.get("frenagem", 0), 0, 1)),
            "direcao": float(clamp(c.get("direcao", 0), -1, 1)),
        }
