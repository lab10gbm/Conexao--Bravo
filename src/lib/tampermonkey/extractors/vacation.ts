export const getVacationExtractorString = () => `
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
`;
