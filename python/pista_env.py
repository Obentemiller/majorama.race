"""PistaEnv: a pista como ambiente Gymnasium (reset/step), pronto para qualquer biblioteca de RL.

    env = PistaEnv(oponentes=5)                 # o agente é o último carro da grade; os outros são o reativo (JS)
    obs, info = env.reset(seed=0)
    obs, r, terminou, truncou, info = env.step(env.action_space.sample())

A física roda no motor JS (Node local ou Worker do navegador; ver backend.py); o Python decide. Vários ambientes
em paralelo = várias simulações em paralelo (ex.: SubprocVecEnv do stable-baselines3).
Observação/ação: ver observacao.py. Recompensa: ver recompensa.py.
"""
import time
import types

import numpy as np

import constantes
import observacao
from backend import criar_backend
from recompensa import Recompensa

try:
    import gymnasium as gym
    from gymnasium import spaces
except ImportError:      # ex.: navegador (Pyodide) sem gymnasium: mínimo necessário para o ambiente funcionar
    class _Env:
        def reset(self, *, seed=None, options=None):
            if seed is not None or not hasattr(self, "np_random"):
                self.np_random = np.random.default_rng(seed)

    class _Box:
        def __init__(self, low, high, shape, dtype=np.float32):
            self.low, self.high, self.shape, self.dtype = low, high, shape, dtype

        def sample(self):
            return np.random.uniform(self.low, self.high, self.shape).astype(self.dtype)

    gym, spaces = types.SimpleNamespace(Env=_Env), types.SimpleNamespace(Box=_Box)


class PistaEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(self, oponentes=5, carro=None, repetir=3, max_seg=60, voltas=None,
                 fora_max_seg=3, parado_max_seg=5, largada="grade", recompensa=None, backend=None):
        """oponentes: carros do reativo JS na pista (0 = sozinho). carro: índice do agente (padrão: último).
        repetir: ticks (1/60 s) por passo; 3 = decide a 20 Hz. max_seg: tempo máximo do episódio.
        voltas: termina com sucesso ao completar N voltas (None = só pelo tempo).
        fora_max_seg / parado_max_seg: termina com erro se ficar tanto tempo na grama / parado.
        largada: 'grade' (largada normal) ou 'aleatoria' (posição/velocidade sorteadas no reset).
        backend: quem roda a física (padrão: automático — Node local ou motor JS no navegador; ver backend.py)."""
        self.n = oponentes + 1
        self.k = self.n - 1 if carro is None else carro
        self.repetir, self.max_seg, self.voltas = repetir, max_seg, voltas
        self.fora_max, self.parado_max, self.largada = fora_max_seg, parado_max_seg, largada
        self.recompensa = recompensa or Recompensa()
        self.backend = backend or criar_backend()
        info = self._cmd({"cmd": "info"})
        constantes.configurar(info)                # constantes do JS (fonte da verdade)
        self.len = info["len"]
        self.observation_space = spaces.Box(-10.0, 10.0, (observacao.tamanho(),), np.float32)   # valores normalizados ficam bem dentro disso
        self.action_space = spaces.Box(-1.0, 1.0, (2,), np.float32)   # [pedal, direcao]

    def _cmd(self, m):
        return self.backend.cmd(m)

    def _vetor(self, r):
        o = r["obs"]
        return observacao.vetor(o["dist"], o["tipo"], o["estado"])

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)                   # self.np_random: aleatoriedade com semente
        pos = None
        if self.largada == "aleatoria":            # carros em fila a partir de um ponto sorteado, o agente atrás
            s0, v0 = self.np_random.uniform(0, self.len - 100), self.np_random.uniform(8, 20)
            pos = [{"i": i, "s": float(s0 + 14 * (self.n - 1 - i)),      # 14 m entre carros; índice maior = mais atrás
                    "lat": float(self.np_random.uniform(-4, 4)), "v": float(v0)} for i in range(self.n)]
        r = self._cmd({"cmd": "reiniciar", "n": self.n, "carro": self.k, "posicoes": pos})
        self.pos, self.fora_cont, self.parado_cont, self.ultimo = r["pos"], 0.0, 0.0, r
        return self._vetor(r), {"pos": r["pos"], "prog": 0.0}

    def step(self, acao):
        a = np.clip(np.asarray(acao, dtype=np.float64), -1, 1)
        r = self._cmd({"cmd": "passo", "acao": observacao.comando(a), "ticks": self.repetir})
        dt = self.repetir * constantes.DT
        # grama/parado seguidos: contam segundos; qualquer folga zera
        self.fora_cont = self.fora_cont + dt if r["fora"] == self.repetir else 0.0
        parado = r["v"] < 1 and r["t"] > 3         # 3 s de carência (a largada parte do zero)
        self.parado_cont = self.parado_cont + dt if parado else 0.0
        caiu = self.fora_cont >= self.fora_max or self.parado_cont >= self.parado_max
        sucesso = self.voltas is not None and r["prog"] >= self.voltas * self.len
        dpos = self.pos - r["pos"]
        recomp, partes = self.recompensa(r["ds"], r["fora"], r["contato"], dpos, caiu)
        self.pos, self.ultimo = r["pos"], r
        terminou = caiu or sucesso
        truncou = (not terminou) and r["t"] >= self.max_seg
        info = {"pos": r["pos"], "prog": r["prog"], "t": r["t"], "recompensa": partes, "sucesso": sucesso}
        return self._vetor(r), float(recomp), terminou, truncou, info

    def render(self, tempo_real=False):
        """No navegador, desenha o estado atual na página (no Node não faz nada).
        tempo_real=True espera até o relógio real alcançar o tempo simulado (para assistir em velocidade normal)."""
        if tempo_real:
            agora = time.perf_counter()
            if not hasattr(self, "_w0") or self.ultimo["t"] < getattr(self, "_t_ant", 0):
                self._w0 = agora - self.ultimo["t"]
            self._t_ant = self.ultimo["t"]
            while time.perf_counter() - self._w0 < self.ultimo["t"]:
                pass
        self.backend.render()

    def close(self):
        self.backend.fechar()
