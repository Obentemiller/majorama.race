# src/agentes/ — agentes

Um **agente** é qualquer objeto com `decidir(obs)` que devolve `{aceleracao, frenagem, direcao}`. É chamado **uma vez por tick (60 Hz)** para cada carro.

```js
obs = {
  dist:  [d0..d7],   // metros, 1 por SENSORES (graus: -90,-45,-20,0,20,45,90,180); 0..150
  tipo:  [..],       // 'pista' | 'carro' | null por raio
  estado:{ v, vx, vy, w, delta, lat, angRel, s, voltas, fora }
}
```

| Campo de `estado` | Significado |
|---|---|
| `v`/`vx` | velocidade para frente (m/s) |
| `vy` | velocidade lateral, + = direita |
| `w` | taxa de guinada (rad/s), + = horário |
| `delta` | esterço atual (rad) |
| `lat` | desvio da linha central (m), + = direita |
| `angRel` | ângulo do carro relativo à pista (rad), + = apontando para a direita |
| `s`, `voltas` | progresso na volta (m) e voltas completas |
| `fora` | true se na grama |

Saída: `aceleracao` 0..1, `frenagem` 0..1, `direcao` −1..1 (+ = direita). Valores fora da faixa são cortados.

## Arquivos

- `reativo.js` — `AgenteReativo({vmax, freio})`, linha de base (ver abaixo).
- `humano.js` — `Humano` + objeto `teclas`; usado pelo botão "Humano" da UI (setas/WASD ou botões de toque).
- `modelo.js` — esqueleto mínimo para começar (`AgenteModelo`).
- `registro.js` — `criarAgente(i)`: **qual agente controla cada carro** na UI. Edite para colocar o seu.

> Agentes também podem ser escritos em **Python** (um processo por carro, em paralelo), com a mesma interface `guiar/retorno/tipo/estado`: veja `python/README.md`.

## Como adicionar um agente

1. Crie `src/agentes/meu.js` com `class MeuAgente { decidir(obs){ ... } }` (pode usar `clamp`, `CARRO`, `SENSORES`).
2. Headless: `node headless/rodar.js --agente src/agentes/meu.js --classe MeuAgente --carro 0`.
3. Navegador: adicione `<script src="src/agentes/meu.js"></script>` no `index.html` (antes de `simulacao.js`) e retorne `new MeuAgente()` em `criarAgente(i)`.
4. Agentes com estado interno (memória, filtros) devem guardá-lo no próprio objeto; há um objeto por carro.

## Agente reativo (linha de base)

1. **Velocidade alvo** `vt = min(vmax, 8 + √(2·freio·(dm − 8)), √(9·Ld/(2·|sen α|)))`, onde `dm` = maior distância entre os 5 raios frontais (equação de frenagem `v²=2ad`) e o 3º termo limita a aceleração lateral a 9 m/s².
2. **Pedais** `er = vt − v`: `aceleracao = clamp(er/4,0,1)·(1 − 0,5·|direcao|)`, `frenagem = clamp(−er/4,0,1)`.
3. **Direção** = *pure pursuit* + PD: `α` = ângulo médio dos raios frontais com peso `d³` (mira na abertura); `pp = atan(5,4·sen α / Ld)`, `Ld = max(8, 0,7·v)`; centragem `ce = −(1,7/v²·(lat − alvo) + 3,5/v·angRel)`; `direcao = clamp((pp+ce)/0,5, −1, 1)`.
4. **Ultrapassagem (heurística):** se `tipo` dos raios 2–4 é `'carro'` a < 35 m, escolhe o lado com mais espaço (`dist[6]` vs `dist[0]`), desloca `alvo` 4,5 m para esse lado e só volta ao centro quando nenhum carro está à frente nem ao lado.
5. **Recuperação:** se `fora`, volta ao centro e limita a 10 m/s.

Os ganhos não foram otimizados; é uma base para superar.

## Ideias para agentes aprendidos (RL/evolução)

- Entrada: `dist/150` (8), `tipo` como one-hot ou flag de carro (8), `v/60`, `vy/10`, `w`, `delta/0,5`, `lat/8`, `angRel`.
- Saída: 3 valores (`tanh` para direção; `sigmoid` para pedais; ou um único pedal em −1..1).
- Recompensa: progresso `Δs` por tick (tratar a virada em `s`), penalizar grama e contatos, bônus por ganhar posições.
- Treine com `headless/carregar.js` (sem tela); `sim.passo()` ≈ milhares de ticks/s.
