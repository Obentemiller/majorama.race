# AGENTS.md — Majorama.race: instruções para agentes de LLM

Leia primeiro: `README.md` → `src/README.md` → `src/agentes/README.md` (agentes em Python: `python/README.md`).

## Regras

1. **Não altere a física nem o carro ao comparar agentes.** `CARRO`, `SENSORES`, `PTS`, a largura da pista e `src/carro.js` são a "regra do jogo". Se precisar mudar, faça isso isolado, documente em `src/README.md` e reexecute a linha de base.
2. **Agentes só podem usar `obs`** (`dist`, `tipo`, `estado`). Proibido ler `sim`, `Sim`, outros carros ou a geometria da pista dentro de `decidir()` (seria trapaça: o agente real não tem esses dados).
3. **Determinismo.** Sem `Math.random`/`Date` no núcleo. Se o agente precisar de aleatoriedade, use um PRNG com semente fixa implementado no próprio arquivo.
4. **Scripts clássicos, sem módulos.** Não use `import`/`export`/`require` em `src/`. Os nomes de nível superior são globais compartilhados: não repita nomes (`class`, `const`, `function`).
5. **Ao criar um arquivo em `src/`**, adicione-o (na ordem correta) ao `index.html` **e** à lista `ORDEM` de `headless/carregar.js`. Arquivos de agente extra podem ser carregados só via `--agente`.
6. **Valide antes de concluir:** `python tests/rodar_testes.py` precisa passar (o CI do GitHub roda o mesmo). Além disso: `node headless/rodar.js --seg 120` precisa terminar sem erro, e a `fora_pct` e as voltas do agente alterado devem ser reportadas ao lado da linha de base.
7. Comentários e documentação em português (pt-BR); código compacto é aceitável, mas explique a matemática em comentário.

## Linha de base (agente reativo, 180 s, 6 carros)

~1 volta concluída por carro, melhor volta 92–104 s (pista de ~2258 m), `fora_pct` ≈ 0, ~40 trocas de posição. Compare seus resultados com isso.

## Interface (regras extras)

- O visual segue o **padrão Majorama UI** (`PADRAO.md`; kit em `vendor/majorama-ui/`, tema escuro único). **Não edite o kit aqui**: regras deste projeto vão em `css/app.css` e `src/ui/`. O sistema de ajuda (`? Ajuda`, `PASSOS` em `src/ui/ajuda.js`, `manual.md`) e o modo vertical para celular são obrigatórios. **Sem estilos inline** (`style="..."`) nem `onclick=` no HTML, e **sem `innerHTML` com dados de usuário/simulação**: use classes CSS ou CSSOM (`el.style.x = ...`). Isso mantém o projeto compatível com uma CSP `style-src 'self'`.
- Os scripts de `src/ui/` dependem dos `id` do `index.html` (lista em `src/ui/README.md`). Se renomear um `id`, ajuste os scripts e o `tests/ui_smoke.mjs`.
- Ao mudar a interface, rode `npm install --no-save jsdom && node tests/ui_smoke.mjs`. O teste não mede pixels (jsdom não faz layout): confira o visual no navegador.
- Textos do tutorial: `PASSOS` em `src/ui/tutorial.js`. Se mudar um controle, atualize o passo correspondente e o `manual.md`.

## Python no navegador (regras extras)

- Arquivos em `python/` que o navegador usa **não podem** importar torch, subprocess nem nada que o Pyodide não tenha. Se criar/remover arquivos em `python/`, rode `python tools/gerar_manifesto.py` e inclua o `manifest.json` no commit.
- A ordem de carga dos módulos de `src/` existe em **três** lugares: `index.html`, `ORDEM` em `headless/carregar.js` e `FONTES` em `src/web/worker.js`. Mantenha os três iguais.
- O protocolo `info/reiniciar/passo/estado` mora só em `src/ambiente.js`; `servidor.js` e `worker.js` apenas o transportam. Não duplique lógica neles.
- Não dá para testar Pyodide/Worker no Node: valide a parte Python com `node headless/rodar.js --py ...` e a parte JS com `node --check`; o Worker só no navegador.

## Tarefas típicas

- *Novo agente:* `src/agentes/modelo.js` → copiar → `headless/rodar.js --agente`.
- *Agente em Python:* `python/agentes/modelo.py` → copiar → `node headless/rodar.js --py python/agentes/seu.py --py-classe SuaClasse --carro 0`. Valem as mesmas regras 2 e 3 (só `carro.retorno()/tipo/estado()`; aleatoriedade só com semente). Não altere `src/` para isso.
- *Treinar com RL em Python:* `python python/treinar.py` (ver `python/README.md`); mexa na recompensa só em `python/recompensa.py`, e compare com a linha de base via `rodar.js`.
- *Treinar (RL/evolução) em JS:* usar `headless/carregar.js` em Node; `sim.passo()` não depende de DOM. Observação = `obs`; ação = `guiar`. Ver sugestões em `src/agentes/README.md`.
- *Nova pista:* trocar `PTS` e/ou largura em `Simulacao` (pontos em metros, curva fechada; raio mínimo da linha central > metade da largura).
- *Mudança visual:* só em `src/ui/`.
