export const getPromotionDataExtractorString = () => `
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
`;
