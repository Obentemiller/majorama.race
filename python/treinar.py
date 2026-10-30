#!/usr/bin/env python3
"""Treina um agente com PPO (stable-baselines3) na pista. Um comando:

    pip install -r python/requirements-rl.txt
    python python/treinar.py --passos 300000

Salva python/modelos/<nome>.zip (+ <nome>.json com a configuração do ambiente).
Durante o treino, a cada --aval-cada passos roda 1 corrida de teste (largada normal) e guarda o MELHOR
modelo: no PPO a recompensa costuma subir e depois oscilar, então o último modelo nem sempre é o melhor.
Depois rode o modelo no simulador, com as métricas de sempre:

    MODELO=ultimo node headless/rodar.js --seg 120 --py python/agentes/treinado.py --py-classe AgenteTreinado --carro 5

Exemplos:
    python python/treinar.py --oponentes 0 --largada aleatoria      # aprender a dirigir rápido, sozinho
    python python/treinar.py --oponentes 5 --nome ultrapassa         # largar em último e aprender a ultrapassar
    python python/treinar.py --envs 4 --passos 1000000                # 4 simulações em paralelo
    python python/treinar.py --continuar --nome ultimo --passos 200000  # segue treinando um modelo salvo
"""
import argparse
import json
import os
import shutil

AQUI = os.path.dirname(os.path.abspath(__file__))


def criar_env(cfg, seed):
    def f():
        from stable_baselines3.common.monitor import Monitor
        from pista_env import PistaEnv
        env = Monitor(PistaEnv(**cfg))
        env.reset(seed=seed)
        return env
    return f


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--passos", type=int, default=300_000, help="passos de treino (cada um = --repetir ticks)")
    p.add_argument("--nome", default="ultimo", help="nome do modelo salvo em python/modelos/")
    p.add_argument("--envs", type=int, default=1, help="simulações em paralelo (1 processo Node cada)")
    p.add_argument("--oponentes", type=int, default=5, help="carros reativos (JS) na pista; 0 = sozinho")
    p.add_argument("--largada", choices=["grade", "aleatoria"], default="grade")
    p.add_argument("--max-seg", type=float, default=60, help="duração máxima do episódio (s simulados)")
    p.add_argument("--repetir", type=int, default=3, help="ticks por decisão (3 = 20 Hz)")
    p.add_argument("--voltas", type=int, default=None, help="termina o episódio ao completar N voltas")
    p.add_argument("--aval-cada", type=int, default=20_000, help="passos entre avaliações (guarda o melhor)")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--continuar", action="store_true", help="carrega o modelo --nome e continua treinando")
    a = p.parse_args()

    from stable_baselines3 import PPO
    from stable_baselines3.common.callbacks import EvalCallback
    from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv

    cfg = dict(oponentes=a.oponentes, repetir=a.repetir, max_seg=a.max_seg, voltas=a.voltas, largada=a.largada)
    fabricas = [criar_env(cfg, a.seed + i) for i in range(a.envs)]
    venv = SubprocVecEnv(fabricas) if a.envs > 1 else DummyVecEnv(fabricas)
    os.makedirs(os.path.join(AQUI, "modelos"), exist_ok=True)
    base = os.path.join(AQUI, "modelos", a.nome)

    if a.continuar:
        modelo = PPO.load(base, env=venv)
    else:   # hiperparâmetros padrão do PPO, com rollouts curtos para atualizar mais cedo
        # taxa de aprendizado cai linearmente até 0 (p vai de 1 a 0): estabiliza o fim do treino
        modelo = PPO("MlpPolicy", venv, seed=a.seed, verbose=1, n_steps=max(256, 2048 // a.envs),
                     batch_size=256, learning_rate=lambda p: 3e-4 * p,
                     policy_kwargs=dict(log_std_init=-1.0))   # ação menos ruidosa no início (padrão 0 = ruído enorme a 20 Hz)
    # avaliação: largada normal, ação determinística (como o AgenteTreinado roda), sem sorteio => 1 episódio basta
    aval = DummyVecEnv([criar_env({**cfg, "largada": "grade"}, a.seed + 1000)])
    pasta = os.path.join(AQUI, "modelos", f"_{a.nome}_aval")
    cb = EvalCallback(aval, best_model_save_path=pasta, eval_freq=max(1, a.aval_cada // a.envs),
                      n_eval_episodes=1, deterministic=True, verbose=1)
    modelo.learn(total_timesteps=a.passos, reset_num_timesteps=not a.continuar, callback=cb)
    melhor = os.path.join(pasta, "best_model.zip")
    if os.path.exists(melhor):                # o melhor da avaliação vira o modelo final
        shutil.copyfile(melhor, base + ".zip")
        shutil.rmtree(pasta)
        print("(salvando o MELHOR modelo da avaliação, não o último)")
    else:
        modelo.save(base)
    aval.close()
    with open(base + ".json", "w") as f:      # o AgenteTreinado precisa saber a frequência de decisão
        json.dump({"repetir": a.repetir, **cfg}, f, indent=2)
    venv.close()
    print(f"\nModelo salvo em {base}.zip")


if __name__ == "__main__":
    main()
