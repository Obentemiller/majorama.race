# python/ — agentes em Python

A simulação continua em JS. O **controle** pode ser escrito em Python, com **um processo por carro** (paralelismo real, sem GIL), então cada agente pode usar numpy, torch, scipy etc. no seu próprio processo.

## Como funciona

A cada tick (60 Hz), o Node manda a `obs` de cada carro para o processo Python dele, **todos ao mesmo tempo**, espera os comandos e faz `carro.guiar(...)`. Depois roda `sim.passo()` normalmente. `src/` não foi alterado.

```
Node (sim.passo) ──obs──▶ py C1 ─┐
                 ──obs──▶ py C2 ─┼─ em paralelo ──comandos──▶ carro.guiar() ──▶ física
                 ──obs──▶ py C3 ─┘
```

## Interface (igual ao JS)

```python
class MeuAgente:
    def controlar(self, carro):        # 1x por tick, no processo deste carro
        d = carro.retorno()            # [d0..d7] em metros, um por SENSORES
        t = carro.tipo                 # 'pista' | 'carro' | None por raio
        e = carro.estado()             # dict: v, vx, vy, w, delta, lat, angRel, s, voltas, fora
        carro.guiar({"aceleracao": 1, "frenagem": 0, "direcao": 0})   # ou guiar(aceleracao=1)
```

- Mesmos nomes, faixas e sinais do JS (`direcao > 0` = direita; `angRel`, `lat` etc.). `carro.id` = índice do carro.
- Sem `guiar()` num tick, vale o último comando (como no JS com `agente = null`).
- Alternativa no estilo JS: `decidir(self, obs)` devolvendo o dict de comandos.
- `from constantes import SENSORES, CARRO, RANGE, DT, clamp`: os valores vêm **do JS** ao iniciar, então acompanham mudanças em `src/constantes.js`.
- O agente só enxerga o `carro` (regra 2 do `AGENTS.md`). Cada carro tem seu processo e sua instância: o estado em `self` é só dele.
- `print()` vai para o terminal (stderr) e não atrapalha a comunicação. Erros mostram o traceback e encerram a execução.
- Determinismo: sem `random` sem semente (`random.Random(42)` / `numpy.random.default_rng(42)`).

## Rodar

```bash
node headless/rodar.js --seg 120 --py python/agentes/reativo.py --carro todos     # todos em Python
node headless/rodar.js --seg 120 --py python/agentes/reativo.py --carro 0,3       # só C1 e C4 (os outros seguem em JS)
node headless/rodar.js --py python/agentes/modelo.py --py-classe AgenteModelo --carro 5
```

- Sem `--py-classe`, o arquivo precisa ter `criar_agente(i)` (equivale a `criarAgente(i)` do `registro.js`).
- Python: `python3` (ou `python` no Windows). Para outro executável/venv: `PYTHON=/caminho/python node ...`.
- `agentes/reativo.py` é um port 1:1 do `reativo.js`: o resultado sai **idêntico** ao do JS (conferido em 120 s, 6 carros).

## Arquivos

| Arquivo | Papel |
|---|---|
| `constantes.py` | espelho de `src/constantes.js` (sobrescrito pelo JS ao iniciar) |
| `carro.py` | `Carro`: `guiar`, `retorno`, `tipo`, `estado`, `id` |
| `trabalhador.py` | processo de um carro (iniciado pelo Node; não rode à mão) |
| `agentes/` | `reativo.py` (linha de base), `modelo.py` (esqueleto) |
| `../headless/ponte_py.js` | lado Node: inicia os processos e sincroniza os ticks |

## Treinar com aprendizado por reforço (RL)

