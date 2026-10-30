# Padrão Majorama UI

Padrão visual e de experiência para **todo projeto Majorama que abre no navegador** (playgrounds, simuladores, ferramentas). Derivado do Pixela Terminal. O kit (`vendor/majorama-ui/`) implementa tudo isto; novos projetos partem do `template/`.

## 1. Identidade
- Nome: **Majorama.\<nome\>** (ex.: Majorama.race). Logotipo de texto `▓▒░ MAJORAMA.nome // Subtítulo`.
- **Tema escuro único** (sem modo claro). Paleta em variáveis CSS: `--bg-0 #0b0d10`, `--bg-1 #111418`, `--bg-2 #181c22`, `--line #262b33`, `--fg #d7e0ea`, `--fg-dim #7c8a9c`, `--accent #4be3a1` (ação/ok), `--accent-2 #5fb3ff` (foco/seleção), `--warn #ffb454`, `--err #ff6b6b`.
- Tipografia monoespaçada (JetBrains Mono → Fira Code → Cascadia → `ui-monospace`). Sem fontes externas, sem imagens obrigatórias.
- Cores com significado: verde = executar/ok · vermelho = parar/erro · âmbar = ajuda/aviso · azul = seleção/ativo (`aria-pressed="true"`).

## 2. Estrutura da tela
`topbar` (marca + controles) → `workspace` (palco principal `#terminal-pane` + divisor `#splitter` + painel lateral `#editor-pane`) → `status-bar` dentro do palco → `footer` (descrição, **Manual**, link do GitHub).
- O painel lateral abre/fecha (`#bY`, `#closeEditor`), redimensiona arrastando o divisor, com **limites** que protegem o palco (padrão: painel ≥ 260 px, palco ≥ 320 px). Teclado: setas / Shift / Home / End; duplo clique restaura.
- Estado (aberto + tamanhos) salvo em `localStorage`. Redimensionar a janela do navegador não altera a preferência salva.

## 3. Modo vertical (celular em pé) — obrigatório
Ativa em `(max-width: 640px), (orientation: portrait) and (max-width: 860px)`:
- **Topo:** só a marca. **Palco** no meio. **Gaveta** (painel lateral) abaixo do palco; o divisor vira uma alça grossa de 22 px que se arrasta com o dedo (altura). **Dock** fixa no rodapé com botões grandes (≥ 48 px) em "ícone em cima, rótulo embaixo": ação principal, painel, ajuda.
- Botão **⤢** na gaveta a maximiza (editar com o teclado aberto) e restaura.
- Controles que não cabem na dock mudam de lugar com `data-mobile-slot="id-do-destino"` (ex.: o seletor de exemplos vai para a gaveta).
- Rodapé oculto no vertical (o link do manual fica no último passo da ajuda). Celular deitado: layout lado a lado compacto (sem rodapé).
- Respeitar `safe-area-inset`, `100dvh` (teclado virtual), `touch-action`, `overscroll-behavior:none`. Nada pode depender de hover.

## 4. Sistema de ajuda — obrigatório em todo projeto
O que o torna o padrão:
1. Botão **`? Ajuda`** sempre visível (topbar no desktop, dock no celular) que inicia um **tutorial guiado**: fundo escurecido, **destaque** do elemento explicado e um **cartão** com título, texto, posição `n / total`, **← Anterior / Próximo → / ✕**.
2. **Passos** são dados (`PASSOS`): `{alvo:'#seletor'|null, titulo, texto, abrir?, link?}`. Primeiro passo apresenta o projeto; último é "Pronto! 🏁" com **link para o Manual**.
3. O tutorial **abre sozinho** painéis fechados quando precisa (`abrir:true`), **pula** passos cujo alvo não está visível e, ao terminar, **devolve** o layout ao estado anterior.
4. Teclado: → / Enter avança · ← volta · **Esc** sai · Tab fica preso no cartão. O cartão se posiciona abaixo/acima do alvo e nunca sai da tela.
5. **Manual completo** em `manual.md` (tela, uso, exemplos, problemas comuns, limites), linkado no rodapé e no último passo.
6. **Dica de primeira visita** no console/status: "Primeira vez? Toque em ? Ajuda".
7. Mudou um controle? **Atualize o passo e o manual no mesmo commit.**

## 5. Regras técnicas
- Sem dependências, sem build; abre no GitHub Pages. Scripts clássicos, sem módulos.
- **Sem estilos inline** (`style="…"`) nem `onclick=`; cores dinâmicas via CSSOM (`el.style.color=…`). **Sem `innerHTML` com dados de usuário** (textos fixos do projeto são permitidos nos passos).
- `localStorage`/`sessionStorage` sempre em `try/catch`. Funcionar em iframe sem storage.
- Acessibilidade: `aria-pressed` nos alternadores, `role="separator"` no divisor, `role="dialog" aria-modal` na ajuda, `role="log"` no console, foco visível.
- Pixels de toque ≥ 44 px no vertical; fontes ≥ 11 px.

## 6. Testes
`tests/ui_smoke.mjs` (jsdom) deve cobrir: página carrega sem erros, abrir/fechar painel, arrastar com limites, teclado, modo vertical (slots + maximizar), tutorial completo (abre painel, restaura, pula alvo oculto, Esc). jsdom não mede pixels: **confira o visual no navegador** (largo, celular em pé e deitado).

## 7. Novo projeto — checklist
1. Copie `vendor/majorama-ui/` e os arquivos de `template/` (`index.html`, `app.css`, `app.js`, `manual.md`, `AGENTS.md`, `tests/ui_smoke.mjs`).
2. Troque NOME/USUARIO/REPO; escreva o palco e o painel; mantenha os ids.
3. Escreva `PASSOS` e o `manual.md`. 4. Rode os testes. 5. Publique (Pages: branch `main`, pasta `/`).
