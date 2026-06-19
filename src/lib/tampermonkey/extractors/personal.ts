export const getPersonalDataExtractorString = () => `
{
    id: 'sync_personal',
    label: '👥 Mass Sync Pessoal',
    color: '#10b981', // Emerald
    action: async (btn) => {
        let rgsInput = prompt("Cole os RGs para extração em massa (separados por vírgula ou espaço):");
        if (!rgsInput) return;
        
        const rgs = rgsInput.split(/[\\s,]+/).filter(r => r.trim() !== '');
        if(rgs.length === 0) return;
        
        if (!confirm('Iniciar varredura de ' + rgs.length + ' militares?')) return;
        
        btn.disabled = true;
        let originalText = btn.innerText;
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
            GM_xmlhttpRequest({
                method: "POST",
                url: APP_URL + '/api/admin/personal-data/bulk-sync',
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
        btn.innerText = originalText;
    }
}
`;
