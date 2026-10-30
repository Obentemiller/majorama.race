# src/ — núcleo da simulação

Independe de DOM (só `Path2D` é opcional, usado para desenhar). Ordem de carga: `constantes → pista → carro → agentes/reativo → agentes/registro → simulacao → ambiente`.

| Arquivo | Papel |
|---|---|
| `constantes.js` | `DT`, `SUB`, `G`, `RANGE`, `CARRO` (carro pré-definido), `SENSORES`, `PTS` (pista), `clamp` |
| `pista.js` | `Pista`: geometria, localização do carro, raio contra os limites |
| `carro.js` | `Carro`: estado, `guiar`, `retorno`, `estado`, dinâmica (`passo`), sensores |
| `ambiente.js` | `Ambiente`: protocolo JSON de treino (info/reiniciar/passo/estado), usado pelo Node e pelo navegador; `snapshotDe(sim)` |
| `simulacao.js` | `Simulacao`: cria carros/grade, laço `passo()`, voltas, grama, colisões |

## Laço de simulação — `Simulacao.passo()` (1 tick = 1/60 s)

1. Para cada carro com agente: `guiar(agente.decidir({dist, tipo, estado}))`.
2. `SUB=2` subpassos de física (`DT/SUB`): `carro.passo()` de todos, depois `colisoes()`.
3. Atualiza posição na pista (`lat`, `s`, `idx`), grama (`ader`), voltas e barreira.
4. `tick++`, `t += DT`.

## Carro (`CARRO`) — modelo de bicicleta dinâmica

Estado: posição `x,y`, ângulo `th`, velocidade no corpo `vx` (frente) e `vy` (direita), taxa de guinada `w`, esterço `delta`.

| Parâmetro | Valor | Significado |
|---|---|---|
| `L`, `W` | 4,5 × 1,9 m | retângulo do carro (colisão e sensores) |
| `m`, `Iz` | 1500 kg, 2500 kg·m² | massa e inércia de guinada |
| `a`, `b` | 1,3 / 1,4 m | CG→eixo dianteiro / traseiro |
| `mu`, `k` | 1,5 / 8 | atrito dos pneus; rigidez de saturação do pneu |
| `Pmax`, `Fmax` | 150 kW, 9000 N | potência e força máxima de tração |
| `Fbrk` | 16000 N | força de freio total (60 % frente, 40 % trás) |
| `CdA` | 0,6 | arrasto: `F = CdA·v²` |
| `dmax`, `dRate` | 0,5 rad, 2,5 rad/s | esterço máximo e velocidade de esterço |

Equações (corpo rígido, 2ª lei de Newton no referencial do carro):

- Deriva: `αf = atan2(vy + a·w, max(|vx|,2)) − δ`, `αr = atan2(vy − b·w, max(|vx|,2))`
- Carga estática: `Fzf = m·g·b/(a+b)`, `Fzr = m·g·a/(a+b)`; capacidade do eixo `cap = mu·Fz`
- Longitudinal: tração só no eixo traseiro, `Fd = acel·min(Fmax, Pmax/max(vx,1))`; freio `Fb = freio·Fbrk·sat(vx/0,5)`
- **Círculo de atrito:** `Fy = −fl·√(cap² − Fx²)·tanh(k·α)`, com `fl = min(1, v/4)` (evita forças a baixa velocidade). Acelerar/frear em curva reduz a força lateral disponível.
- Resistências: arrasto `CdA·v·(vx,vy)`; rolamento `crr·m·g·(vx,vy)/(v+0,5)` com `crr = 0,015` (pista) ou `0,12` (grama)
- Dinâmica: `m(v̇x − vy·w) = Fx`, `m(v̇y + vx·w) = Fy`, `Iz·ẇ = a·Fy,f·cosδ + a·Fx,f·senδ − b·Fy,r`
- Integração: Euler semi-implícito, passo físico 1/120 s. Esterço limitado em taxa e amplitude.

Comandos: `aceleracao` 0..1, `frenagem` 0..1, `direcao` −1..1 (× `dmax`). Carro não dá ré por comando.

## Sensores (`SENSORES`, graus; + = direita)

`[-90, -45, -20, 0, 20, 45, 90, 180]` → índices 0..7. Cada raio **nasce no contorno do carro** (ponto onde a direção do sensor sai do retângulo) e vai até o primeiro obstáculo (máx. `RANGE` = 150 m).
- 0°, ±90° e 180° são **normais às faces**; ±20° e ±45° são extras para antecipar curvas.
- Obstáculos: segmentos dos dois limites da pista (interseção raio–segmento) e retângulos orientados dos outros carros (método das lajes).
- `retorno()` devolve as distâncias (cópia); `carro.tipo[i]` = `'pista' | 'carro' | null` (null = nada até `RANGE`). O resultado é calculado uma vez por tick (cache por `tick`).
- Para mudar sensores: edite `SENSORES`; o índice de cada raio muda e agentes que usam índices fixos (como `reativo.js`) precisam ser ajustados.

## Pista

- `PTS`: pontos de controle (m); curva **Catmull-Rom** fechada, 12 amostras por trecho (~192 pontos). Largura 16 m (`new Pista(PTS, 16)` em `Simulacao`), comprimento ≈ 2258 m.
- Cada amostra guarda posição, tangente, normal à direita e distância acumulada `s`. Limites esquerdo/direito = amostra ∓ normal·w/2.
- `localiza(x,y,hint)`: amostra mais próxima (janela ±25 em torno de `idx`) → `lat` (desvio da linha central, + = direita) e `s`.
- Fora da pista (`|lat| > w/2`): `mu × 0,5` e rolamento maior. Barreira em `w/2 + 8 m`: reposiciona e tira velocidade.
- Voltas: cruzamento da linha em `s = 0`; a 1ª passagem só inicia o cronômetro. Grade de largada: 2 por fila, 10 m entre filas, atrás da linha.

## Colisões

Retângulo × retângulo por **teorema do eixo separador**; separa os carros pela profundidade e aplica impulso na normal (restituição 0,2, massas iguais) mais um torque de guinada aproximado (ponto de contato = ponto médio entre centros). Simplificado de propósito.
