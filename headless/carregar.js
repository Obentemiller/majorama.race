// Carrega os módulos de src/ no Node (são scripts clássicos do navegador, sem import/export).
const fs=require('fs'),path=require('path'),vm=require('vm');
const ORDEM=['constantes','pista','carro','agentes/reativo','agentes/registro','simulacao','ambiente']; // mesma ordem do index.html
let cache=null;
function carregar(){
  if(cache)return cache;
  for(const f of ORDEM)vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8'),{filename:'src/'+f+'.js'});
  return cache=vm.runInThisContext('({Simulacao,Pista,Carro,AgenteReativo,Ambiente,snapshotDe,CARRO,SENSORES,DT,RANGE,clamp})');
}
module.exports={carregar};
