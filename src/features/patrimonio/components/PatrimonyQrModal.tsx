import React from 'react';
import { Printer } from 'lucide-react';
import { SectorQrCode } from './SectorQrCode';
import { PatrimonioSection } from '../types';

interface PatrimonyQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSection: PatrimonioSection | null;
}

export function PatrimonyQrModal({
  isOpen,
  onClose,
  selectedSection,
}: PatrimonyQrModalProps) {
  if (!isOpen || !selectedSection) return null;

  const handlePrint = () => {
    const printContents = document.getElementById('print-qr-card')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Imprimir QR Code - ${selectedSection.nome}</title>
              <style>
                body {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                #card {
                  border: 4px solid #f1f5f9;
                  border-radius: 24px;
                  padding: 40px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  text-align: center;
                  max-width: 350px;
                }
                .header {
                  font-size: 11px;
                  font-weight: 900;
                  letter-spacing: 0.25em;
                  color: #0891b2;
                  margin-bottom: 24px;
                  text-transform: uppercase;
                }
                .title {
                  font-size: 16px;
                  font-weight: 900;
                  text-transform: uppercase;
                  margin-top: 24px;
                  color: #1e293b;
                  letter-spacing: 0.05em;
                }
                .subtitle {
                  font-size: 10px;
                  font-family: monospace;
                  color: #94a3b8;
                  margin-top: 8px;
                }
                .qr-wrapper {
                  background: #f8fafc;
                  padding: 16px;
                  border-radius: 16px;
                  border: 1px solid #e2e8f0;
                }
              </style>
            </head>
            <body>
              <div id="card">
                <div class="header">10º GBM - INTRANET</div>
                <div class="qr-wrapper">${document.getElementById('print-qr-card')?.getElementsByTagName('svg')[0]?.outerHTML || ''}</div>
                <div class="title">${selectedSection.nome}</div>
                <div class="subtitle">${selectedSection.id}</div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        alert('Por favor, permita popups para poder abrir a janela de impressão do QR Code.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 font-sans">
        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
          QR Code de Identificação
        </h4>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">
          {selectedSection.nome}
        </p>

        {/* QR Card for printing */}
        <div id="print-qr-card" className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col items-center w-full max-w-[280px]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-4 text-center">
            10º GBM - INTRANET
          </div>
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <SectorQrCode value={window.location.origin + '/carga-fixa/' + selectedSection.id} size={160} />
          </div>

          <div className="text-[12px] font-black uppercase tracking-widest text-slate-800 mt-4 text-center">
            {selectedSection.nome}
          </div>
          <div className="text-[8px] text-slate-400 font-mono tracking-wider mt-1.5 break-all select-all uppercase">
            {selectedSection.id}
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mt-4 max-w-xs font-sans font-medium">
          Cole este QR Code na entrada do setor ou no armário principal. Os militares poderão escaneá-lo para acessar a relação de carga fixa instantaneamente.
        </p>

        <div className="flex gap-2 w-full mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-600/10"
          >
            <Printer className="w-4 h-4" />
            Imprimir QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
