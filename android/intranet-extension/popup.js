document.getElementById('btnVarrer').addEventListener('click', async () => {
  const textarea = document.getElementById('listaRGs');
  const rgsRaw = textarea.value.split('\n');
  
  // Limpa os RGs (remove pontos, traços e vazios)
  const rgs = rgsRaw
    .map(rg => rg.replace(/\D/g, '').trim())
    .filter(rg => rg !== "");
    
  if (rgs.length === 0) {
    alert("Por favor, insira pelo menos um RG.");
    return;
  }

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes("dgp")) {
    alert("Você precisa estar logado e em alguma página do sistema DGP para realizar a busca fluida.");
    return;
  }

  try {
    // Notifica o content script na página atual para começar a buscar silenciosamente
    await chrome.tabs.sendMessage(tab.id, { 
      acao: "iniciar_varredura", 
      lista: rgs 
    });
  } catch (err) {
    if (err.message && (err.message.includes("Receiving end does not exist") || err.message.includes("Could not establish connection"))) {
      alert("Conexão com a página não encontrada. Por favor, atualize a página do DGP (F5) e tente novamente.");
    } else {
      console.error(err);
      alert("Ocorreu um erro ao comunicar com a página: " + err.message);
    }
  }
});
