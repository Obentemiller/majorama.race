# Majorama.race

> Playground de agentes de corrida da família **Majorama**.
>
> **The project is uploaded on GitHub Pages, so just click the link and enjoy! : https://obentemiller.github.io/majorama.race/**


Simulador de corrida **vista de cima (2D)** para estudar e desenvolver agentes de corrida capazes de ser rápidos e **ultrapassar**. O carro é fixo e pré-definido, a física é dinâmica (Newton), e o agente interage por uma interface mínima:

- **atua** com `carro.guiar({aceleracao, frenagem, direcao})`
- **percebe** com `carro.retorno()` → distâncias de raios que saem do carro até o limite da pista ou outro carro

Sem build e sem backend: roda **estático no GitHub Pages** e na máquina de quem abre. Os agentes podem ser escritos em **JavaScript** ou em **Python** (Pyodide + NumPy no navegador, ou Python local com PyTorch para treinar).

## Como rodar

| Modo | Comando |
|---|---|
| Navegador (visual, agentes JS) | abrir `index.html` (duplo clique funciona; o modo Python exige http) |
| Sem tela, acelerado, com métricas | `node headless/rodar.js --seg 120` (Node 18+) |
| **Agentes em Python no navegador** | janela **▤ Scripts** em `index.html` (botão **? Ajuda** = tutorial; ver `manual.md`) (precisa de internet na 1ª vez e de http: GitHub Pages ou `python -m http.server`) |
| Agentes em Python (local) | `node headless/rodar.js --seg 120 --py python/agentes/reativo.py --carro todos` (+ Python 3.8+) |

## Estrutura

| Pasta/arquivo | Conteúdo | README |
|---|---|---|
| `index.html` | casca da página; carrega os scripts em ordem | — |
| `src/` | núcleo: pista, carro (física + sensores), simulação | `src/README.md` |
| `src/agentes/` | agentes (reativo, humano, modelo) e registro | `src/agentes/README.md` |
| `src/ui/` | renderização no canvas, botões, HUD | `src/ui/README.md` |
| `headless/` | execução no Node e métricas | `headless/README.md` |
| `src/web/` | Worker do navegador: motor JS + Pyodide no mesmo thread | `src/web/README.md` |
| `python/` | agentes e ambiente em Python (navegador **e** local), treino por reforço (Gymnasium + PPO) | `python/README.md` |
| `tools/` | `gerar_manifesto.py` (lista de arquivos Python que o navegador baixa) | — |
| `vendor/majorama-ui/` | **kit Majorama UI** (estilo do Pixela Terminal, painel lateral redimensionável, modo vertical para celular, sistema de ajuda); não editar aqui | `PADRAO.md` |
| `css/app.css` | regras de estilo só deste projeto (canvas, HUD, controles de toque) | `src/ui/README.md` |
| `PADRAO.md` | o padrão Majorama UI que este projeto segue | — |
| `manual.md` | manual de uso (também linkado no rodapé do site); o botão **? Ajuda** abre um tutorial guiado | — |
| `tests/` | `rodar_testes.py` (Python: protocolo, Python == JS, modelo exportado) e `ui_smoke.mjs` (interface em jsdom: layout, tutorial, ponte com o Worker); ambos rodam no CI (`.github/workflows/ci.yml`) | — |
| `AGENTS.md` | regras para agentes de LLM que editam o projeto | — |

## Os dois caminhos do Python (mesmo script)

| | Navegador (Pages) | Local (Node + Python) |
|---|---|---|
| Motor JS | no Worker, junto do Pyodide | `headless/servidor.js` (subprocesso) |
| Python | Pyodide: NumPy (scipy etc. via `# pacotes:`) | seu Python: PyTorch, stable-baselines3… |
| Serve para | brincar, ensinar, rodar modelos prontos | treinar pesado |
| Ponte | `python/backend.py` → `JsBackend` | `python/backend.py` → `NodeBackend` |

Treine localmente (`python/treinar.py`), exporte com `python/exportar_npz.py` e rode no navegador com `agentes/treinado_numpy.py`.

## Convenções (valem em todo o projeto)

- Unidades SI: metros, segundos, kg, N, rad.
- Eixos de tela: **x → direita, y → para baixo**. Ângulo `th` = 0 aponta para +x e **cresce no sentido horário na tela**.
- `direcao` > 0 = **direita**; ângulo de sensor > 0 = **direita**; `lat` > 0 = carro à **direita** da linha central.
- Física a 60 Hz, determinística (nenhum `Math.random` no núcleo).

## Fluxo de trabalho recomendado

1. Copie `src/agentes/modelo.js`, implemente `decidir(obs)`.
2. Teste sem tela: `node headless/rodar.js --agente src/agentes/seu.js --classe SuaClasse --carro 0 --seg 120`.
3. Compare as métricas (volta, velocidade, % fora da pista, trocas de posição) com a linha de base.
4. Veja no navegador: registre o agente em `src/agentes/registro.js` e inclua o `<script>` no `index.html`.

## Limitações conhecidas

Sem transferência de peso; colisão simplificada (impulso entre retângulos, massas iguais, torque aproximado); o agente reativo de exemplo tem ganhos escolhidos à mão (não é ótimo); só uma pista.
