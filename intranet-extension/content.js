chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.acao === "iniciar_varredura") {
    executarBuscaFluida(request.lista);
  }
});

async function executarBuscaFluida(rgs) {
  let finalData = [];
  
  for (let rg of rgs) {
    console.log(`Buscando dados de férias do RG: ${rg}...`);
    
    try {
      // 1. Pesquisa o militar na sessão atual
      const fd = new FormData();
      fd.append('rg_cons', rg);
      fd.append('Submit', 'Pesquisar');
      
      // Tenta achar qual é o script de pesquisa de RGs na página atual, caso não seja consulta_mil.php
      let searchAction = 'consulta_mil.php';
      const form = document.querySelector('form');
      if (form && form.getAttribute('action')) {
          searchAction = form.getAttribute('action');
      }
      
      await fetch(searchAction, { method: 'POST', body: fd }).catch(e => {
          console.warn(`Tentativa de POST para ${searchAction} falhou:`, e);
      });
      
      // 2. Coleta a página de Férias do militar encontrado
      let text = "";
      try {
          // Tenta carregar ferias.php primeiro, depois afastamentos.php
          let res = await fetch('ferias.php').catch(() => null);
          if (!res || res.status !== 200) {
              res = await fetch('afastamentos.php?opcao=ferias').catch(() => null);
          }
          if (res && res.status === 200) {
              text = await res.text();
          } else {
              // Se falhar em carregar do servidor, lê o HTML que já está aberto no navegador do usuário
              text = document.body.innerHTML;
          }
      } catch (e) {
          console.error("Erro ao buscar página de férias, usando documento local:", e);
          text = document.body.innerHTML;
      }
      
      // 3. Lê o HTML recebido
      const doc = new DOMParser().parseFromString(text, 'text/html');
      
      // Procurando as tabelas de férias
      const findTable = (d) => {
        const allTables = d.querySelectorAll('table');
        console.log(`Encontradas ${allTables.length} tabelas na página.`);
        
        for (let t of allTables) {
          const content = (t.textContent || "").toUpperCase();
          // Detecta a tabela pelo cabeçalho esperado em Férias
          // Adaptado para ser mais flexível (pode ter "ANO REF." ou apenas "DIAS GOZADOS")
          if (
            (content.includes('ANO REF.') || content.includes('ANOREF')) || 
            (content.includes('DIAS GOZADOS') && content.includes('DIAS A GOZAR')) ||
            (content.includes('DATA INÍCIO') || content.includes('DATA INICIO'))
          ) {
            console.log("Tabela de férias detectada!");
            return t;
          }
        }
        return null;
      };
      
      const tabelaFerias = findTable(doc);
      
      if (tabelaFerias) {
        // Tenta achar o nome do militar ou dados gerais para colocar no título da tabela
        let tituloMilitar = `Férias do Militar - RG: ${rg}`;
        
        // A página do DGP tem um texto como "Subten BM Q00/00 CARLA DE OLIVEIRA CLAUDINO SANTOS, RG 28.019"
        const pageText = doc.body.textContent || "";
        const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Busca linha que contém o RG formatado (ex: 28.019) ou puro
        const rgFormatted = rg.length > 3 ? rg.slice(0, -3) + '.' + rg.slice(-3) : rg;
        const nameLine = lines.find(l => l.toUpperCase().includes('RG ' + rg) || l.toUpperCase().includes(rgFormatted));
        
        if (nameLine) {
            tituloMilitar = nameLine.replace("FÉRIAS", "").trim();
        }

        console.log(`Extraindo dados para: ${tituloMilitar}`);
        // Título estilizado para a planilha
        finalData.push(["HEADER_SECTION", tituloMilitar]);
        
        // Vamos extrair a tabela
        let hasHeader = false;
        
        tabelaFerias.querySelectorAll('tr').forEach((row, index) => {
           let cells = Array.from(row.querySelectorAll('th, td')).map(c => (c.textContent || "").replace(/\s+/g, ' ').trim());
           
           if (cells.length >= 4) { // Pelo menos as colunas básicas
               // Normaliza para o tamanho padrão da tabela (na imagem você tem 10 colunas)
               while (cells.length < 10) { cells.push(""); }
               if (cells.length > 10) { cells = cells.slice(0, 10); }
               
               const rowText = cells.join(" ").toUpperCase();
               // Pula a linha se for apenas o cabeçalho "FÉRIAS" ou algo vazio
               if (rowText.includes('FÉRIAS') && cells.filter(x => x).length === 1) return;

               if (row.querySelector('th') || (rowText.includes('ATO') || rowText.includes('ANO'))) {
                   if (!hasHeader) {
                       finalData.push(["SUB_HEADER", ...cells]);
                       hasHeader = true;
                   }
               } else if (cells.some(c => c.includes('/') || /\d+/.test(c))) {
                   finalData.push(["DATA_ROW", ...cells]);
               }
           }
        });
        
        finalData.push(["EMPTY"]);
      } else {
        console.warn(`RG ${rg}: Tabela de férias não encontrada. Conteúdo recebido (primeiros 500 chars):`, text.substring(0, 500));
      }
      
      // Delay de 1 segundo para não sobrecarregar o PHP
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.error(`Erro ao processar RG ${rg}:`, err);
    }
  }
  
  if (finalData.length > 0) {
      await enviarParaPlanilha(finalData);
  } else {
      alert("Nenhum dado válido de férias foi encontrado para os RGs informados.");
  }
}

