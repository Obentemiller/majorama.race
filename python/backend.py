"""Backends do ambiente: o MESMO protocolo JSON (ver src/ambiente.js) por dois caminhos.

  NodeBackend : subprocesso `node headless/servidor.js` (uso local, com PyTorch/stable-baselines3 etc.)
  JsBackend   : chamada direta ao motor JS no mesmo Worker do Pyodide (navegador / GitHub Pages)

`criar_backend()` escolhe sozinho: no navegador (sys.platform == 'emscripten') usa o JsBackend.
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = os.environ.get("NODE", "node")


def _checar(r):
    if "erro" in r:
        raise RuntimeError("motor JS: " + r["erro"])
    return r


class NodeBackend:
    def __init__(self):
        self.proc = subprocess.Popen([NODE, os.path.join(RAIZ, "headless", "servidor.js")], cwd=RAIZ,
                                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)

    def cmd(self, m):
        self.proc.stdin.write(json.dumps(m) + "\n")
        self.proc.stdin.flush()
        linha = self.proc.stdout.readline()
        if not linha:
            raise RuntimeError("o servidor Node terminou (rode `node headless/servidor.js` para ver o erro)")
        return _checar(json.loads(linha))

    def render(self):        # sem janela no Node: nada a desenhar
        pass

    def fechar(self):
        if self.proc.poll() is None:
            self.proc.stdin.close()
            self.proc.wait(timeout=5)
            self.proc.stdout.close()


class JsBackend:
    def __init__(self):
        from js import engine_cmd          # definido por src/web/worker.js
        self._f = engine_cmd

    def cmd(self, m):
        return _checar(json.loads(self._f(json.dumps(m))))

    def render(self):                      # manda um quadro para a página desenhar
        self._f('{"cmd":"render"}')

    def fechar(self):
        pass


def criar_backend():
    return JsBackend() if sys.platform == "emscripten" else NodeBackend()
