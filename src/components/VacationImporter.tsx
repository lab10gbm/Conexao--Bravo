import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, TrendingUp, CheckCircle2, AlertCircle, FileJson, Table as TableIcon } from 'lucide-react';
import { Vacation } from '../types';

interface VacationImporterProps {
  militarRg: string;
  onImport: (vacations: Vacation[]) => void;
  onClose: () => void;
}

export function VacationImporter({ militarRg, onImport, onClose, allMilitars = [] }: VacationImporterProps & { allMilitars?: any[] }) {
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<Partial<Vacation>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showSource, setShowSource] = useState<'none' | 'extension' | 'tampermonkey'>('none');

  const parseData = (text: string) => {
    try {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const extracted: Partial<Vacation>[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Ano Ref.') || line.includes('DIRETORIA GERAL') || line.includes('AFASTAMENTOS')) continue;

        let parts = line.split('\t');
        if (parts.length < 5) {
          parts = line.split(/\s{2,}/);
        }

        const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
        const potentialDates = parts.filter(p => dateRegex.test(p));

        if (potentialDates.length >= 2) {
           const status: 'gozado' | 'marcado' | 'pendente' = potentialDates[0].includes('2026') ? 'marcado' : 'gozado';

           extracted.push({
             id: Math.random().toString(36).substr(2, 9),
             militarRg,
             ato: parts[1] || parts[0] || 'Concessão',
             anoRef: parts[2] || parts[1] || '',
             anoRetifi: parts[3] || '',
             dataInicio: potentialDates[0],
             dataRetorno: potentialDates[1],
             boletim: parts[6] || parts[5] || parts[4] || '',
             diasGozados: parseInt(parts[7]) || parseInt(parts[6]) || 0,
             diasAGozar: parseInt(parts[8]) || parseInt(parts[7]) || 0,
             boletimOrigem: parts[9] || parts[8] || '',
             obs: parts[10] || parts[parts.length - 1] || '',
             status
           });
        }
      }

      if (extracted.length === 0) {
        setError('Não foi possível identificar dados. Tente usar o botão de favorito acima ou copie a tabela novamente.');
      } else {
        setPreview(extracted);
        setError(null);
      }
    } catch (e) {
      setError('Erro ao processar os dados.');
    }
  };

  const handleProcess = () => {
    if (preview.length > 0) {
      onImport(preview as Vacation[]);
    }
  };

  const [urlType, setUrlType] = React.useState<'dev' | 'pre'>('dev');
  const rawAppUrl = window.location.origin;
  const appUrl = urlType === 'pre' ? rawAppUrl.replace('ais-dev-', 'ais-pre-') : rawAppUrl;
  const appDomain = new URL(appUrl).hostname;

  const tampermonkeyCode = `// ==UserScript==
// @name         Sincronizar DGP - Elite
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Bypass CORS e Sincronização Direta
// @author       10º GBM
// @match        *://cbmerj.rj.gov.br/*
// @match        *://*.cbmerj.rj.gov.br/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ${appDomain}
// @connect      ais-dev-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      ais-pre-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
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

    const APP_URL = '${appUrl.replace(/\/$/, '')}';

    function createButton() {
        if (document.getElementById('sync-dgp-btn-elite')) return;
        
        const btn = document.createElement('button');
        btn.id = 'sync-dgp-btn-elite';
        btn.innerText = '🚀 SINCRONIZAR DGP';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '2147483647';
        btn.style.padding = '12px 25px';
        btn.style.backgroundColor = '#ea580c';
        btn.style.color = '#fff';
        btn.style.border = '3px solid #fff';
        btn.style.borderRadius = '15px';
        btn.style.fontWeight = '900';
        btn.style.fontSize = '13px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
        btn.style.fontFamily = 'Arial, sans-serif';
        btn.style.transition = 'all 0.2s';
        
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';

        btn.onclick = async () => {
             const getTargetDoc = () => {
                const frames = ['corpo', 'main', 'frame_principal'];
                for (let fName of frames) {
                    try {
                        if (window.frames[fName] && window.frames[fName].document) return window.frames[fName].document;
                    } catch(e){}
                }
                return document;
             };

             const doc = getTargetDoc();
             const bodyText = doc.body.innerText;
             
             let rgMatch = bodyText.match(/RG[:\\s]*([\\d.]+)/i);
             let rg = rgMatch ? rgMatch[1].replace(/\\D/g, '') : null;
             
             if (!rg) {
                 let possibleRg = bodyText.match(/\\b(\\d{5})\\b/);
                 if (possibleRg) rg = possibleRg[1];
             }
             
             if (!rg) {
                 rg = prompt("RG não localizado automaticamente. Digite o RG:");
                 if (!rg) return;
             }
             
             btn.disabled = true;
             btn.innerText = '⌛ SINCRONIZANDO...';

             let lines = bodyText.split('\\n');
             let vacations = [];
             for (let line of lines) {
                if (!line.includes('/') && !line.includes('202')) continue;
                let cols = line.split('\\t').map(s => s.trim());
                if (cols.length < 5) continue;
                if (cols[0].toUpperCase() === 'ATO' || cols[1].toUpperCase().includes('ANO')) continue;
                
                let dtInicio = cols[4] || '';
                if (dtInicio.match(/\\d{2}\\/\\d{2}\\/\\d{4}/) || cols[1].toUpperCase().includes('ASSEGURADAS') || cols[1].toUpperCase().includes('PRESUMIDAS')) {
                   vacations.push({
                      militarRg: rg, 
                      ato: cols[1]||'Concessão', 
                      anoRef: cols[2]||'',
                      anoRetifi: cols[3]||'',
                      dataInicio: dtInicio, 
                      dataRetorno: cols[5]||'',
                      boletim: cols[6]||'', 
                      diasGozados: parseInt(cols[7])||0, 
                      diasAGozar: parseInt(cols[8])||0,
                      boletimOrigem: cols[9]||'',
                      obs: cols[10]||'',
                      status: dtInicio.includes('2026') || dtInicio.includes('2027') ? 'marcado' : 'gozado'
                   });
                }
             }
             
             if (vacations.length === 0) {
                 alert('RG encontrado (' + rg + '), mas Nenhuma férias mapeada/parseada na página.');
                 btn.disabled = false; btn.innerText = '🚀 SINCRONIZAR DGP';
                 return;
             }

             // USE GM_xmlhttpRequest TO POST DIRECTLY TO FIRESTORE VIA REST API (BYPASS CORS, BYPASS RENDER)
             const projectId = 'ai-studio-applet-webapp-33cfe';
             const apiKey = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
             const dbId = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';

             let writes = vacations.flatMap(v => {

                 let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\\//g, '');
                 return {
                     update: {
                         name: "projects/" + projectId + "/databases/" + dbId + "/documents/vacations/" + docId,
                         fields: {
                              id: { stringValue: docId },
                              militarRg: { stringValue: v.militarRg },
                              ato: { stringValue: v.ato || 'Concessão' },
                              anoRef: { stringValue: v.anoRef || '' },
                              anoRetifi: { stringValue: v.anoRetifi || '' },
                              dataInicio: { stringValue: v.dataInicio || '' },
                              dataRetorno: { stringValue: v.dataRetorno || '' },
                              boletim: { stringValue: v.boletim || '' },
                              boletimOrigem: { stringValue: v.boletimOrigem || '' },
                              diasGozados: { integerValue: String(v.diasGozados || 0) },
                              diasAGozar: { integerValue: String(v.diasAGozar || 0) },
                              obs: { stringValue: v.obs || '' },
                              status: { stringValue: v.status || 'gozado' },
                              updatedAt: { timestampValue: new Date().toISOString() }
                         }
                     }
                 };
             });

             GM_xmlhttpRequest({
                 method: "POST",
                 url: 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/' + dbId + '/documents:commit?key=' + apiKey,
                 data: JSON.stringify({ writes: writes }),
                 headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                 },
                 onload: function(res) {
                     if (res.status === 200) {
                         alert('🚀 Sincronizado com Sucesso Direto no Banco Firebase! (' + vacations.length + ' registros para o RG ' + rg + ')');
                     } else {
                         alert('Erro no Servidor: ' + res.status + '\\n\\nResposta: ' + res.responseText.substring(0, 200));
                     }
                     btn.disabled = false;
                     btn.innerText = '🚀 SINCRONIZAR DGP';
                 },
                 onerror: function(err) {
                     console.error('Erro GM_xmlhttpRequest:', err);
                     alert('Erro de Conexão Fatal para o Firebase. Verifique sua intranet: ' + JSON.stringify(err));
                     btn.disabled = false;
                     btn.innerText = '🚀 SINCRONIZAR DGP';
                 }
             });
        };
        document.body.appendChild(btn);
    }

    createButton();
    setInterval(createButton, 3000);
})();`;

  const bookmarkletCode = `javascript:(function(){
    try {
        const s = document.createElement('script'); s.textContent = 'window.over="over"; window.out="out"; try{for(let i=0;i<window.frames.length;i++){window.frames[i].window.over="over"; window.frames[i].window.out="out";}}catch(e){}'; document.documentElement.appendChild(s);
        const getDoc = () => {
            const frames = ['corpo', 'main', 'frame_principal'];
            for (let fName of frames) {
                try {
                    if (window.frames[fName] && window.frames[fName].document) return window.frames[fName].document;
                } catch(e){}
            }
            return document;
        };
        const doc = getDoc();
        const bodyText = doc.body.innerText;
        
        /* Check if we are on the 'Mapa da Forca' page */
        const isMapPage = bodyText.includes('MAPA DA FORÇA');
        const mapTables = doc.querySelectorAll('table[width="96%"]');

        if (isMapPage && mapTables.length > 0) {
            if (!confirm('Deseja realizar a extração RÁPIDA das férias de TODOS os miliares no Mapa da Força?')) return;
            let rowsData = [];
            mapTables.forEach(table => {
                Array.from(table.rows).forEach(row => {
                    const cells = Array.from(row.querySelectorAll('th, td')).map(c => c.innerText.trim());
                    if (cells.length > 5 && !cells.includes("Total")) {
                        const situacao = cells[cells.length - 2] || "";
                        if (situacao.includes('FERIAS')) {
                            const dateMatch = situacao.match(/(\\d{2}\\/\\d{2}\\/\\d{4})/);
                            const rg = (cells[4] || "").replace(/\\D/g, "");
                            if (rg) {
                                rowsData.push({
                                    militarRg: rg, ato: 'Mapa da Força', anoRef: '2026',
                                    dataInicio: 'Ver DGP', dataRetorno: dateMatch ? dateMatch[1] : "",
                                    status: 'marcado', obs: 'Sincronizado via Mapa da Força'
                                });
                            }
                        }
                    }
                });
            });
            if (rowsData.length === 0) return alert('Nenhum dado de férias encontrado.');
        const projectId = 'ai-studio-applet-webapp-33cfe';
        const apiKey = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
        const dbId = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';

        let writes = rowsData.flatMap(v => {
            let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\\//g, '');
            
        const fieldsObj = { id: { stringValue: docId }, militarRg: { stringValue: v.militarRg }, ato: { stringValue: v.ato || 'Concessão' }, anoRef: { stringValue: v.anoRef || '' }, anoRetifi: { stringValue: v.anoRetifi || '' }, dataInicio: { stringValue: v.dataInicio || '' }, dataRetorno: { stringValue: v.dataRetorno || '' }, boletim: { stringValue: v.boletim || '' }, boletimOrigem: { stringValue: v.boletimOrigem || '' }, diasGozados: { integerValue: String(v.diasGozados || 0) }, diasAGozar: { integerValue: String(v.diasAGozar || 0) }, obs: { stringValue: v.obs || '' }, status: { stringValue: v.status || 'gozado' }, updatedAt: { timestampValue: new Date().toISOString() } };
        let write1 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/vacations/" + docId, fields: fieldsObj } };
        let write2 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/militaries/" + v.militarRg + "/ferias/" + docId, fields: fieldsObj } };
        return [write1, write2];
    });

        fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/' + dbId + '/documents:commit?key=' + apiKey, {
            method: 'POST', 
            mode: 'cors', 
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ writes })
        }).then(async r => {
            if (r.ok) {
                alert('🚀 ' + rowsData.length + ' Férias Sincronizadas Diretamente no Firebase!');
            } else {
                const txt = await r.text();
                alert('Erro Firebase: ' + r.status + ' - ' + txt.substring(0, 200));
            }
        }).catch(e => {
            alert('Erro de Conexão Direta: ' + e);
        });
        return;
    }

    const findTable = () => {
      const allTables = doc.querySelectorAll('table');
      for (let t of allTables) {
        const text = (t.innerText || "").toUpperCase();
        if ((text.includes('ANO REF.') || text.includes('DIAS GOZADOS')) && (text.includes('DATA INÍCIO') || text.includes('DATA INICIO') || text.includes('BOL'))) return t;
      }
      return doc.querySelector('table[bgcolor="#FFFFFF"]') || doc.querySelector('table.listagem');
    };

    const table = findTable();
    if (!table) return alert('Tabela não encontrada. Abra: Afastamentos -> Férias.');
    
    let rgMatch = bodyText.match(/RG[:\\s]*([\\d.]+)/i);
    let rg = rgMatch ? rgMatch[1].replace(/\\D/g, '') : prompt("RG não localizado. Digite o RG:");
    if (!rg) return;

    const vacations = Array.from(table.rows).filter(r => r.cells.length >= 4 && ((r.textContent || "").includes('/') || (r.textContent || "").includes('202'))).map(r => {
        const c = Array.from(r.cells).map(td => (td.textContent || "").trim());
        if (c[0].toUpperCase() === 'ATO' || c[1].toUpperCase().includes('ANO')) return null;

        return {
            militarRg: rg, ato: c[1]||'Concessão', anoRef: c[2]||'', anoRetifi: c[3]||'',
            dataInicio: c[4]||'', dataRetorno: c[5]||'',
            boletim: c[6]||'', boletimOrigem: c[9]||'',
            diasGozados: parseInt(c[7])||0, diasAGozar: parseInt(c[8])||0, obs: c[10]||'',
            status: (c[4]||'').includes('2026') ? 'marcado' : 'gozado'
        };
    }).filter(v => v !== null);

    if (vacations.length === 0) return alert('Nenhuma férias válida encontrada.');
    
    const checkSync = () => {
        const projectId = 'ai-studio-applet-webapp-33cfe';
        const apiKey = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
        const dbId = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';
        let writes = vacations.flatMap(v => {

            let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\\//g, '');
            
        const fieldsObj = { id: { stringValue: docId }, militarRg: { stringValue: v.militarRg }, ato: { stringValue: v.ato || 'Concessão' }, anoRef: { stringValue: v.anoRef || '' }, anoRetifi: { stringValue: v.anoRetifi || '' }, dataInicio: { stringValue: v.dataInicio || '' }, dataRetorno: { stringValue: v.dataRetorno || '' }, boletim: { stringValue: v.boletim || '' }, boletimOrigem: { stringValue: v.boletimOrigem || '' }, diasGozados: { integerValue: String(v.diasGozados || 0) }, diasAGozar: { integerValue: String(v.diasAGozar || 0) }, obs: { stringValue: v.obs || '' }, status: { stringValue: v.status || 'gozado' }, updatedAt: { timestampValue: new Date().toISOString() } };
        let write1 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/vacations/" + docId, fields: fieldsObj } };
        let write2 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/militaries/" + v.militarRg + "/ferias/" + docId, fields: fieldsObj } };
        return [write1, write2];
    });

        fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/' + dbId + '/documents:commit?key=' + apiKey, {
            method: 'POST', 
            mode: 'cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ writes })
        }).then(async res => {
            if (res.ok) alert('🚀 Sincronizado Direto no Firebase: ' + vacations.length + ' registros!');
            else {
                const data = await res.text();
                alert('Falha: ' + res.status + ' - ' + data.substring(0, 100));
            }
        }).catch(e => alert('Erro de Conexão: ' + e));
    };

    checkSync();
  })();`.replace(/\s+/g, ' ').trim();

  const scannerCode = `javascript:(async function(){
    const s = document.createElement('script'); s.textContent = 'window.over="over"; window.out="out"; try{for(let i=0;i<window.frames.length;i++){window.frames[i].window.over="over"; window.frames[i].window.out="out";}}catch(e){}'; document.documentElement.appendChild(s);
    const rgs = ${JSON.stringify(allMilitars.map(m => m.rg.replace(/\D/g, '')))};
    if (!confirm('Deseja iniciar a VARREDURA em massa de ' + rgs.length + ' militares? Isso pode levar algum tempo.')) return;
    
    let total = 0;
    for (let rg of rgs) {
        try {
            console.log('Sincronizando: ' + rg);
            const fd = new FormData();
            fd.append('rg_cons', rg);
            fd.append('Submit', 'Pesquisar');
            
            let searchAction = 'consulta_mil.php';
            const f = document.querySelector('form');
            if (f && f.getAttribute('action')) { searchAction = f.getAttribute('action'); }
            await fetch(searchAction, { method: 'POST', body: fd }).catch(() => {});
            
            let htmlText = "";
            try {
                let res = await fetch('ferias.php').catch(() => null);
                if (!res || res.status !== 200) {
                    res = await fetch('afastamentos.php?opcao=ferias').catch(() => null);
                }
                if (res && res.status === 200) {
                    htmlText = await res.text();
                } else {
                    htmlText = document.body.innerHTML;
                }
            } catch (e) {
                htmlText = document.body.innerHTML;
            }
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            
            const findTable = (d) => {
              const allTables = d.querySelectorAll('table');
              for (let t of allTables) {
                const text = (t.textContent || "").toUpperCase();
                if ((text.includes('ANO REF.') || text.includes('DIAS GOZADOS')) && (text.includes('DATA INÍCIO') || text.includes('DATA INICIO') || text.includes('BOL'))) return t;
              }
              return d.querySelector('table[bgcolor="#FFFFFF"]');
            };

            const table = findTable(doc);
            if (table) {
                const rows = Array.from(table.rows).filter(r => r.cells.length >= 4 && ((r.textContent || "").includes('/') || (r.textContent || "").includes('202')));
                const vacations = rows.map(r => {
                    const c = Array.from(r.cells).map(td => (td.textContent || "").trim());
                    if (c[0].toUpperCase() === 'ATO' || c[1].toUpperCase().includes('ANO')) return null;

                    return {
                        militarRg: rg, ato: c[1]||'Concessão', anoRef: c[2]||'', anoRetifi: c[3]||'',
                        dataInicio: c[4]||'', dataRetorno: c[5]||'',
                        boletim: c[6]||'',
                        diasGozados: parseInt(c[7])||0, diasAGozar: parseInt(c[8])||0,
                        boletimOrigem: c[9]||'', obs: c[10]||'',
                        status: (c[4]||'').includes('2026') ? 'marcado' : 'gozado'
                    };
                }).filter(v => v !== null);
                if (vacations.length > 0) {
                    const projectId = 'ai-studio-applet-webapp-33cfe';
                    const apiKey = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
                    const dbId = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';
                    let writes = vacations.flatMap(v => {

                        let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\\//g, '');
                        
        const fieldsObj = { id: { stringValue: docId }, militarRg: { stringValue: v.militarRg }, ato: { stringValue: v.ato || 'Concessão' }, anoRef: { stringValue: v.anoRef || '' }, anoRetifi: { stringValue: v.anoRetifi || '' }, dataInicio: { stringValue: v.dataInicio || '' }, dataRetorno: { stringValue: v.dataRetorno || '' }, boletim: { stringValue: v.boletim || '' }, boletimOrigem: { stringValue: v.boletimOrigem || '' }, diasGozados: { integerValue: String(v.diasGozados || 0) }, diasAGozar: { integerValue: String(v.diasAGozar || 0) }, obs: { stringValue: v.obs || '' }, status: { stringValue: v.status || 'gozado' }, updatedAt: { timestampValue: new Date().toISOString() } };
        let write1 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/vacations/" + docId, fields: fieldsObj } };
        let write2 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/militaries/" + v.militarRg + "/ferias/" + docId, fields: fieldsObj } };
        return [write1, write2];
    });

                    await fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/' + dbId + '/documents:commit?key=' + apiKey, {
                        method: 'POST', 
                        mode: 'cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ writes })
                    }).catch(e => console.error('Erro no Lote (Firebase):', e));
                    total++;
                }
            }
        } catch(e) { console.error('Erro no RG ' + rg, e); }
    }
    alert('✅ VARREDURA CONCLUÍDA! ' + total + ' militares atualizados.');
  })();`.replace(/\n/g, '').trim();

  const bookmarkletRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    if (bookmarkletRef.current) {
      // Usar setTimeout para garantir que o React já terminou de processar o elemento
      const timer = setTimeout(() => {
        if (bookmarkletRef.current) {
          bookmarkletRef.current.setAttribute('href', bookmarkletCode);
          console.log("Atalho injetado via DOM real para evitar bloqueio do React.");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bookmarkletCode]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-orange-600 flex items-center justify-between text-white">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                 <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tighter">Sincronizador DGP de Elite</h2>
                 <p className="text-[10px] font-bold uppercase opacity-80 tracking-[0.2em] mt-1">Conectado ao Portal de Permutas</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
           </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
           {showSource !== 'none' ? (
              <div className="col-span-1 lg:col-span-2 space-y-6">
                 <button 
                   onClick={() => setShowSource('none')}
                   className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-colors"
                 >
                   ← Voltar
                 </button>

                 {showSource === 'tampermonkey' ? (
                    <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 shadow-inner">
                       <h3 className="text-orange-600 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                          Script para Tampermonkey
                       </h3>
                       <p className="text-slate-600 mb-6 text-sm">
                         O <strong>Tampermonkey</strong> é o método mais estável para sistemas antigos como o DGP.<br/>
                         1. Instale a extensão <strong>Tampermonkey</strong> no seu Chrome.<br/>
                         2. Clique no ícone do Tampermonkey e vá em "Criar novo script".<br/>
                         3. Apague tudo o que estiver lá e cole o código abaixo.<br/>
                         4. Salve (Arquivo - Salvar) e pronto! Um botão aparecerá no DGP.
                       </p>
                       <textarea 
                         readOnly
                         className="w-full h-80 bg-white border border-slate-200 rounded-2xl p-6 font-mono text-[10px] shadow-sm mb-4"
                         value={tampermonkeyCode}
                       />
                       <button 
                         onClick={() => {
                            navigator.clipboard.writeText(tampermonkeyCode);
                            alert('CÓDIGO COPIADO!\nAgora cole no Tampermonkey e salve.');
                         }}
                         className="w-full py-4 bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow-lg hover:bg-orange-700 transition-colors"
                       >
                         COPIAR CÓDIGO DO SCRIPT
                       </button>
                    </div>
                 ) : (
                    <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8">
                       <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest mb-4">Arquivos da Extensão DGP (Manual)</h3>
                       <p className="text-slate-600 mb-6 text-sm">
                         Crie uma pasta no seu computador chamada <strong>"ExtensaoDGP"</strong>.<br/>
                         Dentro dessa pasta, crie os arquivos abaixo e cole os respectivos códigos. <br/>
                         Em seguida, no Chrome, acesse <strong>chrome://extensions</strong>, ative o "Modo do desenvolvedor" e clique em "Carregar sem compactação".
                       </p>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {['manifest', 'content', 'popupjs', 'popuphtml'].map(file => {
                            const exactExt = file === 'manifest' ? '.json' : file === 'content' ? '.js' : file === 'popupjs' ? 'popup.js' : 'popup.html';
                            const link = `${appUrl}/api/admin/extension/raw/${file}`;
                            return (
                              <div key={file} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm group">
                                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-4">{file === 'manifest' ? 'manifest.json' : file === 'content' ? 'content.js' : exactExt}</h4>
                                <a 
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-full py-3 bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 rounded-xl text-center font-black text-[10px] uppercase tracking-widest transition-colors"
                                >
                                   VER CÓDIGO FONTE ({exactExt.toUpperCase()})
                                </a>
                              </div>
                            )
                         })}
                       </div>
                    </div>
                 )}
              </div>
           ) : (
            <div className="space-y-8">
               <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                  <h3 className="text-orange-400 font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                     <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                     Sincronização Ativa
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-8">
                    Escolha o método que melhor se adapta ao seu computador no quartel. O <strong>Tampermonkey</strong> é o mais recomendado por ser definitivo.
                  </p>
                  
                  <div className="bg-zinc-900/50 p-4 rounded-2xl mb-6 border border-zinc-800 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-zinc-400 text-[10px] uppercase font-black tracking-[0.2em]">Conexão do Servidor</p>
                      <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                       <button 
                         onClick={() => setUrlType('pre')}
                         className={`py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${urlType === 'pre' ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         Produção (PRE)
                       </button>
                       <button 
                         onClick={() => setUrlType('dev')}
                         className={`py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${urlType === 'dev' ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         Desenvolvimento
                       </button>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-3 text-center space-y-1">
                      <p>{urlType === 'pre' ? '⚠️ Erro 503? Clique no botão "Share" no TOPO Roxo da tela!' : '⚡ Conectado ao servidor de código vivo.'}</p>
                      {urlType === 'pre' && (
                        <p className="text-orange-500/80 font-bold uppercase tracking-tighter">O botão SHARE fica fora do app, no topo do Studio</p>
                      )}
                      <div className="flex justify-center gap-4 mt-2">
                        <button 
                          onClick={() => {
                            fetch(`${appUrl}/api/health`)
                              .then(r => r.json())
                              .then(d => alert(`✅ CONEXÃO OK!\nBanco: ${d.db}\nSincronizador: Pronto`))
                              .catch(e => alert(`❌ FALHA: ${e.message}`));
                          }}
                          className="text-zinc-400 hover:text-white underline font-bold"
                        >
                          TESTAR CONEXÃO
                        </button>
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-orange-400 hover:text-orange-300 underline font-bold"
                        >
                          ATUALIZAR PAINEL
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <a 
                       ref={bookmarkletRef}
                       onClick={(e) => {
                          if (e.button === 0) { // Left click only
                            e.preventDefault();
                            navigator.clipboard.writeText(bookmarkletCode);
                            alert('CÓDIGO COPIADO!\n\nCOMO USAR:\n1. Arraste este botão para sua barra de favoritos\nOU\n2. Crie um favorito novo e cole o código na URL.');
                          }
                       }}
                       className="block relative w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl text-center font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-3 cursor-move group"
                     >
                       <span className="relative z-10 flex items-center gap-2">
                         <span className="animate-bounce">🚀</span> ARRASTE O ATALHO SINCRONIZAR
                       </span>
                     </a>

                     <button 
                       onClick={() => setShowSource('tampermonkey')}
                       className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-center font-black text-[9px] uppercase tracking-[0.3em] transition-all shadow-lg flex items-center justify-center gap-2"
                     >
                        🐵 MODO ESTÁVEL (TAMPERMONKEY)
                     </button>

                     <button 
                       onClick={() => setShowSource('extension')}
                       className="block w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-center font-black text-[9px] uppercase tracking-[0.3em] transition-all border border-white/10"
                     >
                        📝 MODO EXTENSÃO (CARREGAR MANUAL)
                     </button>
                  </div>
                  <p className="mt-4 text-center text-[10px] text-orange-500 font-black uppercase tracking-widest animate-pulse italic text-balance">Recomendamos remover versões antigas antes de instalar estas!</p>
               </div>

               <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8">
                  <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-6">Como funciona no quartel?</h3>
                  <div className="space-y-4">
                     {[
                       "Abra o DGP na aba de Férias do militar.",
                       "Use o botão do Tampermonkey (superior direito) ou o Favorito.",
                       "Os dados viajam sozinhos para este sistema.",
                       "Nenhum dado sensível é capturado, apenas as datas de férias."
                     ].map((step, i) => (
                       <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</div>
                          <p className="text-xs text-slate-600 font-bold leading-relaxed">{step}</p>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
           )}

           <div className="flex flex-col h-full">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                 <TableIcon className="w-4 h-4" /> Importação Manual (Backup)
              </h3>
              
              <div className="flex-1 flex flex-col gap-6">
                <textarea 
                  className="w-full h-48 bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 font-mono text-[11px] focus:border-orange-500 transition-all outline-none resize-none shadow-inner"
                  placeholder="Se o botão não funcionar, cole os dados aqui..."
                  value={inputText}
                  onChange={(e) => {
                     setInputText(e.target.value);
                     parseData(e.target.value);
                  }}
                />

                <div className="flex-1 min-h-[200px] border-2 border-dashed border-slate-200 rounded-3xl p-6 overflow-y-auto">
                   {error ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                         <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                         <p className="text-slate-400 text-[10px] font-black uppercase leading-relaxed">{error}</p>
                      </div>
                   ) : preview.length > 0 ? (
                      <div className="space-y-3">
                         {preview.map((v, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">R:{v.anoRef}</div>
                                  <div>
                                     <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">{v.dataInicio} - {v.dataRetorno}</div>
                                     <div className="text-[9px] font-bold text-slate-400 uppercase">{v.boletim}</div>
                                  </div>
                               </div>
                               <div className="text-right font-black text-slate-400 text-[10px] uppercase">
                                  {v.diasGozados}D
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                         <FileJson className="w-16 h-16 text-slate-300 mb-4" />
                         <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Aguardando dados...</p>
                      </div>
                   )}
                </div>

                <button 
                  onClick={handleProcess}
                  disabled={preview.length === 0}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-4 shadow-xl"
                >
                   <CheckCircle2 className="w-5 h-5" /> Importar {preview.length} Registros
                </button>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
