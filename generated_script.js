// ==UserScript==
// @name         Sincronizador Universal DGP CBMERJ
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Suite Completa DGP - Sincronização de Férias, Pessoal, etc. (Botão Flutuante)
// @author       10º GBM
// @match        *://cbmerj.rj.gov.br/*
// @match        *://*.cbmerj.rj.gov.br/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ${appDomain}
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

    const APP_URL = 'http://localhost';
    const FIREBASE_PROJECT_ID = 'ai-studio-applet-webapp-33cfe';
    const FIREBASE_API_KEY = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
    const FIREBASE_DB_ID = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';

    const extractors = [
        
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
        
        let rgMatch = bodyText.match(/RG[:\s]*([\d.]+)/i);
        let rg = rgMatch ? rgMatch[1].replace(/\D/g, '') : null;
        
        if (!rg) {
            let possibleRg = bodyText.match(/\b(\d{5})\b/);
            if (possibleRg) rg = possibleRg[1];
        }
        
        if (!rg) {
            rg = prompt("RG não localizado automaticamente. Digite o RG:");
            if (!rg) return;
        }
        
        btn.disabled = true;
        let originalText = btn.innerText;
        btn.innerText = '⌛ SINCRONIZANDO...';

        let lines = bodyText.split('\n');
        let vacations = [];
        for (let line of lines) {
            if (!line.includes('/') && !line.includes('202')) continue;
            let cols = line.split('\t').map(s => s.trim());
            if (cols.length < 5) continue;
            if (cols[0].toUpperCase() === 'ATO' || cols[1].toUpperCase().includes('ANO')) continue;
            
            let dtInicio = cols[4] || '';
            if (dtInicio.match(/\d{2}\/\d{2}\/\d{4}/) || cols[1].toUpperCase().includes('ASSEGURADAS') || cols[1].toUpperCase().includes('PRESUMIDAS')) {
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
            btn.disabled = false; btn.innerText = originalText;
            return;
        }

        let writes = vacations.flatMap(v => {
            let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\//g, '');
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
                    alert('Erro no Servidor: ' + res.status + '\n\nResposta: ' + res.responseText.substring(0, 200));
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
,
        
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
                const pageText = (doc.body.textContent || "").replace(/\s+/g, ' ');
                
                const extractField = (str, fn, nfn) => {
                    const regex = new RegExp(fn + ':?\\s*(.*?)\\s*(?:' + nfn + '|$)', 'i');
                    const match = str.match(regex);
                    return match ? match[1].trim() : '';
                };

                let rgMatch = pageText.match(/RG:\s*([\d.]+)/i) || pageText.match(/RG\s*([\d.]+)/i);
                const rg = rgMatch ? rgMatch[1].replace(/\D/g, '') : '';

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
                            alert('Erro no Servidor: ' + res.status + '\n\nResposta: ' + res.responseText.substring(0, 200));
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
})();