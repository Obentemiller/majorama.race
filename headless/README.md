# headless/ — simulação sem tela

Executa o mesmo núcleo de `src/` no Node (18+), sem navegador, na velocidade que a CPU permitir.

- `carregar.js`: lê os arquivos de `src/` na ordem (`ORDEM`) com `vm.runInThisContext` e devolve `{Simulacao, Pista, Carro, AgenteReativo, CARRO, SENSORES, DT, RANGE, clamp}`. Mantenha `ORDEM` igual à ordem de `<script>` do `index.html`.
- `rodar.js`: roda `--seg` segundos e imprime métricas.
- `servidor.js`: servidor de física para treino por RL (usado por `python/pista_env.py`; protocolo no cabeçalho do arquivo).
- `ponte_py.js`: `PontePy`, controla carros com agentes Python (um processo por carro, ticks sincronizados). Não altera `src/`.

## Uso

```bash
node headless/rodar.js --seg 120                        # 6 carros, agentes reativos
node headless/rodar.js --seg 120 --json                 # saída JSON (para scripts/LLMs)
node headless/rodar.js --agente src/agentes/modelo.js --classe AgenteModelo --carro 5
```

| Flag | Padrão | Efeito |
|---|---|---|
| `--seg` | 120 | tempo simulado |
| `--carros` | 6 | número de carros |
| `--agente` | — | arquivo com a classe do seu agente |
| `--classe` | — | nome da classe dentro do arquivo |
| `--carro` | 0 | índice do carro que recebe o seu agente |
| `--json` | — | saída em JSON |
| `--py` | — | arquivo `.py` com o agente em Python (1 processo por carro; ver `python/README.md`) |
| `--py-classe` | — | classe do agente; sem ela usa `criar_agente(i)` do arquivo |

`--carro` aceita lista (`0,2,5`) ou `todos`; com `--py`, esses carros usam Python.

## Métricas

`voltas`, `melhor_s` (melhor volta), `vmed_kmh`, `vmax_kmh`, `fora_pct` (% do tempo na grama) e, no total, `ultrapassagens` = trocas de ordem entre pares de carros, amostradas a cada 0,5 s (inclui as da largada).

## Usar como biblioteca (treino)

```js
const {carregar}=require('./headless/carregar'); const L=carregar();
const sim=new L.Simulacao(6);
const c=sim.carros[0]; c.agente=null;                 // você mesmo comanda:
for(let t=0;t<6000;t++){ const d=c.retorno(); c.guiar({aceleracao:1,frenagem:0,direcao:0}); sim.passo(); }
```
Com `agente=null` o carro usa o último `guiar()`; os demais carros seguem seus agentes. Use `sim.reiniciar()` entre episódios.
