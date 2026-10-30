#!/usr/bin/env node
// Servidor de física para treino (RL): o Python (python/pista_env.py) comanda, o Node simula.
// Protocolo: 1 linha JSON por comando em stdin, 1 linha JSON de resposta em stdout. A lógica (comandos
// info/reiniciar/passo/estado) está em src/ambiente.js — a mesma usada pelo navegador.
const readline=require('readline'),{carregar}=require('./carregar');
const L=carregar(),amb=new L.Ambiente();
const out=o=>process.stdout.write(JSON.stringify(o)+'\n');
readline.createInterface({input:process.stdin}).on('line',l=>{
  try{out(amb.cmd(JSON.parse(l)));}catch(e){out({erro:String(e.stack||e)});}
}).on('close',()=>process.exit(0));
