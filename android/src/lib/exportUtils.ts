import * as XLSX from 'xlsx';
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
