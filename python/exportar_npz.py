#!/usr/bin/env python3
"""Converte um modelo PPO do stable-baselines3 (python/modelos/<nome>.zip) para NumPy (<nome>.npz),
SEM precisar do PyTorch. O .npz roda no navegador (agentes/treinado_numpy.py).

    python python/exportar_npz.py --nome solo

Só vale para o MlpPolicy padrão do PPO (2 camadas ocultas, tanh, sem normalização de observação) — o que o
treinar.py gera. Ação determinística = saída da rede cortada em [-1, 1]."""
import argparse
import collections
import io
import json
import os
import pickle
import zipfile

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))


def _rebuild(armazem, off, size, stride, *_):
    n = int(np.prod(size)) if len(size) else 1
    esperado = tuple(int(np.prod(size[i + 1:])) for i in range(len(size)))
    assert tuple(stride) == esperado, "tensor não contíguo"
    return armazem[off:off + n].reshape(size).astype(np.float32)


class _U(pickle.Unpickler):
    def __init__(self, f, z, pre):
        super().__init__(f)
        self.z, self.pre = z, pre

    def find_class(self, mod, name):
        if name == "_rebuild_tensor_v2":
            return _rebuild
        if name == "OrderedDict":
            return collections.OrderedDict
        if name.endswith("Storage"):
            return name
        return super().find_class(mod, name)

    def persistent_load(self, pid):
        _, tipo, chave = pid[:3]
        return np.frombuffer(self.z.read(f"{self.pre}data/{chave}"), dtype={"FloatStorage": "<f4", "DoubleStorage": "<f8"}[tipo])


def pesos(caminho_zip):
    pth = zipfile.ZipFile(io.BytesIO(zipfile.ZipFile(caminho_zip).read("policy.pth")))
    pk = next(n for n in pth.namelist() if n.endswith("data.pkl"))
    return _U(io.BytesIO(pth.read(pk)), pth, pk[:-len("data.pkl")]).load()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nome", default="ultimo")
    a = ap.parse_args()
    base = os.path.join(AQUI, "modelos", a.nome)
    w = pesos(base + ".zip")
    p = "mlp_extractor.policy_net."
    saida = dict(W1=w[p + "0.weight"], b1=w[p + "0.bias"], W2=w[p + "2.weight"], b2=w[p + "2.bias"],
                 W3=w["action_net.weight"], b3=w["action_net.bias"])
    with open(base + ".json") as f:
        saida["repetir"] = np.array(json.load(f)["repetir"])
    np.savez_compressed(base + ".npz", **saida)
    print(f"{base}.npz:", {k: v.shape for k, v in saida.items()})


if __name__ == "__main__":
    main()
