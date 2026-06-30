import{c as W,u as ne,r as i,j as e,q as re,U as q,a2 as V,C as L,w as $,z as Y,k as u,x as X,ae as H,P as J,l as j,o as T}from"./index-CNaZzWnl.js";import{T as D}from"./table-B0UXk0i1.js";import{F as le}from"./file-json-D_oFD6RZ.js";import{F as ie}from"./file-text-DnJ6UiRL.js";/**
 * @license lucide-react v0.479.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ce=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],de=W("ExternalLink",ce);/**
 * @license lucide-react v0.479.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]],xe=W("TrendingUp",pe),me=()=>`
{
    id: 'sync_vacation',
    label: '🚀 Sincronizar Férias',
    color: '#ea580c', // Orange
    action: async (btn) => {
        const getTargetDoc = () => {
            const frames = ['corpo', 'main', 'frame_principal'];
            for (let fName of frames) {
                try {
                    let topFrames = window.top ? window.top.frames : window.frames;
                    if (topFrames[fName] && topFrames[fName].document) return topFrames[fName].document;
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
        let originalText = btn.innerText;
        btn.innerText = '⌛ SINCRONIZANDO...';

        let lines = bodyText.split('\\n');
        let vacations = [];
        for (let line of lines) {
            if (!line.includes('/') && !line.includes('202')) continue;
            let cols = line.split('\\t').map(s => s.trim());
            if (cols.length < 5) continue;
            if (cols[0].toUpperCase() === 'ATO' || cols[1].toUpperCase().includes('ANO')) continue;
            
            let dtInicio = cols[3] || '';
            if (dtInicio.match(/\\d{2}\\/\\d{2}\\/\\d{4}/) || cols[0].toUpperCase().includes('ASSEGURADAS') || cols[0].toUpperCase().includes('PRESUMIDAS')) {
                vacations.push({
                    militarRg: rg, 
                    ato: cols[0]||'Concessão', 
                    anoRef: cols[1]||'',
                    anoRetifi: cols[2]||'',
                    dataInicio: dtInicio, 
                    dataRetorno: cols[4]||'',
                    boletim: cols[5]||'',
                    boletimOrigem: cols[6]||'',
                    diasGozados: parseInt(cols[7])||0, 
                    diasAGozar: parseInt(cols[8])||0,
                    obs: cols[9]||'',
                    status: dtInicio.includes('2026') || dtInicio.includes('2027') ? 'marcado' : 'gozado'
                });
            }
        }
        
        if (vacations.length === 0) {
            alert('RG encontrado (' + rg + '), mas Nenhuma férias mapeada/parseada na página.');
            btn.disabled = false; btn.innerText = originalText;
            return;
        }

        let writes = vacations.flatMap(v => {
            let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\\//g, '');
            return {
                update: {
                    name: "projects/" + FIREBASE_PROJECT_ID + "/databases/" + FIREBASE_DB_ID + "/documents/vacations/" + docId,
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
            url: 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/' + FIREBASE_DB_ID + '/documents:commit?key=' + FIREBASE_API_KEY,
            data: JSON.stringify({ writes: writes }),
            headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
            },
            onload: function(res) {
                if (res.status === 200) {
                    alert('🚀 Sincronizado com Sucesso! (' + vacations.length + ' registros para o RG ' + rg + ')');
                } else {
                    alert('Erro no Servidor: ' + res.status + '\\n\\nResposta: ' + res.responseText.substring(0, 200));
                }
                btn.disabled = false;
                btn.innerText = originalText;
            },
            onerror: function(err) {
                console.error('Erro GM_xmlhttpRequest:', err);
                alert('Erro de Conexão. Verifique sua intranet.');
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }
}
`,ue=()=>`
{
    id: 'sync_personal',
    label: '👥 Sync Pessoal (Atual)',
    color: '#10b981', // Emerald
    action: async (btn) => {
        let originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = '⌛ EXTRAINDO...';

        try {
            const extractData = (doc) => {
                const pageText = (doc.body.textContent || "").replace(/\\s+/g, ' ');
                
                const extractField = (str, fn, nfn) => {
                    const regex = new RegExp(fn + ':?\\\\s*(.*?)\\\\s*(?:' + nfn + '|$)', 'i');
                    const match = str.match(regex);
                    return match ? match[1].trim() : '';
                };

                let rgMatch = pageText.match(/RG:\\s*([\\d.]+)/i) || pageText.match(/RG\\s*([\\d.]+)/i);
                const rg = rgMatch ? rgMatch[1].replace(/\\D/g, '') : '';

                if (!rg) return null;

                return {
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
            };

            let data = extractData(document);
            if (!data) {
                // Try from frame 'corpo' if available
                const docT = window.frames['corpo']?.document;
                if (docT) {
                    data = extractData(docT);
                }
            }

            if (data && (data.nomeGuerra || data.cpf)) {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: APP_URL + '/api/admin/personal-data/bulk-sync',
                    data: JSON.stringify({ personalDataList: [data] }),
                    headers: { 
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123"
                    },
                    onload: function(res) {
                        if (res.status === 200) {
                            alert('🚀 Militar ' + data.nomeGuerra + ' (RG ' + data.rg + ') Sincronizado com Sucesso!');
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
                alert("Nenhum dado pessoal válido extraído. Navegue até a página 'Dados Pessoais' do militar.");
            }
        } catch(e) {
            console.error(e);
            alert("Erro na extração dos dados pessoais.");
        }
        
        btn.disabled = false;
        btn.innerText = originalText;
    }
}
`,ge=()=>`
{
    id: 'sync_promotion',
    label: '⭐ Sync Promoções',
    color: '#3b82f6', // Blue
    action: async (btn) => {
        let originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = '⌛ EXTRAINDO...';

        try {
            const extractData = (doc) => {
                const pageText = (doc.body.textContent || "").replace(/\\s+/g, ' ');
                
                let rgMatch = pageText.match(/RG\\s*([\\d.]+)/i);
                const rg = rgMatch ? rgMatch[1].replace(/\\D/g, '') : '';

                if (!rg) return null;

                const tables = doc.querySelectorAll('table');
                let targetTable = null;
                for (let table of tables) {
                    if (table.textContent.includes('*Promoções') && table.textContent.includes('Ao Posto de')) {
                        targetTable = table;
                        break;
                    }
                }

                if (!targetTable) return { rg };

                const rows = targetTable.querySelectorAll('tr');
                const promotions = [];
                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].querySelectorAll('td');
                    if (cols.length >= 5) {
                        promotions.push({
                            ato: cols[0].textContent.trim(),
                            criterio: cols[1].textContent.trim(),
                            posto: cols[2].textContent.trim(),
                            boletim: cols[3].textContent.trim(),
                            dataPromocao: cols[4].textContent.trim(),
                            observacoes: cols[5] ? cols[5].textContent.trim() : ''
                        });
                    }
                }

                // Get the first promotion date (which should be the most recent / highest)
                let promotionDate = '';
                if (promotions.length > 0) {
                    promotionDate = promotions[0].dataPromocao;
                }

                return {
                    rg,
                    promotions,
                    promotionDate
                };
            };

            let data = extractData(document);
            if (!data) {
                const docT = window.frames['corpo']?.document;
                if (docT) {
                    data = extractData(docT);
                }
            }

            if (data && data.rg) {
                if (!data.promotions || data.promotions.length === 0) {
                    alert("Militar encontrado, mas nenhuma tabela de promoção localizada. Verifique se está na página de promoções.");
                    btn.disabled = false;
                    btn.innerText = originalText;
                    return;
                }

                GM_xmlhttpRequest({
                    method: "POST",
                    url: APP_URL + '/api/admin/personal-data/bulk-sync',
                    data: JSON.stringify({ personalDataList: [data] }),
                    headers: { 
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "x-api-key": "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123"
                    },
                    onload: function(res) {
                        if (res.status === 200) {
                            alert('🚀 Promoções do militar (RG ' + data.rg + ') Sincronizadas com Sucesso!');
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
                alert("Nenhum dado válido extraído. Navegue até a página 'Promoções' do militar.");
            }
        } catch(e) {
            console.error(e);
            alert("Erro na extração das promoções.");
        }
        
        btn.disabled = false;
        btn.innerText = originalText;
    }
}
`,fe=b=>{const C="ai-studio-applet-webapp-33cfe",p="AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY",h="ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92",g=b.endsWith("/")?b.slice(0,-1):b;return`// ==UserScript==
// @name         Sincronizador Universal DGP CBMERJ
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Suite Completa DGP - Sincronização de Férias, Pessoal, Promoções etc. (Botão Flutuante)
// @author       10º GBM
// @match        *://cbmerj.rj.gov.br/*
// @match        *://*.cbmerj.rj.gov.br/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ${new URL(g).hostname}
// @connect      firestore.googleapis.com
// @connect      ais-pre-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      ais-dev-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // Evita duplicatas limitando a injeção ao frame principal ou top window
    if (window.top !== window.self) {
        if (!['corpo', 'main', 'frame_principal'].includes(window.name)) return;
    } else {
        if (document.body && document.body.tagName.toLowerCase() === 'frameset') return;
    }

    try {
        const fixGlobals = (win) => { win.over="over"; win.out="out"; };
        fixGlobals(window);
        const script = document.createElement('script');
        script.textContent = 'window.over="over"; window.out="out"; try{for(let i=0;i<window.frames.length;i++){window.frames[i].window.over="over"; window.frames[i].window.out="out";}}catch(e){}';
        if (document.documentElement) document.documentElement.appendChild(script);
    } catch(e) {}

    const APP_URL = '${g}';
    const FIREBASE_PROJECT_ID = '${C}';
    const FIREBASE_API_KEY = '${p}';
    const FIREBASE_DB_ID = '${h}';

    const extractors = [
        ${me()},
        ${ue()},
        ${ge()}
    ];

    function createUI() {
        if (document.getElementById('sync-dgp-container-universal')) return;
        if (!document.body) return; // Aguarda o body existir
        
        let container = document.createElement('div');
        container.id = 'sync-dgp-container-universal';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '2147483647';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'flex-end';
        container.style.gap = '10px';
        container.style.fontFamily = 'Arial, sans-serif';

        let menu = document.createElement('div');
        menu.style.display = 'none';
        menu.style.flexDirection = 'column';
        menu.style.gap = '8px';
        menu.style.backgroundColor = '#fff';
        menu.style.padding = '10px';
        menu.style.borderRadius = '12px';
        menu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        menu.style.border = '2px solid #334155';
        
        let title = document.createElement('div');
        title.innerText = 'Suite de Sincronização';
        title.style.fontSize = '12px';
        title.style.fontWeight = 'bold';
        title.style.color = '#64748b';
        title.style.borderBottom = '1px solid #e2e8f0';
        title.style.paddingBottom = '6px';
        title.style.marginBottom = '4px';
        title.style.textAlign = 'center';
        menu.appendChild(title);

        // Dynamically add buttons for each extractor
        extractors.forEach(ext => {
            let btnSync = document.createElement('button');
            btnSync.innerText = ext.label;
            btnSync.style.padding = '10px 15px';
            btnSync.style.backgroundColor = ext.color || '#334155';
            btnSync.style.color = '#fff';
            btnSync.style.border = 'none';
            btnSync.style.borderRadius = '8px';
            btnSync.style.fontWeight = 'bold';
            btnSync.style.cursor = 'pointer';
            btnSync.style.fontSize = '14px';
            btnSync.style.transition = 'opacity 0.2s';
            btnSync.style.width = '100%';
            
            btnSync.onmouseover = () => btnSync.style.opacity = '0.85';
            btnSync.onmouseout = () => btnSync.style.opacity = '1';

            btnSync.onclick = async () => {
                menu.style.display = 'none';
                try {
                    await ext.action(btnSync);
                } catch (e) {
                    console.error('Erro na ação do extrator:', e);
                    alert("Erro interno na extração.");
                    btnSync.disabled = false;
                    btnSync.innerText = ext.label;
                }
            };
            menu.appendChild(btnSync);
        });

        let fab = document.createElement('div');
        fab.innerHTML = '⚙️';
        fab.title = 'Universal Sync DGP';
        fab.style.width = '60px';
        fab.style.height = '60px';
        fab.style.borderRadius = '30px';
        fab.style.backgroundColor = '#334155';
        fab.style.color = 'white';
        fab.style.display = 'flex';
        fab.style.alignItems = 'center';
        fab.style.justifyContent = 'center';
        fab.style.fontSize = '28px';
        fab.style.cursor = 'grab';
        fab.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
        fab.style.userSelect = 'none';
        fab.style.transition = 'transform 0.2s';

        fab.onmouseover = () => { if (!isDragging) fab.style.transform = 'scale(1.05)'; };
        fab.onmouseout = () => { if (!isDragging) fab.style.transform = 'scale(1)'; };

        let isDragging = false;
        let startX, startY, initialX, initialY;

        fab.onmousedown = function(e) {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            initialX = container.offsetLeft;
            initialY = container.offsetTop;
            isDragging = false;
            fab.style.cursor = 'grabbing';
            fab.style.transform = 'scale(0.95)';
            document.addEventListener('mousemove', mouseMove);
            document.addEventListener('mouseup', mouseUp);
        };

        function mouseMove(e) {
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                isDragging = true;
                menu.style.display = 'none';
            }
            container.style.right = 'auto'; 
            container.style.bottom = 'auto';
            container.style.left = (initialX + dx) + 'px';
            container.style.top = (initialY + dy) + 'px';
        }

        function mouseUp() {
            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);
            fab.style.cursor = 'grab';
            fab.style.transform = 'scale(1)';
            
            if (!isDragging) {
                menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }
            setTimeout(() => isDragging = false, 50);
        }

        container.appendChild(menu);
        container.appendChild(fab);
        document.body.appendChild(container);
    }

    // Intervalo reduzido para checar existência
    setInterval(createUI, 2000);
})();`};function we({user:b,onBack:C}){ne();const[p,h]=i.useState("ferias"),[g,E]=i.useState([]),[Q,K]=i.useState(!0),[S,I]=i.useState("dev"),[Z,F]=i.useState(""),[x,A]=i.useState([]),[P,y]=i.useState(null),[v,k]=i.useState("none"),[d,G]=i.useState(""),[ee,O]=i.useState(""),[l,w]=i.useState(null),[_,N]=i.useState(null),M=window.location.origin,z=S==="pre"?M.replace("ais-dev-","ais-pre-"):M,U=fe(z);i.useEffect(()=>{(async()=>{try{const t=$(Y(u,"personalData"),X("updatedAt","desc"),H(50)),r=(await J(t)).docs.map(n=>({id:n.id,...n.data()}));E(r)}catch(t){console.error("Erro ao carregar personalData:",t)}finally{K(!1)}})()},[]);const te=o=>{try{const t=o.split(`
`).map(n=>n.trim()).filter(n=>n.length>0),a=[];let r=d;if(!r){let n=o.match(/RG[:\s]*([\d.]+)/i);n&&(r=n[1].replace(/\D/g,""))}for(let n=0;n<t.length;n++){const c=t[n];if(c.includes("Ano Ref.")||c.includes("DIRETORIA GERAL")||c.includes("AFASTAMENTOS"))continue;let s=c.split("	");s.length<5&&(s=c.split(/\s{2,}/));const R=/\d{2}\/\d{2}\/\d{4}/,m=s.filter(f=>R.test(f));if(m.length>=2){const f=m[0].includes("2026")?"marcado":"gozado";a.push({id:Math.random().toString(36).substr(2,9),militarRg:r||"00000",ato:s[1]||s[0]||"Concessão",anoRef:s[2]||s[1]||"",anoRetifi:s[3]||"",dataInicio:m[0],dataRetorno:m[1],boletim:s[6]||s[5]||s[4]||"",diasGozados:parseInt(s[7])||parseInt(s[6])||0,diasAGozar:parseInt(s[8])||parseInt(s[7])||0,boletimOrigem:s[9]||s[8]||"",obs:s[10]||s[s.length-1]||"",status:f})}}a.length===0?y("Não foi possível identificar dados. Tente usar a extensão ou copie a tabela de férias novamente."):r?(A(a),y(null)):(y("RG não encontrado no texto. Por favor, insira o RG no campo acima."),A(a))}catch{y("Erro ao processar os dados.")}},ae=async()=>{var o;if(x.length>0&&d)try{for(const t of x){const a=`${d}_${t.anoRef}_${(o=t.dataInicio)==null?void 0:o.replace(/\//g,"")}`,r={...t,militarRg:d,updatedAt:new Date().toISOString()};await j(T(u,"vacations",a),r,{merge:!0}),await j(T(u,"militaries",d,"ferias",a),r,{merge:!0})}alert("Dados de férias importados com sucesso!"),F(""),A([]),G("")}catch(t){console.error(t),alert("Erro ao importar férias.")}else alert("RG ausente ou sem registros para importar.")},oe=o=>{try{const t=o.replace(/\s+/g," "),a=(s,R,m)=>{const f=new RegExp(R+":?\\s*(.*?)\\s*(?:"+m+"|$)","i"),B=s.match(f);return B?B[1].trim():""};let r=t.match(/RG:\s*([\d.]+)/i)||t.match(/RG\s*([\d.]+)/i);const n=r?r[1].replace(/\D/g,""):"";if(!n){N("RG não encontrado no texto. Cole a página de dados do militar."),w(null);return}const c={rg:n,pai:a(t,"PAI","MAE:"),mae:a(t,"MAE","Nome de Guerra:"),nomeGuerra:a(t,"Nome de Guerra","Nascimento:"),nascimento:a(t,"Nascimento","CPF:"),cpf:a(t,"CPF","PASEP:"),pasep:a(t,"PASEP","CNH:"),cnh:a(t,"CNH","CAT:"),cnhCat:a(t,"CAT","Grau de Instru"),grauInstrucao:a(t,"Grau de Instrução","E-mail:"),email:a(t,"E-mail","Nacionalidade:"),nacionalidade:a(t,"Nacionalidade","Naturalidade:"),naturalidade:a(t,"Naturalidade","Estado Civil:"),estadoCivil:a(t,"Estado Civil","Sexo:"),sexo:a(t,"Sexo","Tipo Sang"),tipoSanguineo:a(t,"Tipo Sangüíneo","Cor dos Cabelos:"),corCabelos:a(t,"Cor dos Cabelos","Cor dos Olhos:"),corOlhos:a(t,"Cor dos Olhos","Cútis:"),cutis:a(t,"Cútis","Altura:"),altura:a(t,"Altura","Num Calçado:"),numCalcado:a(t,"Num Calçado","Num Quepe:"),numQuepe:a(t,"Num Quepe","Num camisa:"),numCamisa:a(t,"Num camisa","Num Calça:"),numCalca:a(t,"Num Calça","Endereco"),telefoneCelular:a(t,"Telefone Celular","WhatsApp:"),whatsapp:a(t,"WhatsApp","Telefone Funcional:"),telefoneFuncional:a(t,"Telefone Funcional","Telefone Residencial:"),telefoneResidencial:a(t,"Telefone Residencial","OBM Atual:"),obmAtual:a(t,"OBM Atual","Comportamento:"),comportamento:a(t,"Comportamento","Data Boletim"),dataBoletim:a(t,"Data Boletim","Ala:"),ala:a(t,"Ala","Atividade na Ala:"),atividadeAla:a(t,"Atividade na Ala","Função:"),funcao:a(t,"Função","Função Específica:"),funcaoEspecifica:a(t,"Função Específica","Detalhes:"),detalhes:a(t,"Detalhes","Atividade:"),atividade:a(t,"Atividade","RG Anterior:"),identidadeCivil:a(t,"Identidade Civil","Orgao Emissor"),orgaoEmissor:a(t,"Orgao Emissor","Estado Emissor")};c.nomeGuerra||c.cpf?(w(c),N(null)):(N("Não foi possível extrair os dados. Copie todo o texto da página de consulta do militar."),w(null))}catch{N("Erro ao processar os dados pessoais.")}},se=async()=>{if(l&&l.rg)try{const o={...l,updatedAt:new Date().toISOString()};await j(T(u,"personalData",l.rg),o,{merge:!0}),await j(T(u,"militaries",l.rg),o,{merge:!0}),alert("Dados pessoais importados com sucesso!"),O(""),w(null);const t=$(Y(u,"personalData"),X("updatedAt","desc"),H(50)),a=await J(t);E(a.docs.map(r=>({id:r.id,...r.data()})))}catch(o){console.error(o),alert("Erro ao importar dados pessoais.")}};return e.jsxs("div",{className:"flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full",children:[e.jsx("div",{className:"mb-4 pt-12",children:e.jsxs("button",{onClick:C,className:"flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group mt-6",children:[e.jsx(re,{className:"w-4 h-4 group-hover:-translate-x-1 transition-transform"}),"Voltar"]})}),e.jsxs("div",{className:"flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl",children:e.jsx(xe,{className:"w-8 h-8"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-black text-slate-800 uppercase tracking-tight",children:"DGP Sync"}),e.jsx("p",{className:"text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1",children:"Sincronização Universal (Férias e Pessoal)"})]})]}),e.jsxs("button",{onClick:()=>window.open("https://cbmerj.rj.gov.br/dgp/sistema/relatorio_mapa_forca.php","_blank"),className:"px-6 py-4 bg-slate-100 text-slate-600 border-2 border-slate-200 rounded-2xl hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-sm",children:[e.jsx(de,{className:"w-5 h-5"})," Acessar DGP"]})]}),e.jsxs("div",{className:"flex gap-4 mb-2",children:[e.jsxs("button",{onClick:()=>h("ferias"),className:`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${p==="ferias"?"bg-orange-600 text-white shadow-lg":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`,children:[e.jsx(D,{className:"w-4 h-4"})," Controle de Férias"]}),e.jsxs("button",{onClick:()=>h("pessoal"),className:`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${p==="pessoal"?"bg-emerald-600 text-white shadow-lg":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`,children:[e.jsx(q,{className:"w-4 h-4"})," Dados Pessoais"]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-8",children:[v!=="none"?e.jsxs("div",{className:"col-span-1 lg:col-span-2 space-y-6",children:[e.jsx("button",{onClick:()=>k("none"),className:"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-colors",children:"← Voltar"}),v==="tampermonkey"?e.jsxs("div",{className:"bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 shadow-inner",children:[e.jsxs("h3",{className:"text-orange-600 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx("div",{className:"w-2 h-2 bg-orange-600 rounded-full animate-pulse"}),"Script para Tampermonkey (Recomendado)"]}),e.jsxs("p",{className:"text-slate-600 mb-6 text-sm",children:["O ",e.jsx("strong",{children:"Tampermonkey"})," é o método mais estável para sistemas antigos como o DGP.",e.jsx("br",{}),"1. Instale a extensão ",e.jsx("strong",{children:"Tampermonkey"})," no seu Chrome.",e.jsx("br",{}),'2. Clique no ícone do Tampermonkey e vá em "Criar novo script".',e.jsx("br",{}),"3. Apague tudo o que estiver lá e cole o código abaixo.",e.jsx("br",{}),"4. Salve (Arquivo - Salvar) e pronto! Um botão Universal aparecerá em todas as páginas do DGP."]}),e.jsx("textarea",{readOnly:!0,className:"w-full h-80 bg-white border border-slate-200 rounded-2xl p-6 font-mono text-[10px] shadow-sm mb-4",value:U}),e.jsx("button",{onClick:()=>{navigator.clipboard.writeText(U).then(()=>{alert(`CÓDIGO COPIADO!
Agora cole no Tampermonkey e salve.`)}).catch(o=>{console.error("Failed to copy",o),alert("Erro ao copiar.")})},className:"w-full py-4 bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow-lg hover:bg-orange-700 transition-colors",children:"COPIAR CÓDIGO DO SCRIPT"})]}):e.jsxs("div",{className:"bg-slate-50 border-2 border-slate-100 rounded-3xl p-8",children:[e.jsx("h3",{className:"text-slate-800 font-black text-sm uppercase tracking-widest mb-4",children:"Arquivos da Extensão DGP (Manual)"}),e.jsxs("p",{className:"text-slate-600 mb-6 text-sm",children:["Crie uma pasta no seu computador chamada ",e.jsx("strong",{children:'"ExtensaoDGP"'}),".",e.jsx("br",{}),"Dentro dessa pasta, crie os arquivos abaixo e cole os respectivos códigos. ",e.jsx("br",{}),"Em seguida, no Chrome, acesse ",e.jsx("strong",{children:"chrome://extensions"}),', ative o "Modo do desenvolvedor" e clique em "Carregar sem compactação".']}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:["manifest","content","popupjs","popuphtml"].map(o=>{const t=o==="manifest"?".json":o==="content"?".js":o==="popupjs"?"popup.js":"popup.html",a=`${z}/api/admin/extension/raw/${o}`;return e.jsxs("div",{className:"bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm group",children:[e.jsx("h4",{className:"font-black text-slate-800 uppercase tracking-widest text-xs mb-4",children:o==="manifest"?"manifest.json":o==="content"?"content.js":t}),e.jsxs("a",{href:a,target:"_blank",rel:"noreferrer",className:"block w-full py-3 bg-slate-100 text-slate-800 group-hover:bg-slate-200 rounded-xl text-center font-black text-[10px] uppercase tracking-widest transition-colors",children:["VER CÓDIGO FONTE (",t.toUpperCase(),")"]})]},o)})})]})]}):e.jsxs("div",{className:"space-y-8",children:[e.jsxs("div",{className:"bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group",children:[e.jsx("div",{className:"absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"}),e.jsxs("h3",{className:"text-orange-400 font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-3",children:[e.jsx("div",{className:"w-2 h-2 bg-orange-400 rounded-full animate-pulse"}),"Sincronização Automática"]}),e.jsxs("p",{className:"text-[11px] text-slate-300 font-medium leading-relaxed mb-8",children:["Escolha o método que melhor se adapta ao seu computador no quartel. O ",e.jsx("strong",{children:"Tampermonkey"})," é o mais recomendado por ser definitivo e ter o Sincronizador Universal integrado."]}),e.jsxs("div",{className:"bg-zinc-900/50 p-4 rounded-2xl mb-6 border border-zinc-800 shadow-inner",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("p",{className:"text-zinc-400 text-[10px] uppercase font-black tracking-[0.2em]",children:"Conexão do Servidor"}),e.jsx("span",{className:"flex h-2 w-2 rounded-full bg-green-500 animate-pulse"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5",children:[e.jsx("button",{onClick:()=>I("pre"),className:`py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${S==="pre"?"bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]":"text-zinc-500 hover:text-zinc-300"}`,children:"Produção (PRE)"}),e.jsx("button",{onClick:()=>I("dev"),className:`py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${S==="dev"?"bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]":"text-zinc-500 hover:text-zinc-300"}`,children:"Desenvolvimento"})]})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("button",{onClick:()=>k("tampermonkey"),className:"block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-center font-black text-[9px] uppercase tracking-[0.3em] transition-all shadow-lg flex items-center justify-center gap-2",children:"🐵 MODO ESTÁVEL (TAMPERMONKEY)"}),e.jsx("button",{onClick:()=>k("extension"),className:"block w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-center font-black text-[9px] uppercase tracking-[0.3em] transition-all border border-white/10",children:"📝 MODO EXTENSÃO (CARREGAR MANUAL)"})]})]}),e.jsxs("div",{className:"bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8",children:[e.jsxs("h3",{className:"text-slate-800 font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2",children:[e.jsx(D,{className:"w-5 h-5 text-emerald-500"}),"Últimos Dados de Pessoal Sincronizados"]}),Q?e.jsx("div",{className:"text-slate-300 font-black uppercase tracking-widest text-[10px] text-center",children:"Carregando dados..."}):g.length===0?e.jsx("div",{className:"flex flex-col items-center justify-center text-center py-4 opacity-40",children:e.jsx("p",{className:"text-slate-400 text-[11px] font-black uppercase tracking-widest",children:"Nenhum dado sincronizado ainda"})}):e.jsx("div",{className:"h-[200px] overflow-auto pr-2 space-y-3",children:g.map((o,t)=>e.jsxs("div",{className:"p-4 bg-white rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"text-[10px] font-black tracking-tighter text-emerald-600 bg-emerald-50 px-2 py-1 rounded",children:o.rg}),e.jsx("div",{children:e.jsx("div",{className:"text-xs font-black text-slate-800 uppercase tracking-tighter",children:o.nomeGuerra||"NOME"})})]}),e.jsx("div",{className:"flex flex-col text-right justify-center",children:e.jsx("div",{className:"text-[10px] font-bold text-slate-600",children:new Date(o.updatedAt).toLocaleDateString("pt-BR")})})]},t))})]})]}),v==="none"&&p==="ferias"&&e.jsx("div",{className:"flex flex-col h-full",children:e.jsxs("div",{className:"bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col",children:[e.jsxs("h3",{className:"text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3",children:[e.jsx(D,{className:"w-4 h-4"})," Importação Manual de Férias (Backup)"]}),e.jsx("div",{className:"flex flex-col gap-4 mb-4",children:e.jsx("input",{type:"text",placeholder:"Digite o RG do Militar",value:d,onChange:o=>G(o.target.value),className:"w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold focus:border-orange-500 outline-none"})}),e.jsxs("div",{className:"flex-1 flex flex-col gap-6",children:[e.jsx("textarea",{className:"w-full h-32 bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 font-mono text-[11px] focus:border-orange-500 transition-all outline-none resize-none shadow-inner",placeholder:"Cole os dados de férias (tabela do DGP) aqui...",value:Z,onChange:o=>{F(o.target.value),te(o.target.value)}}),e.jsx("div",{className:"flex-1 min-h-[150px] border-2 border-dashed border-slate-200 rounded-3xl p-4 overflow-y-auto",children:P?e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center",children:[e.jsx(V,{className:"w-8 h-8 text-slate-300 mb-2"}),e.jsx("p",{className:"text-slate-400 text-[10px] font-black uppercase leading-relaxed",children:P})]}):x.length>0?e.jsx("div",{className:"space-y-2",children:x.map((o,t)=>e.jsxs("div",{className:"bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded",children:["R:",o.anoRef]}),e.jsx("div",{children:e.jsxs("div",{className:"text-[10px] font-black text-slate-800 uppercase tracking-tighter",children:[o.dataInicio," - ",o.dataRetorno]})})]}),e.jsxs("div",{className:"text-right font-black text-slate-400 text-[9px] uppercase",children:[o.diasGozados,"D"]})]},t))}):e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center opacity-20",children:[e.jsx(le,{className:"w-10 h-10 text-slate-300 mb-2"}),e.jsx("p",{className:"text-slate-400 text-[10px] font-black uppercase tracking-widest",children:"Aguardando dados..."})]})}),e.jsxs("button",{onClick:ae,disabled:x.length===0||!d,className:"w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl",children:[e.jsx(L,{className:"w-4 h-4"})," Importar ",x.length," Registros"]})]})]})}),v==="none"&&p==="pessoal"&&e.jsx("div",{className:"flex flex-col h-full",children:e.jsxs("div",{className:"bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col",children:[e.jsxs("h3",{className:"text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-3",children:[e.jsx(q,{className:"w-4 h-4"})," Importação Manual de Dados Pessoais (Backup)"]}),e.jsxs("div",{className:"flex-1 flex flex-col gap-6 mt-4",children:[e.jsx("textarea",{className:"w-full h-40 bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 font-mono text-[11px] focus:border-emerald-500 transition-all outline-none resize-none shadow-inner",placeholder:"Cole todo o texto da página de dados pessoais do DGP (Ctrl+A e Ctrl+C na página da intranet)...",value:ee,onChange:o=>{O(o.target.value),oe(o.target.value)}}),e.jsx("div",{className:"flex-1 min-h-[150px] border-2 border-dashed border-slate-200 rounded-3xl p-4 overflow-y-auto",children:_?e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center",children:[e.jsx(V,{className:"w-8 h-8 text-slate-300 mb-2"}),e.jsx("p",{className:"text-slate-400 text-[10px] font-black uppercase leading-relaxed",children:_})]}):l?e.jsxs("div",{className:"bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3 border-b border-slate-50 pb-3",children:[e.jsxs("div",{className:"text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg",children:["RG: ",l.rg]}),e.jsx("div",{className:"text-[11px] font-black text-slate-800 uppercase tracking-tight",children:l.nomeGuerra||l.cpf})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2 text-[9px] uppercase tracking-wider text-slate-500",children:[e.jsxs("div",{children:[e.jsx("span",{className:"font-bold text-slate-400",children:"NASCIMENTO:"})," ",l.nascimento||"---"]}),e.jsxs("div",{children:[e.jsx("span",{className:"font-bold text-slate-400",children:"CPF:"})," ",l.cpf||"---"]}),e.jsxs("div",{children:[e.jsx("span",{className:"font-bold text-slate-400",children:"TELEFONE:"})," ",l.telefoneCelular||"---"]}),e.jsxs("div",{children:[e.jsx("span",{className:"font-bold text-slate-400",children:"TIPO SANG:"})," ",l.tipoSanguineo||"---"]})]})]}):e.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center opacity-20",children:[e.jsx(ie,{className:"w-10 h-10 text-emerald-600 mb-2"}),e.jsx("p",{className:"text-slate-400 text-[10px] font-black uppercase tracking-widest",children:"Aguardando colagem..."})]})}),e.jsxs("button",{onClick:se,disabled:!l,className:"w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl",children:[e.jsx(L,{className:"w-4 h-4"})," Importar Dados de Pessoal"]})]})]})})]})]})}export{we as DgpSyncModule};
