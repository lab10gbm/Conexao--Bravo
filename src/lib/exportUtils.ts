import * as XLSX from '@e965/xlsx';
import { format } from 'date-fns';

export function exportToExcel(data: any[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function generateICS(events: { title: string, start: Date, end: Date, description?: string }[], filename: string) {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Bombeiros RJ//Agenda Institucional//PT-BR\nCALSCALE:GREGORIAN\n";
  events.forEach(e => {
    // ICS date format: YYYYMMDDTHHmmssZ
    const startStr = format(e.start, "yyyyMMdd'T'HHmmss");
    const endStr = format(e.end, "yyyyMMdd'T'HHmmss");
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `DTSTART;TZID=America/Sao_Paulo:${startStr}\n`;
    icsContent += `DTEND;TZID=America/Sao_Paulo:${endStr}\n`;
    icsContent += `SUMMARY:${e.title}\n`;
    if (e.description) {
       icsContent += `DESCRIPTION:${e.description}\n`;
    }
    icsContent += "END:VEVENT\n";
  });
  icsContent += "END:VCALENDAR";

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function copyTableToClipboard(data: any[], headers: string[], keys: string[]) {
  if (!data.length) return false;
  
  const mappedData = data.map(row => {
    return keys.map(k => {
      // Support nested keys like user.name by splitting by '.'
      const val = k.split('.').reduce((acc, curr) => (acc !== null && acc !== undefined ? acc[curr] : undefined), row);
      if (Array.isArray(val)) {
        return val.join(', ');
      }
      return val !== null && val !== undefined ? String(val).replace(/\t/g, ' ') : '';
    });
  });

  const tsv = [
    headers.join('\t'),
    ...mappedData.map(row => row.join('\t'))
  ].join('\n');
  
  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (e) {
    const el = document.createElement('textarea');
    el.value = tsv;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
}

export async function copyTableToClipboardWord(data: any[], headers: string[], keys: string[], title: string = "Tabela") {
  if (!data.length) return false;

  const mappedData = data.map(row => {
    return keys.map(k => {
      const val = k.split('.').reduce((acc, curr) => (acc !== null && acc !== undefined ? acc[curr] : undefined), row);
      if (Array.isArray(val)) {
        return val.join(', ');
      }
      return val !== null && val !== undefined ? String(val) : '';
    });
  });

  const tsv = [
    headers.join('\t'),
    ...mappedData.map(row => row.join('\t'))
  ].join('\n');

  let html = `
    <html>
      <head>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #f2f2f2; font-weight: bold; padding: 8px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          h2 { font-family: Arial, sans-serif; text-align: center; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${mappedData.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  try {
    const clipboardItem = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([tsv], { type: "text/plain" })
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (e) {
    console.warn("Clipboard API failed for text/html, falling back to text", e);
    // Fallback to basic text
    try {
      await navigator.clipboard.writeText(tsv);
      return true;
    } catch(e2) {
      const el = document.createElement('textarea');
      el.value = tsv;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    }
  }
}
