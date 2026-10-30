#!/usr/bin/env python3
"""Gera python/manifest.json: a lista de arquivos que o navegador baixa para dentro do Pyodide.
Rode sempre que criar/remover um arquivo em python/ (e antes do commit):   python tools/gerar_manifesto.py
Entram .py e .npz; ficam de fora o que usa PyTorch/subprocessos (treinar, trabalhador, exportar_npz)."""
import json
import os

RAIZ = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "python")
FORA = {"treinar.py", "trabalhador.py", "exportar_npz.py", "treinado.py"}
arqs = sorted(os.path.relpath(os.path.join(r, f), RAIZ).replace(os.sep, "/")
              for r, _, fs in os.walk(RAIZ) if "__pycache__" not in r
              for f in fs if f.endswith((".py", ".npz")) and f not in FORA)
with open(os.path.join(RAIZ, "manifest.json"), "w") as f:
    json.dump({"arquivos": arqs}, f, indent=1)
print(len(arqs), "arquivos:", ", ".join(arqs))