O Python também pode **treinar**. `pista_env.py` expõe a pista como ambiente [Gymnasium](https://gymnasium.farama.org) (`reset`/`step`), então serve para qualquer biblioteca de RL. Aqui já vem pronto o PPO do stable-baselines3.

```bash
pip install -r python/requirements-rl.txt
python python/treinar.py --passos 1000000 --envs 4                 # treina (4 simulações em paralelo)
MODELO=ultimo node headless/rodar.js --seg 120 --py python/agentes/treinado.py --py-classe AgenteTreinado --carro 5
```

(no Windows, `set MODELO=ultimo` numa linha antes do `node`). O modelo fica em `python/modelos/`, e o **melhor** da avaliação (não o último) é o que vira `<nome>.zip`.

Receitas (`python python/treinar.py ...`):

| Objetivo | Flags |
|---|---|
| Dirigir rápido sozinho | `--oponentes 0 --largada aleatoria` |
| Largar em último e ultrapassar | `--oponentes 5` (e suba `posicao` em `recompensa.py`) |
| Continuar um treino | `--continuar --nome ultimo --passos 500000` |

| Arquivo | Papel |
|---|---|
| `pista_env.py` | `PistaEnv`: ambiente Gymnasium (Node faz a física, 1 processo por ambiente) |
| `observacao.py` | vetor de observação normalizado e ação `[pedal, direcao]`; usado no treino **e** no agente treinado |
| `recompensa.py` | **edite os pesos aqui** (progresso, grama, contato, posição, queda) |
| `treinar.py` | PPO em um comando, ambientes em paralelo, guarda o melhor modelo |
| `agentes/treinado.py` | `AgenteTreinado`: roda o modelo salvo pelo `--py`, com as métricas de sempre |
| `../headless/servidor.js` | servidor de física usado pelo `PistaEnv` |

Como usar o ambiente direto (ex.: com outra biblioteca):

```python
from pista_env import PistaEnv
env = PistaEnv(oponentes=0, largada="aleatoria")        # ver opções no docstring
obs, info = env.reset(seed=0)
obs, r, terminou, truncou, info = env.step([1.0, 0.0])  # [pedal, direcao]
```

O episódio **termina** por grama demais (`fora_max_seg`), ficar parado (`parado_max_seg`) ou completar `voltas`; e é **truncado** em `max_seg`. Cada passo = `repetir` ticks (padrão 3 → decide a 20 Hz).

Já vem um modelo de exemplo, `python/modelos/solo.zip`, treinado com `--passos 1000000 --oponentes 0 --largada aleatoria` (~14 min em 2 núcleos). Solo, 120 s: **melhor volta 69,7 s** e 0 % na grama, contra 91,4 s do reativo. Ele nunca viu outros carros, então **não sabe ultrapassar**: para isso treine com `--oponentes 5`.

Expectativas realistas: RL em pista precisa de **muitos passos** (da ordem de 1 milhão ou mais) e a curva de recompensa oscila. Use `--envs` perto do número de núcleos da CPU para treinar mais rápido, e compare sempre com a linha de base pelo `rodar.js`.

## Limitações

- No navegador não há PyTorch/stable-baselines3 (treine localmente e exporte para NumPy).
- Um tick só avança quando **todos** os carros respondem: o carro mais lento dita o ritmo. Em agentes muito leves o custo de comunicação domina (~2000 ticks/s com 6 carros).

## No navegador (Pyodide)

A janela **▤ Scripts** do `index.html` é um editor Python. O motor JS e o Pyodide rodam no **mesmo Worker** (`src/web/`), chamando-se de forma síncrona. Dois modos:

- **Agente** (corrida em tempo real): o mesmo contrato de sempre — classe com `controlar(self, carro)` ou `decidir(self, obs)` (ou `criar_agente(i)`). Escolha o carro (C1…C6 ou todos); os outros seguem o reativo JS. `python/agente_runner.py` faz a ponte (testado: resultado idêntico ao JS).
- **Script** (você conduz o tempo, como no treino): use `PistaEnv` — `reset()`/`step()` — e chame `env.render()` para a página desenhar (`render(tempo_real=True)` espera o relógio real). Pausa/velocidade valem só para o modo agente; **Parar** encerra o Worker.

Pacotes extras: 1ª linha `# pacotes: scipy, outro` (pacotes do Pyodide ou puros do PyPI via micropip). NumPy já vem. Não existem PyTorch nem subprocessos no navegador.

Exemplos (`exemplos/` e `agentes/`): `script_env.py` (piloto simples no `PistaEnv`), `busca_aleatoria.py` (busca aleatória de uma política linear, só NumPy), `treinado_numpy.py` (roda o modelo PPO exportado).

## Backends e o ambiente

`pista_env.py` não sabe *onde* a física roda: `backend.py` escolhe sozinho — `NodeBackend` (subprocesso `headless/servidor.js`) ou `JsBackend` (motor no Worker). Ambos falam o protocolo de `src/ambiente.js`. O `gymnasium` é opcional: sem ele (ex.: navegador) `PistaEnv` usa um mínimo equivalente; com ele (treino local) herda `gym.Env` normalmente.

## Exportar um modelo treinado para NumPy

```bash
python python/exportar_npz.py --nome solo          # python/modelos/solo.zip -> solo.npz (sem precisar do PyTorch)
node headless/rodar.js --carros 1 --py python/agentes/treinado_numpy.py --carro 0
```

Vale para o `MlpPolicy` padrão do PPO (como o `treinar.py` gera): 2 camadas ocultas com `tanh`, sem normalização de observação; ação = saída da rede cortada em [-1, 1]. Conferido: o `solo.npz` roda 120 s (1 carro) com melhor volta de 70,2 s e 0 % na grama; o README documenta 69,7 s para o modelo em PyTorch (diferença provavelmente de arredondamento em float32; não verificada contra o torch).
