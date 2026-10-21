export interface AlaThemePrint {
  bgHex: string;
  bgClass: string;
}

export function generatePrintHtmlDocument(
  sheetElementId: string,
  title: string,
  alaTheme: AlaThemePrint
): string | null {
  try {
    const sheetEl = document.getElementById(sheetElementId);
    if (!sheetEl) return null;

    // Coleta todas as regras CSS processadas da página
    let collectedCss = '';
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          if (sheet.cssRules) {
            for (const rule of Array.from(sheet.cssRules)) {
              collectedCss += rule.cssText + '\n';
            }
          }
        } catch {}
      }
    } catch {}

    // Converte links de folhas de estilo para URLs absolutas para funcionamento garantido em Blob/about:blank
    const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
      .map(node => {
        const href = (node as HTMLLinkElement).href;
        return `<link rel="stylesheet" href="${href}" />`;
      })
      .join("\n");

    // Clonar e limpar controles interativos exclusivos da tela
    const clone = sheetEl.cloneNode(true) as HTMLElement;
    const hiddenEls = clone.querySelectorAll(".print\\:hidden, [class*='print:hidden']");
    hiddenEls.forEach(el => el.remove());

    // Forçar atributos inline de cor exata e print-color-adjust em todos os cabeçalhos de ala
    const alaElements = clone.querySelectorAll(".escala-ala-header, ." + alaTheme.bgClass);
    alaElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.backgroundColor = alaTheme.bgHex;
      htmlEl.style.color = '#000000';
      htmlEl.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      htmlEl.style.setProperty('print-color-adjust', 'exact', 'important');
    });

    // Forçar atributos inline de cor exata nas barras cinzas de funções das viaturas
    const vtrFuncHeaders = clone.querySelectorAll(".escala-vtr-func-header");
    vtrFuncHeaders.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.backgroundColor = '#dbe4ee';
      htmlEl.style.color = '#000000';
      htmlEl.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      htmlEl.style.setProperty('print-color-adjust', 'exact', 'important');
    });

    // Garantir URLs absolutos em todas as imagens (incluindo marca d'água e brasões)
    const imgs = clone.querySelectorAll("img");
    imgs.forEach((img) => {
      if (img.src) {
        img.src = img.src;
      }
    });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${linkTags}
  <style>
    ${collectedCss}
  </style>
  <style>
    @page {
      size: A4 portrait;
      margin: 22mm 6mm 8mm 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    #escala-print-sheet {
      padding-top: 18mm !important;
    }
    html, body {
      background: white !important;
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .print\\:hidden, [class*="print:hidden"] {
      display: none !important;
    }
    .escala-ala-header {
      background-color: ${alaTheme.bgHex} !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .escala-vtr-func-header {
      background-color: #dbe4ee !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-emerald-200 {
      background-color: #a7f3d0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-rose-200 {
      background-color: #fecdd3 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-blue-200, .bg-sky-200 {
      background-color: #bfdbfe !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-amber-200, .bg-yellow-200 {
      background-color: #fde68a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-slate-200 {
      background-color: #e2e8f0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-slate-50 {
      background-color: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-white {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .escala-watermark {
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: none !important;
      z-index: 10 !important;
      overflow: hidden !important;
    }
    .escala-watermark img {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  </style>
</head>
<body class="bg-white text-black p-2 pt-4">
  <div class="max-w-[1200px] mx-auto bg-white relative text-black font-sans text-[11px] leading-tight flex flex-col pt-2 min-h-[280mm]">
    ${clone.innerHTML}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
  } catch (e) {
    console.warn("Erro ao gerar HTML de impressão:", e);
    return null;
  }
}
