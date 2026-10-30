"""Agente reativo (linha de base) — port 1:1 de src/agentes/reativo.js para a API Python.
Mesma matemática (ver src/agentes/README.md): velocidade alvo pela visibilidade, pure pursuit + PD,
ultrapassagem heurística e recuperação na grama."""
import math

from constantes import CARRO, SENSORES, clamp


class AgenteReativo:
    def __init__(self, vmax=45, freio=6):
        self.vmax, self.freio, self.lado = vmax, freio, 0

    def controlar(self, carro):
        d, tipo, e = carro.retorno(), carro.tipo, carro.estado()
        v = e["v"]
        sw = sa = dm = 0.0
        for i in range(1, 6):                      # 5 raios frontais, peso d³ (mira na abertura)
            k = d[i] ** 3
            sw += k
            sa += k * SENSORES[i] * math.pi / 180
            dm = max(dm, d[i])
        al = sa / sw
        Ld = max(8, .7 * v)
        sn = abs(math.sin(al))
        vt = min(self.vmax, 8 + math.sqrt(2 * self.freio * max(0, dm - 8)))   # v² = 2·a·d
        if sn > .03:
            vt = min(vt, math.sqrt(9 * Ld / (2 * sn)))                         # limite de aceleração lateral
        # ultrapassagem: se há carro à frente, escolhe o lado mais livre e mantém até passar
        bloq = any(tipo[i] == "carro" and d[i] < 35 for i in (2, 3, 4))
        ao = tipo[0] == "carro" or tipo[6] == "carro"
        if bloq and not self.lado:
            self.lado = 1 if d[6] > d[0] else -1
        elif not bloq and not ao:
            self.lado = 0
        if e["fora"]:
            dir = clamp(2 * (-clamp(e["lat"] * .1, -.8, .8) - e["angRel"]), -1, 1)
            vt = min(vt, 10)
        else:
            vv = max(v, 8)
            pp = math.atan(5.4 * math.sin(al) / Ld)
            ce = -(1.7 / (vv * vv) * (e["lat"] - self.lado * 4.5) + 3.5 / vv * e["angRel"])
            dir = clamp((pp + ce) / CARRO.dmax, -1, 1)
        er = vt - v
        carro.guiar({"aceleracao": clamp(er / 4, 0, 1) * (1 - .5 * abs(dir)),
                     "frenagem": clamp(-er / 4, 0, 1),
                     "direcao": dir})


VMAX = [38, 41, 43, 45, 47, 50]   # mesmos perfis de registro.js: os mais rápidos largam atrás


def criar_agente(i):
    """Equivale a criarAgente(i) de src/agentes/registro.js: qual agente controla o carro i."""
    return AgenteReativo(vmax=VMAX[i % 6], freio=5 + .3 * (i % 6))
