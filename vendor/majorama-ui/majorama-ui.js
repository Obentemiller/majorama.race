/* Majorama UI Kit v0.1.0 — comportamento padrão das interfaces Majorama (ver PADRAO.md). Sem dependências.
     MajoramaUI.iniciar({passos})   -> layout() + tour() com os ids padrão (o que a maioria dos projetos usa)
     MajoramaUI.layout(opcoes)      -> painel lateral abrir/fechar/redimensionar/maximizar + modo vertical
     MajoramaUI.tour({passos,...})  -> sistema de ajuda: tutorial guiado ("? Ajuda")
   Convenção de ids (index.html): topbar brand controls workspace terminal-pane editor-pane splitter
   bY (abrir/fechar painel) closeEditor maxEditor helpBtn tour tour-hl tour-card tourTitulo tourTexto tourPos tourPrev tourNext tourSair tourLink */
(() => {
  const g=id=>document.getElementById(id);
  // DEVE ser igual à @media do modo vertical em majorama-ui.css (tests/kit_smoke.mjs confere)
  const MQ_VERTICAL='(max-width: 640px), (orientation: portrait) and (max-width: 860px)';

  /* ---------- LAYOUT ---------- */
  function layout(o={}){
    const c={workspace:'workspace',painel:'editor-pane',divisor:'splitter',botao:'bY',fechar:'closeEditor',maximizar:'maxEditor',chave:'majorama.layout',...o};
    const LIM={h:{min:260,sim:320,def:380},v:{min:150,sim:200,def:300},...(o.limites||{})};   // h = lado a lado (largura), v = vertical (altura)
    const ws=g(c.workspace),ed=g(c.painel),sp=g(c.divisor),btn=g(c.botao),mx=g(c.maximizar),mq=matchMedia(MQ_VERTICAL);
    let aberto=true,maxim=false,antes=0,tam={h:LIM.h.def,v:LIM.v.def},drag=null;
    try{const s=JSON.parse(localStorage.getItem(c.chave)||'null');
      if(s){aberto=s.aberto!==false;tam={h:+s.tam?.h||tam.h,v:+s.tam?.v||tam.v};}}catch(_){}
    const eixo=()=>mq.matches?'v':'h';
    const medida=(el,e)=>e==='h'?el.offsetWidth:el.offsetHeight;
    const salvar=()=>{try{localStorage.setItem(c.chave,JSON.stringify({aberto,tam}));}catch(_){}};

    // elementos com data-mobile-slot="id-destino" mudam de lugar no modo vertical (ex.: seletor de exemplos vai para a gaveta)
    const slots=[...document.querySelectorAll('[data-mobile-slot]')].map(el=>({el,pai:el.parentNode,prox:el.nextSibling}));
    function moverSlots(){
      for(const s of slots){const dest=g(s.el.dataset.mobileSlot);if(!dest)continue;
        if(mq.matches){if(s.el.parentNode!==dest)dest.prepend(s.el);}
        else if(s.el.parentNode!==s.pai)s.pai.insertBefore(s.el,s.prox&&s.prox.parentNode===s.pai?s.prox:null);}
    }
    function aplicar(fixar){                      // fixar=true: ação do usuário vira a nova preferência (já limitada)
      const e=eixo(),L=LIM[e];
      moverSlots();
      ed.hidden=sp.hidden=!aberto;
      btn.setAttribute('aria-pressed',String(aberto));
      if(!aberto)return;
      const total=(e==='h'?ws.clientWidth:ws.clientHeight)-medida(sp,e);
      const max=Math.max(L.min,total-L.sim);                       // o que sobrar fica para o palco principal
      const val=Math.min(max,Math.max(L.min,tam[e]));              // `tam` é a preferência; `val` o que cabe agora
      if(fixar)tam[e]=val;
      ws.style.setProperty('--editor-size',val+'px');
      sp.setAttribute('aria-orientation',e==='h'?'vertical':'horizontal');
      sp.setAttribute('aria-valuemin',L.min);sp.setAttribute('aria-valuemax',Math.round(max));sp.setAttribute('aria-valuenow',Math.round(val));
    }
    const alternar=v=>{aberto=v===undefined?!aberto:!!v;aplicar();salvar();};
    const maximizar=v=>{                           // gaveta em tela cheia (útil no celular, com o teclado aberto)
      const e=eixo();maxim=v===undefined?!maxim:!!v;
      if(maxim){antes=medida(ed,e);tam[e]=1e6;}else tam[e]=antes||LIM[e].def;
      if(mx){mx.textContent=maxim?'⤡':'⤢';mx.setAttribute('aria-pressed',String(maxim));}
      aplicar(true);salvar();
    };
    btn.addEventListener('click',()=>alternar());
    if(g(c.fechar))g(c.fechar).addEventListener('click',()=>alternar(false));
    if(mx)mx.addEventListener('click',()=>maximizar());

    // arrastar (mouse e toque): o painel fica à direita/embaixo, então arrastar para esquerda/cima aumenta
    sp.addEventListener('pointerdown',ev=>{
      if(ev.button>0)return;ev.preventDefault();
      try{sp.setPointerCapture(ev.pointerId);}catch(_){}
      if(maxim){maxim=false;if(mx){mx.textContent='⤢';mx.setAttribute('aria-pressed','false');}}
      const e=eixo();drag={e,p0:e==='h'?ev.clientX:ev.clientY,t0:medida(ed,e)};
      document.body.classList.add('arrastando');
    });
    sp.addEventListener('pointermove',ev=>{
      if(!drag)return;
      tam[drag.e]=drag.t0-((drag.e==='h'?ev.clientX:ev.clientY)-drag.p0);aplicar(true);
    });
    const fim=()=>{if(!drag)return;drag=null;document.body.classList.remove('arrastando');salvar();};
    sp.addEventListener('pointerup',fim);sp.addEventListener('pointercancel',fim);
    // teclado (divisor focado): setas ajustam (Shift = passo maior), Home/End = mínimo/máximo; duplo clique = padrão
    sp.addEventListener('keydown',ev=>{
      const e=eixo(),passo=ev.shiftKey?60:20,mais=e==='h'?'ArrowLeft':'ArrowUp',menos=e==='h'?'ArrowRight':'ArrowDown',base=medida(ed,e);
      if(ev.key===mais)tam[e]=base+passo;else if(ev.key===menos)tam[e]=base-passo;
      else if(ev.key==='Home')tam[e]=0;else if(ev.key==='End')tam[e]=1e6;else return;
      ev.preventDefault();aplicar(true);salvar();
    });
    sp.addEventListener('dblclick',()=>{tam[eixo()]=LIM[eixo()].def;aplicar(true);salvar();});

    const reaplicar=()=>aplicar();                // sem argumento: redimensionar a janela NÃO altera a preferência
    addEventListener('resize',reaplicar);
    mq.addEventListener?mq.addEventListener('change',reaplicar):mq.addListener(reaplicar);
    aplicar();
    return{abrir:()=>alternar(true),fechar:()=>alternar(false),alternar,maximizar,aberto:()=>aberto,vertical:()=>mq.matches};
  }

  /* ---------- SISTEMA DE AJUDA (tutorial guiado) ----------
     passos: [{alvo:'#seletor'|null, titulo, texto(HTML fixo), abrir?:true, link?:['rótulo','url']}]
     alvo oculto => passo pulado; abrir => garante o painel lateral aberto; ao sair, o layout volta ao que estava.
     Teclas: → / Enter avança, ← volta, Esc sai. */
  function tour(o={}){
    const PASSOS=o.passos||[],L=o.layout||null,chave=o.chave||'majorama.tour';
    const hl=g('tour-hl'),card=g('tour-card'),raiz=g('tour'),prev=g('tourPrev'),next=g('tourNext'),lk=g('tourLink'),ajuda=g(o.botao||'helpBtn');
    let i=0,ativo=false,estavaAberto=true,tok=0;
    const alvoEl=p=>p.alvo?document.querySelector(p.alvo):null;
    const visivel=el=>{if(!el)return false;const b=el.getBoundingClientRect();return b.width>0&&b.height>0;};

    function mostrar(n,dir){
      if(n<0||n>=PASSOS.length){if(n>=PASSOS.length)fechar();return;}
      i=n;const p=PASSOS[n],meu=++tok;
      if(p.abrir&&L)L.abrir();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(meu!==tok||!ativo)return;
        if(p.alvo&&!visivel(alvoEl(p)))return mostrar(n+dir,dir);          // alvo oculto: pula
        g('tourTitulo').textContent=p.titulo;
        g('tourTexto').innerHTML=p.texto;                                  // textos fixos escritos no código do projeto (nunca dados de usuário)
        g('tourPos').textContent=(n+1)+' / '+PASSOS.length;
        if(lk){if(p.link){lk.textContent=p.link[0];lk.href=p.link[1];lk.hidden=false;}else lk.hidden=true;}
        prev.disabled=n===0;next.textContent=n===PASSOS.length-1?'Concluir ✓':'Próximo →';
        posicionar();next.focus();
      }));
    }
    function posicionar(){
      if(!ativo)return;
      const p=PASSOS[i],el=alvoEl(p),vw=innerWidth,vh=innerHeight,pad=6,m=12,ok=visivel(el);
      let r=null;
      if(ok){const b=el.getBoundingClientRect();r={x:b.left-pad,y:b.top-pad,w:b.width+2*pad,h:b.height+2*pad};}
      hl.classList.toggle('sem-alvo',!r);
      if(!r)r={x:vw/2,y:vh/2,w:0,h:0};
      hl.style.left=r.x+'px';hl.style.top=r.y+'px';hl.style.width=r.w+'px';hl.style.height=r.h+'px';
      const cw=card.offsetWidth,ch=card.offsetHeight;
      let x=Math.min(Math.max(m,r.x+r.w/2-cw/2),vw-cw-m),y;
      if(!ok){x=(vw-cw)/2;y=(vh-ch)/2;}
      else if(r.y+r.h+m+ch<=vh-m)y=r.y+r.h+m;                              // abaixo do alvo
      else if(r.y-m-ch>=m)y=r.y-m-ch;                                       // acima
      else y=Math.max(m,vh-ch-m);                                           // alvo muito grande: rodapé
      card.style.left=x+'px';card.style.top=y+'px';
    }
    function iniciar(){
      if(ativo)return;ativo=true;estavaAberto=L?L.aberto():true;
      raiz.hidden=false;mostrar(0,1);
    }
    function fechar(){
      if(!ativo)return;ativo=false;tok++;raiz.hidden=true;
      if(L&&!estavaAberto)L.fechar();                                       // devolve o layout ao que estava
      try{localStorage.setItem(chave,'1');}catch(_){}
      if(ajuda)ajuda.focus();
    }
    const visto=()=>{try{return localStorage.getItem(chave)==='1';}catch(_){return false;}};

    next.addEventListener('click',()=>mostrar(i+1,1));
    prev.addEventListener('click',()=>mostrar(i-1,-1));
    g('tourSair').addEventListener('click',fechar);
    if(ajuda)ajuda.addEventListener('click',iniciar);
    addEventListener('resize',posicionar);
    addEventListener('keydown',e=>{
      if(!ativo)return;
      if(e.key==='Escape'){e.preventDefault();fechar();}
      else if(e.key==='ArrowRight'||(e.key==='Enter'&&document.activeElement!==prev&&document.activeElement!==g('tourSair'))){e.preventDefault();mostrar(i+1,1);}
      else if(e.key==='ArrowLeft'){e.preventDefault();if(i>0)mostrar(i-1,-1);}
      else if(e.key==='Tab'){                                               // mantém o foco dentro do cartão
        const bs=[g('tourSair'),prev,next,lk&&!lk.hidden?lk:null].filter(b=>b&&!b.disabled),k=bs.indexOf(document.activeElement);
        e.preventDefault();bs[(k+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();
      }
    },true);
    return{iniciar,fechar,visto,PASSOS};
  }

  function iniciar(o={}){
    const L=layout(o.layout||{}),T=tour({passos:o.passos,layout:L,...(o.tour||{})});
    return{layout:L,tour:T};
  }
  window.MajoramaUI={MQ_VERTICAL,layout,tour,iniciar};
})();
