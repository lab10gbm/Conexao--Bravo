export const getPersonalDataExtractorString = () => `
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
`;