async function enviarParaPlanilha(finalData) {
  // A Extensão agora envia diretamente para a SUA PLATAFORMA (AI Studio App), eliminando planilhas!
  const webAppUrl = "https://ais-dev-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app/api/admin/vacation/bulk-sync";

  try {
    // Transformar the data array into the format expected by the API
    const vacations = [];
    let currentRg = "";

    // Parse the finalData format from the Férias table string
    finalData.forEach(row => {
      const type = row[0];
      const content = row.slice(1);
      
      if (type === "HEADER_SECTION") {
        // Ex: "Férias do Militar - RG: 28.019"
        const rgMatch = content[0].match(/RG:?\s*([\d.]+)/i);
        if (rgMatch) {
            currentRg = rgMatch[1].replace(/\D/g, '');
        }
      } else if (type === "DATA_ROW") {
        if (!currentRg) return;
        vacations.push({
            militarRg: currentRg,
            ato: content[0] || 'Concessão',
            anoRef: content[1] || '',
            dataInicio: content[3] || '',
            dataRetorno: content[4] || '',
            boletim: content[5] || '',
            boletimOrigem: content[6] || '',
            diasGozados: parseInt(content[7]) || 0,
            diasAGozar: parseInt(content[8]) || 0,
            status: (content[3] || '').includes('2026') ? 'marcado' : 'gozado'
        });
      }
    });

    if (vacations.length === 0) {
       alert("Nenhum dado estruturado de férias foi encontrado para enviar.");
       return;
    }

    const response = await fetch(webAppUrl, {
      method: "POST",
      mode: "cors", 
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      }, 
      body: JSON.stringify({ vacations: vacations })
    });
    
    if (response.status === 200) {
      const result = await response.json();
      if (result && result.success) {
        alert(`SINCRONIZAÇÃO ENVIADA!\n${result.count || vacations.length} registros foram encaminhados para sua plataforma.`);
      } else {
        alert("A sincronização falhou: " + (result.error || 'Erro desconhecido'));
      }
    } else {
      const errorText = await response.text();
      alert(`Erro no Servidor: ${response.status}\nURL: ${webAppUrl}\n\nResposta: ${errorText.substring(0, 200)}`);
    }
  } catch(err) {
    alert("Erro ao conectar com a Plataforma: " + err + "\nVerifique o link: " + webAppUrl);
  }
}
