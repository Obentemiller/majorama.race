# Script de ambiente: roda o PistaEnv (API estilo Gymnasium) com um piloto simples e mostra a corrida.
# Modo "script": VOCÊ conduz o tempo (reset/step). No navegador, env.render() desenha o estado atual.
import numpy as np

from pista_env import PistaEnv

env = PistaEnv(oponentes=5, max_seg=40)          # você = último da grade; os outros 5 = reativo (JS)
obs, info = env.reset(seed=0)
total = 0.0
for passo in range(800):                          # cada passo = 3 ticks (decide a 20 Hz)
    v, lat, ang = obs[16] * 60, obs[20] * 8, obs[21] * np.pi      # posições no vetor: ver observacao.py
    direcao = np.clip(-(0.02 * lat + 0.5 * ang), -1, 1)
    pedal = np.clip((18 - v) / 4, -1, 1)          # pedal > 0 acelera, < 0 freia
    obs, r, terminou, truncou, info = env.step([pedal, direcao])
    total += r
    env.render(tempo_real=True)                   # tempo_real=False roda o mais rápido possível
    if terminou or truncou:
        break
print(f"fim: {info['t']:.1f} s, posição {info['pos'] + 1}º, progresso {info['prog']:.0f} m, recompensa {total:.1f}")
