"""Processo de UM carro. Iniciado pelo Node (headless/ponte_py.js); não é para rodar à mão.

Protocolo (uma linha JSON por mensagem, stdin/stdout):
  Node -> {"init": {id, CARRO, SENSORES, RANGE, DT}}   Python -> {"pronto": true}
  a cada tick:
  Node -> {"dist": [...], "tipo": [...], "estado": {...}}   (a mesma `obs` do JS)
  Python -> {"aceleracao","frenagem","direcao"}  ou  null (agente não chamou guiar neste tick)
  erro   -> {"erro": "<traceback>"} e o processo termina.

Contrato do agente (arquivo .py): uma classe com `controlar(self, carro)`, chamada 1x por tick,
que usa carro.retorno() / carro.tipo / carro.estado() e termina com carro.guiar(...).
Alternativa no estilo do JS: `decidir(self, obs)` devolvendo o dict de comandos.
"""
import importlib.util
import json
import os
import sys
import traceback

canal = sys.stdout            # só o protocolo usa o stdout de verdade...
sys.stdout = sys.stderr       # ...print() do agente vai para o stderr e não corrompe nada
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import constantes  # noqa: E402
from carro import Carro  # noqa: E402


def enviar(obj):
    canal.write(json.dumps(obj, allow_nan=False) + "\n")   # NaN/inf quebrariam o JSON.parse do Node
    canal.flush()


def main():
    arquivo, classe = os.path.abspath(sys.argv[1]), sys.argv[2]
    init = json.loads(sys.stdin.readline())["init"]
    constantes.configurar(init)
    carro = Carro(init["id"])

    sys.path.insert(0, os.path.dirname(arquivo))           # o agente pode importar vizinhos
    spec = importlib.util.spec_from_file_location("agente_usuario", arquivo)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # --py-classe dado: Classe(); senão: criar_agente(i) do arquivo (equivale ao registro.js)
    agente = getattr(mod, classe)() if classe else mod.criar_agente(carro.id)
    enviar({"pronto": True})

    while True:
        linha = sys.stdin.readline()
        if not linha:                                       # Node fechou o stdin: fim
            return
        obs = json.loads(linha)
        carro._atualizar(obs)
        if hasattr(agente, "controlar"):
            agente.controlar(carro)
        else:
            carro.guiar(agente.decidir(obs))
        enviar(carro._cmd)


try:
    main()
except KeyboardInterrupt:
    sys.exit(130)
except Exception:
    try:
        enviar({"erro": traceback.format_exc()})
    finally:
        sys.exit(1)
