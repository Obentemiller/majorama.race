#!/usr/bin/env python3
"""Testes de regressão (sem pytest). Precisa de Node 18+ e NumPy:   python tests/rodar_testes.py

Valida o que dá para validar fora do navegador: protocolo do ambiente, Python == JS, modelo exportado e PistaEnv.
O Worker/Pyodide só pode ser testado no navegador (ver AGENTS.md)."""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "python"))
falhas = []


def node(*args, entrada=None):
    r = subprocess.run(["node", *args], cwd=RAIZ, input=entrada, capture_output=True, text=True, timeout=300)
    if r.returncode:
        raise RuntimeError(r.stderr[-600:])
    return r.stdout


def teste(nome):
    def deco(f):
        try:
            f()
            print("ok     ", nome)
        except Exception as e:                       # noqa: BLE001 - queremos listar todas as falhas
            falhas.append(nome)
            print("FALHOU ", nome, "->", e)
    return deco


@teste("manifest.json está atualizado (rode tools/gerar_manifesto.py)")
def _():
    p = os.path.join(RAIZ, "python", "manifest.json")
    antes = open(p).read()
    subprocess.run([sys.executable, os.path.join(RAIZ, "tools", "gerar_manifesto.py")], check=True, capture_output=True)
    depois = open(p).read()
    open(p, "w").write(antes)
    assert antes == depois, "manifest.json desatualizado"


@teste("servidor: info/reiniciar/passo determinísticos")
def _():
    cmds = [{"cmd": "info"}, {"cmd": "reiniciar", "n": 3, "carro": 2}] + \
           [{"cmd": "passo", "acao": {"aceleracao": 1, "frenagem": 0, "direcao": 0.1}, "ticks": 3}] * 50
    ent = "\n".join(json.dumps(c) for c in cmds) + "\n"
    a, b = node("headless/servidor.js", entrada=ent), node("headless/servidor.js", entrada=ent)
    assert a == b and '"erro"' not in a and len(a.splitlines()) == len(cmds)


@teste("agente Python (reativo.py) == agente JS, 6 carros, 60 s")
def _():
    js = json.loads(node("headless/rodar.js", "--seg", "60", "--json"))
    py = json.loads(node("headless/rodar.js", "--seg", "60", "--py", "python/agentes/reativo.py", "--carro", "todos", "--json"))
    assert js["carros"] == py["carros"]


@teste("modelo exportado (solo.npz): melhor volta ~70 s e 0 % na grama")
def _():
    r = json.loads(node("headless/rodar.js", "--carros", "1", "--seg", "120", "--py", "python/agentes/treinado_numpy.py", "--carro", "0", "--json"))["carros"][0]
    assert r["melhor_s"] and 69 <= r["melhor_s"] <= 71.5 and r["fora_pct"] == 0, r


@teste("PistaEnv: reset/step/render com o backend Node")
def _():
    from pista_env import PistaEnv
    env = PistaEnv(oponentes=2, max_seg=10)
    obs, _info = env.reset(seed=0)
    assert obs.shape == (23,)
    obs, r, te, tr, info = env.step([0.5, 0.0])
    env.render()
    env.close()
    assert obs.shape == (23,) and "pos" in info

if falhas:
    sys.exit(f"\n{len(falhas)} teste(s) falharam")
print("\ntodos os testes passaram")
