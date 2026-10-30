# Manual do Majorama.race

Playground para criar **agentes de corrida**: você escreve o piloto (em Python ou JavaScript); a pista, a física e os sensores já estão prontos. Tudo roda no seu navegador.

> Prefere um passeio guiado? Toque em **? Ajuda** na barra superior: o tutorial destaca cada parte da tela.

## 1. A tela

| Parte | O que faz |
|---|---|
| **Simulação** (esquerda/em cima) | Pista vista de cima, 6 carros, raios do carro em foco e painel de posições (HUD) |
| **Barra da simulação** | Pausa, Reiniciar, Raios, Câmera, Foco, velocidade, Humano, HUD |
| **Janela de scripts** (direita/embaixo) | Editor Python, exemplos, modo/carro, console |
| **Divisor** | Arraste para redimensionar a janela de scripts |
| **Barra de status** | Estado atual e motor em uso (JS da página, ou JS + Pyodide no Worker) |

### Controles da simulação
- **⏸ Pausa / ▶ Seguir** e **↺ Reiniciar** (no modo Python, reinicia a corrida e recarrega o agente).
- **Raios** liga/desliga os sensores desenhados. **Câmera** alterna pista inteira / seguindo o carro. **Foco** escolhe o carro acompanhado (e cujos raios aparecem).
- **×1 / ×4 / ×16** acelera o tempo (a física é sempre a 60 Hz; só roda mais ticks por quadro).
- **Humano** deixa você dirigir o **C1**: setas ou WASD; em telas de toque aparecem botões ◀ ▶ ▲ ▼.
- **HUD** mostra/oculta a classificação ao vivo (velocidade, voltas, última volta, "grama" se estiver fora da pista).

### A janela de scripts
- **▤ Scripts** (barra superior) ou **✕** abrem/fecham a janela. O estado fica salvo no navegador.
- **Redimensionar:** arraste o divisor. Em telas largas muda a **largura**; em telas estreitas (≤ 860 px, ex.: celular em pé) a janela fica embaixo e muda a **altura**.
- **Limites:** o cenário da simulação nunca fica menor que 320 px (200 px de altura no modo empilhado) e a janela de scripts nunca menor que 260 px (150 px).
- **Teclado:** com o divisor focado, setas ajustam (Shift = passo maior), Home/End = mínimo/máximo. **Duplo clique** restaura o tamanho padrão.

### No celular (em pé)
A tela se reorganiza para o polegar:
- **Topo:** só a marca. **Meio:** a pista e a barra de controles (rola para o lado). **Gaveta:** a janela de scripts, logo abaixo. **Rodapé:** uma barra fixa com **Executar, Parar, Scripts e Ajuda**, em botões grandes.
- **Alça:** a faixa entre a pista e a gaveta se arrasta com o dedo para mudar a altura da gaveta. **⤢** (no cabeçalho da gaveta) a estica até o máximo, ótimo para digitar com o teclado aberto; toque de novo para restaurar.
- O **seletor de exemplos** fica dentro da gaveta. O link do **Manual** aparece no último passo da ajuda.
- Com o celular **deitado**, a janela de scripts volta para o lado da pista.

## 2. Escrevendo um agente (modo "agente")

O modo **agente** roda uma corrida em tempo real; o Python controla o carro escolhido e os outros seguem o agente de exemplo em JavaScript.

```python
from constantes import clamp

class Agente:
    def controlar(self, carro):                  # chamado 60× por segundo
        d = carro.retorno()                       # 8 distâncias (m), uma por raio
        e = carro.estado()                        # velocidade, posição na pista...
        direcao = clamp(-(0.02 * e["lat"] + 0.5 * e["angRel"]), -1, 1)
        er = 20 - e["v"]
        carro.guiar({"aceleracao": clamp(er / 4, 0, 1),
                     "frenagem":   clamp(-er / 4, 0, 1),
                     "direcao":    direcao})
```

Também vale a forma `decidir(self, obs)` (devolve um dicionário ou uma tupla `(aceleração, frenagem, direção)`) e uma função `criar_agente(i)` para escolher a classe por carro.

### Comando: `carro.guiar({...})`
| Campo | Faixa | Significado |
|---|---|---|
| `aceleracao` | 0 a 1 | pedal de aceleração |
| `frenagem` | 0 a 1 | pedal de freio |
| `direcao` | −1 a 1 | volante; **positivo = direita** |

