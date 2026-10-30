# Aprendizado mínimo dentro do navegador: busca aleatória (hill climbing) de uma política linear, só NumPy.
# A política é theta (2 x 24) aplicada ao vetor de observação (+1 de viés): [pedal, direcao] = tanh(theta @ obs).
import numpy as np

from pista_env import PistaEnv

env = PistaEnv(oponentes=0, max_seg=20, largada="aleatoria")
rng = np.random.default_rng(0)


def episodio(theta, seed, mostrar=False):
    obs, _ = env.reset(seed=seed)
    total = 0.0
    while True:
        obs, r, terminou, truncou, _ = env.step(np.tanh(theta @ np.append(obs, 1.0)))
        total += r
        if mostrar:
            env.render()
        if terminou or truncou:
            return total


def nota(theta):                                  # mesmas sementes para todos os candidatos: comparação justa
    return float(np.mean([episodio(theta, s) for s in (1, 2, 3)]))


theta = np.zeros((2, 24))
theta[0, 23] = 0.5                                # começa acelerando um pouco
melhor = nota(theta)
print(f"início: {melhor:.1f}")
for it in range(30):
    cand = theta + 0.3 * rng.standard_normal(theta.shape)
    n = nota(cand)
    if n > melhor:
        theta, melhor = cand, n
    print(f"iteração {it + 1:2d}: melhor {melhor:.1f}")
episodio(theta, 4, mostrar=True)                  # mostra o resultado na pista
print("pronto. Salve theta com np.save se quiser reutilizar.")
