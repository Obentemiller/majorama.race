// Ponte Node <-> Python: agentes escritos em Python, UM PROCESSO POR CARRO (paralelismo real).
// A simulação continua 100% em JS. A cada tick o Node envia a `obs` de cada carro (mesma de
// Simulacao.passo) a todos os processos de uma vez, espera as respostas e aplica `carro.guiar()`.
// Não altera src/: usa o modo "agente = null" (o carro usa o último guiar), como no README do headless.
const {spawn}=require('child_process'),readline=require('readline'),path=require('path');
const PY=process.env.PYTHON||(process.platform==='win32'?'python':'python3');   // troque com PYTHON=...
const TRAB=path.join(__dirname,'..','python','trabalhador.py');

class AgentePy{   // um processo Python = um carro
  constructor(id){this.id=id;this.espera=null;this.err=null;this.fim=false;}
  _falha(e){this.err=this.err||e;const w=this.espera;this.espera=null;if(w)w.rej(this.err);}
  _linha(l){let m;try{m=JSON.parse(l);}catch(e){return this._falha(new Error(`C${this.id+1}: saída inesperada do Python: ${l}`));}
    if(m&&m.erro)return this._falha(new Error(`Erro no agente Python do C${this.id+1}:\n${m.erro}`));
    const w=this.espera;this.espera=null;if(w)w.res(m);}
  pedir(obj){return new Promise((res,rej)=>{if(this.err)return rej(this.err);
    this.espera={res,rej};this.proc.stdin.write(JSON.stringify(obj)+'\n');});}
  async iniciar(arquivo,classe,init){
    this.proc=spawn(PY,[TRAB,path.resolve(arquivo),classe||''],{stdio:['pipe','pipe','inherit']});  // stderr: traceback/print do agente
    readline.createInterface({input:this.proc.stdout}).on('line',l=>this._linha(l));
    this.proc.stdin.on('error',()=>{});
    this.proc.on('error',e=>this._falha(new Error(`não consegui iniciar '${PY}' (${e.message}). Defina PYTHON=caminho/do/python`)));
    this.proc.on('exit',c=>{if(!this.fim)this._falha(new Error(`processo Python do C${this.id+1} terminou (código ${c})`));});
    await this.pedir({init});}
  fechar(){this.fim=true;this.proc.stdin.end();return new Promise(r=>this.proc.once('exit',r));}
}

class PontePy{
  constructor(sim,L){this.sim=sim;this.L=L;this.ag=new Map();}
  // põe o agente Python do arquivo no carro i. classe vazia => usa criar_agente(i) do arquivo
  async adicionar(i,arquivo,classe){
    const {CARRO,SENSORES,RANGE,DT}=this.L,a=new AgentePy(i);
    await a.iniciar(arquivo,classe,{id:i,CARRO,SENSORES,RANGE,DT});
    this.ag.set(i,a);this.sim.carros[i].agente=null;}
  // equivale a sim.passo(), mas decide os carros Python antes (todos em paralelo)
  async passo(){
    await Promise.all([...this.ag].map(async([i,a])=>{const c=this.sim.carros[i];
      const r=await a.pedir({dist:c.retorno(),tipo:c.tipo.slice(),estado:c.estado()});   // mesma obs do simulacao.js
      if(r)c.guiar(r);}));                                                              // null = mantém o último comando
    this.sim.passo();}
  async fechar(){await Promise.all([...this.ag.values()].map(a=>a.fechar()));}
}
module.exports={PontePy};
