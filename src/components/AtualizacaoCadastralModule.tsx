import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Users, CheckCircle2, Download, Table as TableIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';

interface AtualizacaoCadastralModuleProps {
  user: UserProfile;
  onBack: () => void;
}

export function AtualizacaoCadastralModule({ user, onBack }: AtualizacaoCadastralModuleProps) {
  const navigate = useNavigate();
  const [syncedData, setSyncedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlType, setUrlType] = useState<'dev' | 'pre'>('dev');

  const rawAppUrl = window.location.origin;
  const appUrl = urlType === 'pre' ? rawAppUrl.replace('ais-dev-', 'ais-pre-') : rawAppUrl;

  const tampermonkeyCode = `// ==UserScript==
// @name         Sincronizar DGP - Pessoal (Massa)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extrai dados pessoais do DGP (Mass Sync)
// @author       Seu Nome
// @match        *://cbmerj.rj.gov.br/*
// @match        *://*.cbmerj.rj.gov.br/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ais-pre-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      ais-dev-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    try {
        const fixGlobals = (win) => { win.over="over"; win.out="out"; };
        fixGlobals(window);
        const script = document.createElement('script');
        script.textContent = 'window.over="over"; window.out="out"; try{for(let i=0;i<window.frames.length;i++){window.frames[i].window.over="over"; window.frames[i].window.out="out";}}catch(e){}';
        document.documentElement.appendChild(script);
    } catch(e) {}

    const appUrl = '${appUrl}';
    // Substitua pela key se utilizar a API direta, 
    // ou usaremos a rota com x-api-key: MINHA_CHAVE_SECRETA_SUPER_SEGURA_123

    function createButton() {
        if (document.getElementById('sync-dgp-pessoal-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'sync-dgp-pessoal-btn';
        btn.innerText = '🚀 MASS SYNC PESSOAL';
        btn.style.position = 'fixed';
        btn.style.bottom = '70px'; // Fica acima do botão de férias se houver
        btn.style.right = '20px';
        btn.style.zIndex = '2147483647';
        btn.style.padding = '12px 25px';
        btn.style.backgroundColor = '#10b981'; // Emerald 500
        btn.style.color = '#fff';
        btn.style.border = '3px solid #fff';
        btn.style.borderRadius = '15px';
        btn.style.fontWeight = '900';
        btn.style.fontSize = '13px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
        btn.style.fontFamily = 'Arial, sans-serif';
        btn.style.transition = 'all 0.2s';

        btn.onclick = async () => {
            let rgsInput = prompt("Cole os RGs para extração em massa (separados por vírgula ou espaço):");
            if (!rgsInput) return;
            
            const rgs = rgsInput.split(/[\\s,]+/).filter(r => r.trim() !== '');
            if(rgs.length === 0) return;
            
            if (!confirm('Iniciar varredura de ' + rgs.length + ' militares?')) return;
            
            btn.disabled = true;
            btn.innerText = '⌛ EXTRAINDO...';

            let finalData = [];
            for (let rg of rgs) {
                console.log('Buscando dados pessoais do RG: ' + rg);
                try {
                    const fd = new FormData();
                    fd.append('rg_cons', rg);
                    fd.append('Submit', 'Pesquisar');
                    
                    let searchAction = 'consulta_mil.php';
                    const docT = window.frames['corpo']?.document || document;
                    const f = docT.querySelector('form');
                    if (f && f.getAttribute('action')) { searchAction = f.getAttribute('action'); }
                    
                    await fetch(searchAction, { method: 'POST', body: fd }).catch(() => {});
                    
                    let text = "";
                    try {
                        let res = await fetch('corpo.php').catch(() => null);
                        if (res && res.status === 200) {
                            text = await res.text();
                        } else {
                            text = docT.body.innerHTML;
                        }
                    } catch (e) {
                        text = docT.body.innerHTML;
                    }
                    
                    const docParser = new DOMParser().parseFromString(text, 'text/html');
                    const pageText = (docParser.body.textContent || "").replace(/\\s+/g, ' ');
                    
                    const extractField = (str, fn, nfn) => {
                        const regex = new RegExp(fn + ':?\\\\s*(.*?)\\\\s*(?:' + nfn + '|$)', 'i');
                        const match = str.match(regex);
                        return match ? match[1].trim() : '';
                    };

                    const personalData = {
                        rg: rg,
                        pai: extractField(pageText, 'PAI', 'MAE:'),
                        mae: extractField(pageText, 'MAE', 'Nome de Guerra:'),
                        nomeGuerra: extractField(pageText, 'Nome de Guerra', 'Nascimento:'),
                        nascimento: extractField(pageText, 'Nascimento', 'CPF:'),
                        cpf: extractField(pageText, 'CPF', 'PASEP:'),
                        pasep: extractField(pageText, 'PASEP', 'CNH:'),
                        cnh: extractField(pageText, 'CNH', 'CAT:'),
                        cnhCat: extractField(pageText, 'CAT', 'Grau de Instru'),
                        grauInstrucao: extractField(pageText, 'Grau de Instrução', 'E-mail:'),
                        email: extractField(pageText, 'E-mail', 'Nacionalidade:'),
                        nacionalidade: extractField(pageText, 'Nacionalidade', 'Naturalidade:'),
                        naturalidade: extractField(pageText, 'Naturalidade', 'Estado Civil:'),
                        estadoCivil: extractField(pageText, 'Estado Civil', 'Sexo:'),
                        sexo: extractField(pageText, 'Sexo', 'Tipo Sang'),
                        tipoSanguineo: extractField(pageText, 'Tipo Sangüíneo', 'Cor dos Cabelos:'),
                        corCabelos: extractField(pageText, 'Cor dos Cabelos', 'Cor dos Olhos:'),
                        corOlhos: extractField(pageText, 'Cor dos Olhos', 'Cútis:'),
                        cutis: extractField(pageText, 'Cútis', 'Altura:'),
                        altura: extractField(pageText, 'Altura', 'Num Calçado:'),
                        numCalcado: extractField(pageText, 'Num Calçado', 'Num Quepe:'),
                        numQuepe: extractField(pageText, 'Num Quepe', 'Num camisa:'),
                        numCamisa: extractField(pageText, 'Num camisa', 'Num Calça:'),
                        numCalca: extractField(pageText, 'Num Calça', 'Endereco'),
                        telefoneCelular: extractField(pageText, 'Telefone Celular', 'WhatsApp:'),
                        whatsapp: extractField(pageText, 'WhatsApp', 'Telefone Funcional:'),
                        telefoneFuncional: extractField(pageText, 'Telefone Funcional', 'Telefone Residencial:'),
                        telefoneResidencial: extractField(pageText, 'Telefone Residencial', 'OBM Atual:'),
                        obmAtual: extractField(pageText, 'OBM Atual', 'Comportamento:'),
                        comportamento: extractField(pageText, 'Comportamento', 'Data Boletim'),
                        dataBoletim: extractField(pageText, 'Data Boletim', 'Ala:'),
                        ala: extractField(pageText, 'Ala', 'Atividade na Ala:'),
                        atividadeAla: extractField(pageText, 'Atividade na Ala', 'Função:'),
                        funcao: extractField(pageText, 'Função', 'Função Específica:'),
                        funcaoEspecifica: extractField(pageText, 'Função Específica', 'Detalhes:'),
                        detalhes: extractField(pageText, 'Detalhes', 'Atividade:'),
                        atividade: extractField(pageText, 'Atividade', 'RG Anterior:'),
                        identidadeCivil: extractField(pageText, 'Identidade Civil', 'Orgao Emissor'),
                        orgaoEmissor: extractField(pageText, 'Orgao Emissor', 'Estado Emissor')
                    };
                    
                    if (personalData.nomeGuerra || personalData.cpf) {
                        finalData.push(personalData);
                    }
                    await new Promise(r => setTimeout(r, 800));

                } catch(e) {
                    console.error('Erro RG: ' + rg, e);
                }
            }

            if(finalData.length > 0) {
                // GM_xmlhttpRequest para evitar problemas com CORS
                GM_xmlhttpRequest({
                    method: "POST",
                    url: appUrl + '/api/admin/personal-data/bulk-sync',
                    data: JSON.stringify({ personalDataList: finalData }),
                    headers: { 
                       "Content-Type": "application/json",
                       "Accept": "application/json",
                       "x-api-key": "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123"
                    },
                    onload: function(res) {
                        if (res.status === 200) {
                            alert('🚀 Sincronizado com Sucesso! (' + finalData.length + ' militares)');
                        } else {
                            alert('Erro no Servidor: ' + res.status + '\\n\\nResposta: ' + res.responseText.substring(0, 200));
                        }
                    },
                    onerror: function(err) {
                        console.error('Erro GM_xmlhttpRequest:', err);
                        alert('Erro de Conexão. Verifique seu applet.');
                    }
                });
            } else {
                alert("Nenhum dado válido extraído.");
            }
            
            btn.disabled = false;
            btn.innerText = '🚀 MASS SYNC PESSOAL';
        };
        document.body.appendChild(btn);
    }

    createButton();
    setInterval(createButton, 3000);
})();
  `;

  useEffect(() => {
    const loadData = async () => {
       try {
          const q = query(collection(db, 'personalData'), orderBy('updatedAt', 'desc'), limit(50));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSyncedData(data);
       } catch(e) {
          console.error("Erro ao carregar personalData:", e);
       } finally {
          setLoading(false);
       }
    };
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full">
      <div className="mb-4 pt-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group mt-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
           <Users className="w-8 h-8" />
        </div>
        <div>
           <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Atualização Cadastral</h2>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
             Sincronização de Dados Pessoais via DGP
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 shadow-inner">
               <h3 className="text-emerald-600 font-black text-xs uppercase tracking-widest mb-4">
                  Como Sincronizar?
               </h3>
               <p className="text-slate-600 text-xs font-bold leading-relaxed mb-6">
                  Utilize a <span className="text-emerald-600">Extensão DGP</span> no Google Chrome ou o <span className="text-emerald-600">Tampermonkey</span> para extrair dados pessoais em massa.
               </p>
               <ol className="text-[10px] space-y-3 font-bold text-slate-500 uppercase tracking-wide">
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acesse o DGP da intranet</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Insira os RGs dos militares no script ou extensão</li>
                  <li className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Clique em <strong>Mass Sync Pessoal</strong></li>
               </ol>
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-8 shadow-xl text-white">
               <h3 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  Tampermonkey (Estável)
               </h3>
               <p className="text-slate-400 text-xs font-normal mb-6">
                 Copie o script abaixo, adicione uma nova nota no Tampermonkey e salve. Um botão verde de sincronização aparecerá em qualquer tela do DGP.
               </p>
               <div className="mb-4 text-center">
                 <button 
                   onClick={() => setUrlType(prev => prev === 'dev' ? 'pre' : 'dev')}
                   className="text-[9px] uppercase tracking-wider font-bold text-slate-500 hover:text-emerald-400"
                 >
                   Servidor alvo atual: {urlType === 'dev' ? 'Desenvolvimento' : 'Produção'} (clique para trocar)
                 </button>
               </div>
               <button 
                 onClick={() => {
                    navigator.clipboard.writeText(tampermonkeyCode);
                    alert('STRICT COPIADO!\nCole no painel do Tampermonkey e clique em salvar.');
                 }}
                 className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg hover:bg-emerald-500 transition-colors"
               >
                 COPIAR SCRIPT TAMPERMONKEY
               </button>
            </div>
         </div>

         <div className="lg:col-span-2">
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-full min-h-[500px]">
               <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-50">
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm flex items-center gap-2">
                     <TableIcon className="w-5 h-5 text-emerald-500" />
                     Últimos Dados Sincronizados
                  </h3>
                  <div className="text-[9px] font-black uppercase text-slate-400">
                     {syncedData.length} registros recentes
                  </div>
               </div>

               {loading ? (
                 <div className="flex-1 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-[10px]">
                    Carregando dados...
                 </div>
               ) : syncedData.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <Download className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Nenhum dado sincronizado ainda</p>
                 </div>
               ) : (
                 <div className="flex-1 overflow-auto pr-2 space-y-3">
                    {syncedData.map((d, i) => (
                       <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[9px] font-black tracking-tighter text-emerald-600">
                               RG<br/>{d.rg}
                             </div>
                             <div>
                                <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">{d.nomeGuerra || d.rg}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">{d.cpf} • {d.telefoneCelular || 'S/CEL'}</div>
                             </div>
                          </div>
                          <div className="flex flex-col text-right justify-center">
                             <div className="text-[9px] font-black text-slate-400 tracking-wider">
                               ATUALIZADO
                             </div>
                             <div className="text-[10px] font-bold text-slate-600">
                               {new Date(d.updatedAt).toLocaleDateString('pt-BR')}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
