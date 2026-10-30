# src/web/ — Worker do navegador (motor JS + Pyodide)

Roda o **motor de simulação** e o **Python** (Pyodide) no **mesmo thread** de um Web Worker. Python chama o motor de forma síncrona (`from js import engine_cmd`, via `python/backend.py`), sem `postMessage` por tick: é determinístico e rápido, e a thread principal só desenha.

| Arquivo | Papel |
|---|---|
| `worker.js` | importa `src/*.js` (mesma ordem de `headless/carregar.js`), carrega o Pyodide e os arquivos de `python/` (lista em `python/manifest.json`), conduz a corrida ou roda o script |
| `ponte.js` | lado da página: `new PonteWeb({onquadro, onlog, onerro, onfim, onstatus, onpronto})`, `.msg(obj)`, `.encerrar()` |

## Modos

- **corrida:** o worker avança a simulação a 60 Hz × velocidade (no máx. 12 ms por quadro) e chama `agente_runner.passo(i, obs)` para cada carro Python a cada tick.
- **script:** `runPythonAsync(código)`; o script conduz (`PistaEnv`). `env.render()` → `engine_cmd('{"cmd":"render"}')` → quadro para a página.

## Mensagens

| Página → worker | Efeito |
|---|---|
| `{t:'corrida', codigo, pacotes, carros, n}` | inicia o modo corrida |
| `{t:'script', codigo, pacotes}` | roda o script |
| `{t:'pausa', v}` / `{t:'vel', v}` | só no modo corrida |
| `{t:'reiniciar'}` | reinicia a corrida (recarrega o agente) |

| Worker → página | Conteúdo |
|---|---|
| `status` / `pronto` | texto de progresso / pronto para rodar |
| `quadro` | `{tempo, carros:[[x,y,th,vx,vy,w,delta,lat,s,idx,ader,voltas,ult,melhor],…]}` |
| `log` / `erro` / `fim` | saída do Python (`print`), mensagem de erro, script terminou |

A página (`src/ui/python_ui.js`) **espelha** cada quadro nos carros locais; o desenho e os raios do carro em foco são recalculados localmente. **Parar** = `worker.terminate()` (única forma de interromper um script em laço).

## Limites e notas

- Pyodide vem do CDN jsDelivr, versão fixa (`PYODIDE` em `worker.js`); a 1ª carga leva 10–20 s e o navegador guarda em cache.
- Precisa de http(s): `fetch` dos arquivos Python e `new Worker` não funcionam em `file://`.
- Não foi testado em navegador real neste ambiente (sem acesso ao CDN): o Python e o motor foram validados no Node/CPython; o Worker, só com `node --check`.
