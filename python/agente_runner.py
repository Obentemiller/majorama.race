"""Executa agentes Python no NAVEGADOR (Pyodide). O worker (src/web/worker.js) chama `iniciar` uma vez e
`passo` a cada tick, de forma síncrona. Mesmo contrato do trabalhador.py (Node): classe com
`controlar(self, carro)` ou `decidir(self, obs)`; o agente só enxerga o proxy `Carro` (carro.py)."""
import json

import constantes
from carro import Carro

_ag, _cr = {}, {}


def _escolher(ns, i):
    if "criar_agente" in ns:                                   # como o registro.js
        return ns["criar_agente"](i)
    cls = [v for v in ns.values() if isinstance(v, type) and v.__module__ == "agente_usuario"
           and (hasattr(v, "controlar") or hasattr(v, "decidir"))]
    if not cls:
        raise NameError("Defina uma classe com controlar(self, carro) ou decidir(self, obs), ou criar_agente(i).")
    return next((c for c in cls if c.__name__ == "Agente"), cls[0])()


def iniciar(codigo, carros_json, init_json):
    constantes.configurar(json.loads(init_json))               # valores do JS = fonte da verdade
    ns = {"__name__": "agente_usuario", "__file__": "/pa/agentes/agente_usuario.py"}
    exec(compile(codigo, "agente.py", "exec"), ns)
    _ag.clear()
    _cr.clear()
    for i in json.loads(carros_json):
        _ag[i], _cr[i] = _escolher(ns, i), Carro(i)


def passo(i, obs_json):
    obs, c, a = json.loads(obs_json), _cr[i], _ag[i]
    c._atualizar(obs)
    if hasattr(a, "controlar"):
        a.controlar(c)
    else:
        r = a.decidir(obs)
        c.guiar(r if isinstance(r, dict) else dict(zip(("aceleracao", "frenagem", "direcao"), r)))
    return json.dumps(c._cmd)                                  # "null" = não chamou guiar: mantém o último
