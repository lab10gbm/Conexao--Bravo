export async function copyExpedienteTables(
  activeVisualMode: string,
  onSuccess?: () => void
): Promise<boolean> {
  const containerId =
    activeVisualMode === 'table'
      ? 'table-view-container'
      : activeVisualMode === 'escala_sv'
      ? 'escala-sv-container'
      : activeVisualMode === 'relatorios'
      ? 'relatorios-container'
      : null;

  if (!containerId) return false;
  const el = document.getElementById(containerId);
  if (!el) return false;

  try {
    const cleanHtml = (element: HTMLElement) => {
      const clone = element.cloneNode(true) as HTMLElement;

      // Remover elementos indesejados (como o input de EXP/Sem)
      const removeItems = clone.querySelectorAll('[data-no-copy="true"]');
      removeItems.forEach((item) => item.remove());

      // Adicionar estilos inline para garantir que o LibreOffice/Word reconheça
      if (activeVisualMode === 'escala_sv') {
        const tables = clone.querySelectorAll('table');
        tables.forEach((table) => {
          (table as HTMLElement).style.borderCollapse = 'collapse';
          (table as HTMLElement).style.width = '100%';
          (table as HTMLElement).style.marginBottom = '30px';
          (table as HTMLElement).style.border = '1px solid #cbd5e1';

          // Headers
          const ths = table.querySelectorAll('th');
          ths.forEach((th) => {
            (th as HTMLElement).style.border = '1px solid #cbd5e1';
            (th as HTMLElement).style.padding = '8px';
            (th as HTMLElement).style.backgroundColor = '#f1f5f9';
            (th as HTMLElement).style.fontSize = '10px';
            (th as HTMLElement).style.fontWeight = 'bold';
            (th as HTMLElement).style.textAlign = 'center';
          });

          // Rows and Cells
          const rows = table.querySelectorAll('tr');
          rows.forEach((row) => {
            const tr = row as HTMLElement;
            const isWeekend =
              tr.classList.contains('bg-amber-100/40') ||
              tr.className.includes('bg-amber-100');

            if (isWeekend) {
              tr.style.backgroundColor = '#fef3c7'; // cor de fim de semana
            }

            const tds = tr.querySelectorAll('td');
            tds.forEach((td, colIdx) => {
              const tce = td as HTMLElement;
              tce.style.border = '1px solid #cbd5e1';
              tce.style.padding = '6px';
              tce.style.fontSize = '10px';
              tce.style.textAlign = 'center';

              if (colIdx === 0) {
                tce.style.fontWeight = 'bold';
              }

              if (isWeekend) {
                tce.style.backgroundColor = '#fef3c7';
              }

              const spans = tce.querySelectorAll('span');
              spans.forEach((span) => {
                const s = span as HTMLElement;
                if (s.textContent === 'SV.') {
                  s.style.color = 'red';
                  s.style.fontWeight = 'bold';
                  s.style.padding = '4px 8px';
                  s.style.border = 'none';
                  s.style.borderRadius = '4px';
                  s.style.backgroundColor = '#fef2f2';
                  s.style.display = 'inline-block';
                  s.style.whiteSpace = 'nowrap';
                  s.style.minWidth = '40px';
                  s.style.margin = '2px';
                } else if (s.textContent === 'EXP.') {
                  s.style.color = '#4f46e5';
                  s.style.fontWeight = 'bold';
                  s.style.padding = '4px 8px';
                  s.style.border = 'none';
                  s.style.borderRadius = '4px';
                  s.style.backgroundColor = '#eef2ff';
                  s.style.display = 'inline-block';
                  s.style.whiteSpace = 'nowrap';
                  s.style.minWidth = '40px';
                  s.style.margin = '2px';
                }
              });
            });
          });
        });

        const tableWrappers = clone.querySelectorAll('.bg-white.rounded-xl');
        tableWrappers.forEach((wrapper, idx) => {
          if (idx < tableWrappers.length - 1) {
            const spacer = document.createElement('div');
            spacer.style.height = '30px';
            spacer.innerHTML = '<br/>&nbsp;<br/>';
            wrapper.parentNode?.insertBefore(spacer, wrapper.nextSibling);
          }
          (wrapper as HTMLElement).style.marginBottom = '30px';
          (wrapper as HTMLElement).style.width = '100%';
          (wrapper as HTMLElement).style.display = 'block';
        });
      } else if (activeVisualMode === 'relatorios') {
        const headerEl = clone.querySelector('[data-report-header="true"]');
        if (headerEl) {
          (headerEl as HTMLElement).style.textAlign = 'center';
          (headerEl as HTMLElement).style.fontFamily = 'Arial, sans-serif';
          (headerEl as HTMLElement).style.fontWeight = 'bold';
          (headerEl as HTMLElement).style.marginBottom = '20px';
          (headerEl as HTMLElement).style.textTransform = 'uppercase';
        }
        const tables = clone.querySelectorAll('table');
        tables.forEach((table) => {
          (table as HTMLElement).style.borderCollapse = 'collapse';
          (table as HTMLElement).style.width = '100%';
          (table as HTMLElement).style.border = '1px solid #000000';
          (table as HTMLElement).style.fontFamily = 'Arial, sans-serif';
          const ths = table.querySelectorAll('th');
          ths.forEach((th) => {
            (th as HTMLElement).style.border = '1px solid #000000';
            (th as HTMLElement).style.padding = '8px 10px';
            (th as HTMLElement).style.backgroundColor = '#f1f5f9';
            (th as HTMLElement).style.fontWeight = 'bold';
            (th as HTMLElement).style.textAlign = 'center';
            (th as HTMLElement).style.fontSize = '12px';
            (th as HTMLElement).style.textTransform = 'uppercase';
          });
          const tds = table.querySelectorAll('td');
          tds.forEach((td) => {
            (td as HTMLElement).style.border = '1px solid #000000';
            (td as HTMLElement).style.padding = '6px 10px';
            (td as HTMLElement).style.textAlign = 'center';
            (td as HTMLElement).style.fontSize = '12px';
          });
        });
      } else if (activeVisualMode === 'table') {
        const tables = clone.querySelectorAll('table');
        tables.forEach((table) => {
          (table as HTMLElement).style.borderCollapse = 'collapse';
          const cells = table.querySelectorAll('th, td');
          cells.forEach((c) => {
            (c as HTMLElement).style.border = '1px solid #cbd5e1';
            (c as HTMLElement).style.padding = '4px';
          });
        });
      }

      return clone.innerHTML;
    };

    const htmlContent = cleanHtml(el);

    if (navigator.clipboard && navigator.clipboard.write) {
      const type = 'text/html';
      const blob = new Blob([htmlContent], { type });
      const data = [
        new ClipboardItem({
          [type]: blob,
          ['text/plain']: new Blob([el.innerText], { type: 'text/plain' })
        })
      ];
      await navigator.clipboard.write(data);
    } else {
      const range = document.createRange();
      range.selectNode(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('copy');
      selection?.removeAllRanges();
    }

    if (onSuccess) onSuccess();
    return true;
  } catch (err) {
    console.error('Failed to copy', err);
    return false;
  }
}
