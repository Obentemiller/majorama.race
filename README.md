Majorama.race
> Racing agent playground from the Majorama family.
> The project is uploaded on GitHub Pages, so just click the link and enjoy! : https://obentemiller.github.io/majorama.race/
> 
Top-down (2D) racing simulator designed to study and develop racing agents capable of being fast and overtaking. The car is fixed and predefined, physics are dynamic (Newtonian), and the agent interacts via a minimal interface:
 * acts with carro.guiar({aceleracao, frenagem, direcao})
 * perceives with carro.retorno() → distances of rays extending from the car to the track boundary or another car
No build and no backend: runs statically on GitHub Pages and on the user's local machine. Agents can be written in JavaScript or Python (Pyodide + NumPy in the browser, or local Python with PyTorch for training).
How to Run
| Mode | Command |
|---|---|
| Browser (visual, JS agents) | open index.html (double click works; Python mode requires http) |
| Headless, accelerated, with metrics | node headless/rodar.js --seg 120 (Node 18+) |
| Python agents in the browser | ▤ Scripts window in index.html (? Help button = tutorial; see manual.md) (requires internet on the 1st run and http: GitHub Pages or python -m http.server) |
| Python agents (local) | node headless/rodar.js --seg 120 --py python/agentes/reativo.py --carro todos (+ Python 3.8+) |
Structure
| Folder/File | Content | README |
|---|---|---|
| index.html | page shell; loads scripts in order | — |
| src/ | core: track, car (physics + sensors), simulation | src/README.md |
| src/agentes/ | agents (reactive, human, model) and registry | src/agentes/README.md |
| src/ui/ | canvas rendering, buttons, HUD | src/ui/README.md |
| headless/ | Node execution and metrics | headless/README.md |
| src/web/ | browser Worker: JS engine + Pyodide in the same thread | src/web/README.md |
| python/ | agents and environment in Python (browser and local), reinforcement learning (Gymnasium + PPO) | python/README.md |
| tools/ | gerar_manifesto.py (list of Python files downloaded by the browser) | — |
| vendor/majorama-ui/ | Majorama UI kit (Pixela Terminal style, resizable side panel, mobile portrait mode, help system); do not edit here | PADRAO.md |
| css/app.css | project-specific style rules only (canvas, HUD, touch controls) | src/ui/README.md |
| PADRAO.md | the Majorama UI standard followed by this project | — |
| manual.md | user manual (also linked in the footer of the site); the ? Help button opens a guided tutorial | — |
| tests/ | rodar_testes.py (Python: protocol, Python == JS, exported model) and ui_smoke.mjs (jsdom interface: layout, tutorial, Worker bridge); both run in CI (.github/workflows/ci.yml) | — |
| AGENTS.md | rules for LLM agents editing the project | — |
The Two Python Paths (same script)
|  | Browser (Pages) | Local (Node + Python) |
|---|---|---|
| JS Engine | in Worker, alongside Pyodide | headless/servidor.js (subprocess) |
| Python | Pyodide: NumPy (scipy etc. via # packages:) | your Python: PyTorch, stable-baselines3… |
| Good for | playing, teaching, running ready models | heavy training |
| Bridge | python/backend.py → JsBackend | python/backend.py → NodeBackend |
Train locally (python/treinar.py), export with python/exportar_npz.py and run in the browser with agentes/treinado_numpy.py.
Conventions (apply project-wide)
 * SI units: meters, seconds, kg, N, rad.
 * Screen axes: x → right, y → down. Angle th = 0 points to +x and increases clockwise on the screen.
 * direcao > 0 = right; sensor angle > 0 = right; lat > 0 = car to the right of the centerline.
 * Physics at 60 Hz, deterministic (no Math.random in the core).
Recommended Workflow
 * Copy src/agentes/modelo.js, implement decidir(obs).
 * Test headless: node headless/rodar.js --agente src/agentes/seu.js --classe SuaClasse --carro 0 --seg 120.
 * Compare metrics (lap time, speed, % off track, position changes) against the baseline.
 * View in the browser: register the agent in src/agentes/registro.js and include the <script> in index.html.
Known Limitations
No weight transfer; simplified collision (impulse between rectangles, equal masses, approximate torque); example reactive agent has hand-tuned gains (not optimal); single track.
