/* Ajuda do Majorama.race: inicia o kit (layout + tutorial). Para mudar o tutorial, edite PASSOS.
   alvo: seletor CSS (null = cartão centralizado) · abrir: abre a janela de scripts · link: ['rótulo','url']
   Passos cujo alvo não está visível (ex.: HUD oculto, botão ⤢ no desktop) são pulados. Ver vendor/majorama-ui/majorama-ui.js */
const PASSOS=[
  {alvo:'#brand',titulo:'Bem-vindo ao Majorama.race',
   texto:'Um playground para criar <b>agentes de corrida</b> em Python. Você escreve o piloto; a simulação, a física e os sensores já estão prontos. Este tutorial leva cerca de 1 minuto.'},
  {alvo:'#terminal-container',titulo:'A pista',
   texto:'Visão de cima: 6 carros correm numa pista fechada de ~2,3 km. Os carros <b>começam pilotados por um agente de exemplo em JavaScript</b>. Os <b>raios</b> desenhados são os sensores do carro em foco.'},
  {alvo:'#sim-bar',titulo:'Controles da simulação',
   texto:'<b>Pausa</b> e <b>Reiniciar</b>; <b>Raios</b> liga/desliga os sensores; <b>Câmera</b> alterna entre a pista inteira e seguir o carro; <b>Foco</b> escolhe qual carro acompanhar; <b>×1/×4/×16</b> acelera o tempo; <b>Humano</b> deixa você dirigir o C1 (setas/WASD ou botões na tela). A barra rola para o lado.'},
  {alvo:'#hud',titulo:'Painel de posições',
   texto:'Mostra a classificação ao vivo: velocidade, voltas e última volta de cada carro. O botão <b>HUD</b> o oculta.'},
  {alvo:'#bY',titulo:'Janela de scripts',
   texto:'Este botão <b>abre e fecha</b> a janela onde você escreve o agente em Python. Fechada, a simulação ocupa a tela toda. No celular em pé ela é a <b>gaveta</b> de baixo, e este botão fica na barra inferior. O estado fica salvo no navegador.'},
  {alvo:'#splitter',abrir:true,titulo:'Redimensione',
   texto:'<b>Arraste o divisor</b> (no celular em pé, a alça entre a pista e a gaveta) para mudar o tamanho da janela de scripts. Há tamanhos mínimos para o cenário nunca sumir. Com o divisor focado, use as <b>setas</b>; <b>duplo clique</b> restaura o padrão.'},
  {alvo:'#maxEditor',abrir:true,titulo:'Maximizar a gaveta',
   texto:'No celular, este botão <b>⤢</b> estica a gaveta até o máximo para editar com o teclado aberto. Toque de novo para restaurar.'},
  {alvo:'#exampleSelect',abrir:true,titulo:'Exemplos',
   texto:'Escolha um ponto de partida. <b>Agentes</b> rodam numa corrida em tempo real. <b>Scripts</b> deixam <i>você</i> conduzir o tempo (reset/step, como num treino de aprendizado por reforço).'},
  {alvo:'#code-editor',abrir:true,titulo:'Escreva seu agente',
   texto:'Em Python (com NumPy). Contrato: uma classe com <code>controlar(self, carro)</code>, chamada 60× por segundo. Perceba com <code>carro.retorno()</code> (8 distâncias dos raios) e atue com <code>carro.guiar({...})</code> (aceleração, frenagem, direção). <b>Tab</b> insere 4 espaços.'},
  {alvo:'#editor-opts',abrir:true,titulo:'Modo e carro',
   texto:'<b>modo: agente</b> = corrida em tempo real; <b>modo: script</b> = seu código conduz. Escolha qual <b>carro</b> o Python controla (os outros seguem o agente JS). <b>abrir/baixar</b> trazem e levam arquivos <code>.py</code> do aparelho.'},
  {alvo:'#runBtn',titulo:'Executar',
   texto:'Roda o código (ou <b>Ctrl+Enter</b> no editor). Na 1ª vez o Python é baixado e iniciado (10–20 s); depois fica em cache.'},
  {alvo:'#stopBtn',titulo:'Parar',
   texto:'Encerra o Python e devolve a pista ao agente JS. Use também para interromper scripts longos.'},
  {alvo:'#console-output',abrir:true,titulo:'Console',
   texto:'Aqui aparecem os <code>print()</code> do seu código, o progresso e os <b>erros</b>.'},
  {alvo:null,titulo:'Pronto! 🏁',
   texto:'Comece com <b>Agente · Modelo mínimo</b>, aperte Executar e mude os números. Para rever este tutorial, toque em <b>? Ajuda</b>.',
   link:['Abrir o manual completo','https://github.com/Obentemiller/majorama.race/blob/main/manual.md']},
];
const _ui=MajoramaUI.iniciar({passos:PASSOS});
window.Layout=_ui.layout;window.Tutorial=_ui.tour;   // atalhos para o console e para os testes