Se o agente não chamar `guiar` num tick, o último comando é mantido.

### Percepção: `carro.retorno()` e `carro.tipo`
Oito raios saem do contorno do carro. `retorno()` devolve a distância (m, máximo 150) até o limite da pista ou outro carro; `carro.tipo[i]` diz o que cada raio acertou (`'pista'`, `'carro'` ou `None`).

| Índice | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Ângulo | −90° | −45° | −20° | 0° | +20° | +45° | +90° | 180° |
| Onde | esquerda | frente-esq. | frente-esq. | frente | frente-dir. | frente-dir. | direita | trás |

(0° é a frente; ângulos positivos são para a **direita**. 0°, ±90° e 180° são perpendiculares às faces do carro.)

### Estado: `carro.estado()`
`v` (velocidade, m/s), `vy` (lateral), `w` (taxa de guinada), `delta` (esterço), `lat` (desvio da linha central, m; + = direita), `angRel` (ângulo relativo à pista, rad), `s` (posição na volta, m), `voltas`, `fora` (true se na grama).

### Física em uma frase
Carro fixo de 4,5 × 1,9 m e 1500 kg, modelo de bicicleta dinâmica com pneus que saturam (círculo de atrito): acelerar ou frear em curva consome aderência. A grama tem menos aderência; há colisões entre carros. A pista tem 16 m de largura e ~2,3 km.

## 3. Modo "script" (você conduz o tempo)

Como num treino de aprendizado por reforço: seu código chama `reset()` e `step()` e decide quando avançar.

```python
from pista_env import PistaEnv
env = PistaEnv(oponentes=5, max_seg=40)
obs, info = env.reset(seed=0)
for _ in range(800):
    obs, recompensa, terminou, truncou, info = env.step([0.5, 0.0])   # [pedal, direção]
    env.render()                                                       # desenha na página
    if terminou or truncou: break
```
- Ação: `[pedal, direção]` em −1..1 (pedal > 0 acelera, < 0 freia). Observação: vetor de 23 números normalizados (ver `python/observacao.py`).
- `env.render(tempo_real=True)` espera o relógio real; sem ele o script roda o mais rápido possível.
- Pausa e velocidade da barra valem só para o modo agente. **■ Parar** encerra qualquer script.

## 4. Exemplos
| Exemplo | Modo | O que mostra |
|---|---|---|
| Modelo mínimo | agente | segue a linha central a ~20 m/s |
| Reativo | agente | porte em Python do agente de exemplo em JS (segue a maior abertura, ultrapassa) |
| Treinado (PPO em NumPy) | agente | rede neural treinada, executada só com NumPy |
| Ambiente estilo Gym | script | piloto simples no `PistaEnv` |
| Busca aleatória | script | aprende uma política linear com NumPy |

## 5. Dicas e recursos
- **Executar:** botão ▶ ou **Ctrl+Enter** no editor. **Tab** insere 4 espaços.
- **Salvar:** o código fica guardado no navegador; **⤓ baixar** gera um `.py` e **⤒ abrir** carrega um `.py` do aparelho.
- **Mais pacotes:** 1ª linha `# pacotes: scipy, outro` (pacotes do Pyodide ou puros do PyPI). NumPy já vem. Não existem PyTorch nem subprocessos no navegador (treine localmente, exporte com `python/exportar_npz.py` e rode aqui).
- **Console:** mostra `print()`, progresso e erros (em vermelho).

## 6. Problemas comuns
| Sintoma | Causa provável |
|---|---|
| "Carregando Python…" demora | 1ª vez baixa o Pyodide (10–20 s); depois fica em cache. Precisa de internet |
| Exemplos não abrem / nada roda | a página precisa de **http(s)**, não `file://`: use o GitHub Pages ou `python -m http.server` |
| Erro no console e a pista congela | exceção no seu código; leia o traceback, corrija e execute de novo (**■ Parar** devolve ao agente JS) |
| O carro não obedece | confira o sinal da direção (+ = direita) e se `guiar` é chamado em todos os caminhos do código |
| Janela de scripts sumiu | toque em **▤ Scripts** |

## 7. Limites conhecidos
Sem transferência de peso; colisão simplificada; uma única pista; o agente de exemplo tem ganhos escolhidos à mão. Para treinar redes grandes use o fluxo local (`python/README.md`).
