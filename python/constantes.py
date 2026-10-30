"""Espelho de src/constantes.js para os agentes Python.

Os valores abaixo são só padrões: ao iniciar, o Node envia os valores reais do JS
(`configurar`), que são a fonte da verdade. Assim, se alguém mudar `SENSORES` ou
`CARRO` no JS, o Python acompanha sozinho. `SENSORES` e `CARRO` são alterados *no lugar*, então
`from constantes import SENSORES, CARRO` funciona em qualquer ordem. `RANGE` e `DT` são números: se
importar antes de `configurar`, use `import constantes` e leia `constantes.RANGE`.
"""
from types import SimpleNamespace

DT = 1 / 60
RANGE = 150
CARRO = SimpleNamespace(L=4.5, W=1.9, m=1500, Iz=2500, a=1.3, b=1.4, mu=1.5, k=8,
                        Pmax=150e3, Fmax=9000, Fbrk=16000, CdA=0.6, dmax=0.5, dRate=2.5)
# graus, 0 = frente, + = direita (índice i de dist/tipo = SENSORES[i])
SENSORES = [-90, -45, -20, 0, 20, 45, 90, 180]


def clamp(x, a, b):
    return max(a, min(b, x))


def configurar(init):
    """Sobrescreve os padrões com os valores do JS (chamado pelo trabalhador.py)."""
    global DT, RANGE
    DT, RANGE = init["DT"], init["RANGE"]
    SENSORES[:] = init["SENSORES"]
    CARRO.__dict__.update(init["CARRO"])
