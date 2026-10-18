import React from 'react';
import { Edit2 } from 'lucide-react';

interface SignatureEntry {
  timestamp: string;
  rg: string;
}

interface SignaturesData {
  setor?: SignatureEntry;
  auxSetor?: SignatureEntry;
  patrimonio?: SignatureEntry;
  auxPatrimonio?: SignatureEntry;
  comandante?: SignatureEntry;
}

interface PatrimonySignaturesSectionProps {
  signatures: SignaturesData;
  canSignPatrimonio: boolean;
  canSignAuxPatrimonio: boolean;
  canSignSetor: boolean;
  canSignAuxSetor: boolean;
  canSignComandante: boolean;
  adminModeActive: boolean;
  onSign: (role: string) => void;
  onRemoveSign: (role: string) => void;
  patrimonio: any;
  auxPatrimonio: any;
  responsavel: any;
  auxSetor: any;
  comandante: any;
}

export function PatrimonySignaturesSection({
  signatures,
  canSignPatrimonio,
  canSignAuxPatrimonio,
  canSignSetor,
  canSignAuxSetor,
  canSignComandante,
  adminModeActive,
  onSign,
  onRemoveSign,
  patrimonio,
  auxPatrimonio,
  responsavel,
  auxSetor,
  comandante,
}: PatrimonySignaturesSectionProps) {
  return (
    <div className="mt-16 mb-8 pt-8 border-t border-slate-200 flex flex-wrap justify-center gap-12 gap-y-16 px-4">
      {/* Responsável pelo Patrimônio */}
      <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
        <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
          {signatures.patrimonio ? (
            <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
              <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                Assinado Eletronicamente
              </span>
              <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                {new Date(signatures.patrimonio.timestamp).toLocaleString("pt-BR")}
              </span>
            </div>
          ) : null}
        </div>

        <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
          {!signatures.patrimonio && canSignPatrimonio && (
            <button
              onClick={() => onSign("patrimonio")}
              className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <Edit2 className="w-3 h-3" /> Assinar Dcto
            </button>
          )}
          {signatures.patrimonio && (canSignPatrimonio || adminModeActive) && (
            <button
              onClick={() => onRemoveSign("patrimonio")}
              className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
            >
              Remover Assinatura
            </button>
          )}
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
          {patrimonio?.warName || patrimonio?.name || "Douglas M. G. Gabi"}
        </p>
        <p className="text-[10px] font-bold uppercase text-slate-500">
          {patrimonio ? `${patrimonio.rank} - RG ${patrimonio.rg}` : "SGT BM 02/13 - RG 49.075"}
        </p>
        <p className="text-[10px] font-bold uppercase text-slate-500">
          Responsável pelo Patrimônio
        </p>
      </div>

      {/* Auxiliar de Patrimônio */}
      {auxPatrimonio && (
        <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
          <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
            {signatures.auxPatrimonio ? (
              <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                  Assinado Eletronicamente
                </span>
                <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                  {new Date(signatures.auxPatrimonio.timestamp).toLocaleString("pt-BR")}
                </span>
              </div>
            ) : null}
          </div>

          <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
            {!signatures.auxPatrimonio && canSignAuxPatrimonio && (
              <button
                onClick={() => onSign("auxPatrimonio")}
                className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
              >
                <Edit2 className="w-3 h-3" /> Assinar Dcto
              </button>
            )}
            {signatures.auxPatrimonio && (canSignAuxPatrimonio || adminModeActive) && (
              <button
                onClick={() => onRemoveSign("auxPatrimonio")}
                className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
              >
                Remover Assinatura
              </button>
            )}
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
            {auxPatrimonio.warName || auxPatrimonio.name}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            {auxPatrimonio.rank} - RG {auxPatrimonio.rg}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            Auxiliar de Patrimônio
          </p>
        </div>
      )}

      {/* Responsável pelo Setor */}
      <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
        <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
          {signatures.setor ? (
            <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
              <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                Assinado Eletronicamente
              </span>
              <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                {new Date(signatures.setor.timestamp).toLocaleString("pt-BR")}
              </span>
            </div>
          ) : null}
        </div>

        <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
          {!signatures.setor && canSignSetor && responsavel && (
            <button
              onClick={() => onSign("setor")}
              className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <Edit2 className="w-3 h-3" /> Assinar Dcto
            </button>
          )}
          {signatures.setor && (canSignSetor || adminModeActive) && (
            <button
              onClick={() => onRemoveSign("setor")}
              className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
            >
              Remover Assinatura
            </button>
          )}
        </div>

        {responsavel ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
              {responsavel.warName || responsavel.name}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {responsavel.rank} - RG {responsavel.rg}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Responsável pelo Setor
            </p>
          </>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
            Responsável pelo Setor
          </p>
        )}
      </div>

      {/* Auxiliar do Setor */}
      {auxSetor && (
        <div className="flex flex-col items-center justify-end text-center relative group/sig w-52">
          <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
            {signatures.auxSetor ? (
              <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
                <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                  Assinado Eletronicamente
                </span>
                <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                  {new Date(signatures.auxSetor.timestamp).toLocaleString("pt-BR")}
                </span>
              </div>
            ) : null}
          </div>

          <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
            {!signatures.auxSetor && canSignAuxSetor && (
              <button
                onClick={() => onSign("auxSetor")}
                className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
              >
                <Edit2 className="w-3 h-3" /> Assinar Dcto
              </button>
            )}
            {signatures.auxSetor && (canSignAuxSetor || adminModeActive) && (
              <button
                onClick={() => onRemoveSign("auxSetor")}
                className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
              >
                Remover Assinatura
              </button>
            )}
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
            {auxSetor.warName || auxSetor.name}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            {auxSetor.rank} - RG {auxSetor.rg}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            Auxiliar do Setor
          </p>
        </div>
      )}

      {/* Comandante */}
      <div className="flex flex-col items-center justify-end text-center relative group/sig w-52 mt-8">
        <div className="w-full max-w-[200px] border-b border-slate-400 mb-3 relative flex justify-center h-16">
          {signatures.comandante ? (
            <div className="absolute bottom-1 text-emerald-600 flex items-center flex-col w-full h-full justify-end">
              <span className="font-['Playfair_Display',serif] italic text-lg leading-none mb-1 opacity-90">
                Assinado Eletronicamente
              </span>
              <span className="text-[8px] text-slate-400 font-sans tracking-[0.2em] uppercase">
                {new Date(signatures.comandante.timestamp).toLocaleString("pt-BR")}
              </span>
            </div>
          ) : null}
        </div>

        <div className="h-8 mb-2 flex flex-col items-center justify-center w-full">
          {!signatures.comandante && canSignComandante && (
            <button
              onClick={() => onSign("comandante")}
              className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <Edit2 className="w-3 h-3" /> Assinar Dcto
            </button>
          )}
          {signatures.comandante && (canSignComandante || adminModeActive) && (
            <button
              onClick={() => onRemoveSign("comandante")}
              className="opacity-0 group-hover/sig:opacity-100 transition-opacity px-2 py-1 text-slate-400 hover:text-red-600 rounded text-[9px] font-bold uppercase tracking-wider absolute -bottom-6"
            >
              Remover Assinatura
            </button>
          )}
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
          {comandante?.warName || comandante?.name || "Paulo R. Goncalves Escarani"}
        </p>
        <p className="text-[10px] font-bold uppercase text-slate-500">
          {comandante ? `${comandante.rank} - RG ${comandante.rg}` : "Ten Cel BM QOC/96 - RG 19.187"}
        </p>
        <p className="text-[10px] font-bold uppercase text-slate-500">
          Comandante do 10º GBM
        </p>
      </div>
    </div>
  );
}
