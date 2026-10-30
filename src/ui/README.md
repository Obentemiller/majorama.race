# src/ui/ — interface

`render.js` é a única parte que usa DOM/canvas. O núcleo não depende dela.

- Cria `const sim = new Simulacao(6)` e expõe `window.Sim = sim` (útil no console: `Sim.carros[0].estado()`).
- Laço `requestAnimationFrame`: acumula tempo real × velocidade e chama `sim.passo()` quantas vezes couber (até 600 por quadro) — o passo físico é sempre 1/60 s, independente da taxa de quadros.
- `desenhar()`: terreno, asfalto (`Pista.rd`, preenchimento `evenodd`), limites, linha de largada, raios do carro em foco, carros.
- **Vista geral:** os carros são desenhados no tamanho real; como ficam minúsculos, um pequeno marcador colorido (raio fixo em pixels) ajuda a localizá-los. Marcadores vizinhos podem se tocar na tela sem que os carros se toquem — use a câmera de carro para ver o tamanho real. **Câmera de carro:** ~60 m de largura de tela, segue o carro em foco.
- Cores dos raios: verde-água = pista, vermelho = outro carro, cinza = sem obstáculo no alcance.
- HUD (texto, a cada 8 quadros): posição, velocidade, voltas, última volta, "grama".

## Controles

Pausa, Reiniciar, Raios on/off, Câmera (pista/carro), Foco (próximo carro), velocidade ×1/×4/×16, Humano on/off.
Humano controla o **carro 1**: setas ou WASD; na tela de toque aparecem botões ◀ ▶ ▲ ▼. Ao ativar, a câmera segue o carro 1.

## Como alterar

- Trocar cores/tamanhos: `desenhar()`. Novos botões: `index.html` (barra `#bar`) + `onclick` em `render.js`.
- Não coloque lógica de simulação aqui. Não use `localStorage` se for publicar como artefato.

## Interface (padrão Majorama UI)

O visual e o comportamento geral vêm do **kit** (`vendor/majorama-ui/`, descrito em `PADRAO.md`); aqui ficam só as partes do projeto.

| Arquivo | Papel |
|---|---|
| `vendor/majorama-ui/majorama-ui.css` | paleta (`--bg-0…--accent`), topbar, painéis, divisor, tutorial, **modo vertical** (celular em pé) |
| `vendor/majorama-ui/majorama-ui.js` | `MajoramaUI.iniciar({passos})`: layout do painel lateral (abrir/fechar/redimensionar/maximizar) + sistema de ajuda |
| `css/app.css` | só o que é do projeto: `#cv`, `#hud`, `#sim-bar`, controles de toque |
| `ajuda.js` | **`PASSOS` do tutorial** (`window.Tutorial`) e a chamada `MajoramaUI.iniciar` (`window.Layout`) |
| `python_ui.js` | exemplos, editor, Executar/Parar, console, espelhamento dos quadros do Worker |

**Layout:** o tamanho (largura; no modo vertical, altura) da janela de scripts é `--editor-size`, definido pelo kit. Limites: editor ≥ 260 px e cenário ≥ 320 px (vertical: 150 e 200). Há uma *preferência* (salva em `localStorage`, chave `majorama.layout`) e o valor *aplicado* (limitado ao que cabe): redimensionar a janela do navegador não altera a preferência; arrastar, usar o teclado, o duplo clique ou o ⤢ sim. O canvas é recalculado por `ResizeObserver` em `render.js`.

**Modo vertical** (`(max-width: 640px), (orientation: portrait) and (max-width: 860px)`): marca no topo, pista, gaveta de scripts embaixo com alça de arrastar e botão ⤢, e dock fixa (Executar, Parar, Scripts, Ajuda). O seletor de exemplos muda para a gaveta (`data-mobile-slot`). Celular deitado: lado a lado, sem rodapé.

**`id`s usados pelos scripts:** `cv, hud, tc, terminal-container, sim-bar, bP bR bL bC bF bV bH bU, bY, splitter, editor-pane, closeEditor, maxEditor, exampleSelect, runBtn, stopBtn, helpBtn, resetBtn, pyModo, pyCar, pyLoad, pySave, pyFile, code-editor, console-output, status-msg, engine-mode, fps, tempo, tour*`.

**Ordem dos scripts** (index.html): `…, render.js, web/ponte.js, python_ui.js, vendor/majorama-ui/majorama-ui.js, ajuda.js`.
