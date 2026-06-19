import React, { useState } from 'react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { BookOpen, FileText, LayoutTemplate } from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { parseRank, isOfficer, sortAllBySeniority } from '../lib/rankUtils';

interface EfetivoPlanoChamadaProps {
  militars: UserProfile[];
}

export function EfetivoPlanoChamada({ militars }: EfetivoPlanoChamadaProps) {
  const [showCover, setShowCover] = useState(true);

  // Group by OBM and then by Ala
  const groupedData: Record<string, Record<string, UserProfile[]>> = {};

  militars.forEach(m => {
    let obm = (m.obm || '10º GBM - SEDE').toUpperCase();
    if (!groupedData[obm]) {
      groupedData[obm] = {
        'OFICIAIS': [],
        'OFICIAIS MÉDICOS': [],
        '1': [], '2': [], '3': [], '4': [], 'EXPEDIENTE': []
      };
    }

    let ala = m.ala ? m.ala.toString() : '';
    
    if (isOfficer(m.rank || '')) {
       const isMedico = m.quadro?.toUpperCase().includes('MED') || m.quadro?.toUpperCase().includes('MÉD') || (m.rank || '').toUpperCase().includes('MED') || (m.rank || '').toUpperCase().includes('MÉD');
       if (isMedico) {
         groupedData[obm]['OFICIAIS MÉDICOS'].push(m);
       } else {
         groupedData[obm]['OFICIAIS'].push(m);
       }
    }
    else if (["ALA 1", "1"].includes(ala.toUpperCase())) groupedData[obm]['1'].push(m);
    else if (["ALA 2", "2"].includes(ala.toUpperCase())) groupedData[obm]['2'].push(m);
    else if (["ALA 3", "3"].includes(ala.toUpperCase())) groupedData[obm]['3'].push(m);
    else if (["ALA 4", "4"].includes(ala.toUpperCase())) groupedData[obm]['4'].push(m);
    else groupedData[obm]['EXPEDIENTE'].push(m);
  });

  // Sort OBMs alphabetically but keep 10º GBM generally at the top if we can, or just sort
  const sortedObms = Object.keys(groupedData).sort((a, b) => {
    if (a.includes('10º GBM') && !b.includes('10º GBM')) return -1;
    if (!a.includes('10º GBM') && b.includes('10º GBM')) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden">
         <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" /> Plano de Chamada
         </h3>
         <div className="flex items-center gap-3">
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border border-indigo-200"
           >
             <FileText className="w-4 h-4" />
             Imprimir PDF
           </button>
           <button 
             onClick={() => setShowCover(!showCover)}
             className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border border-slate-200"
           >
             {showCover ? <LayoutTemplate className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
             {showCover ? 'Ocultar Capa' : 'Mostrar Capa'}
           </button>
         </div>
      </div>

      {showCover && (
        <div className="bg-white min-h-[842px] max-w-[595px] mx-auto w-full shadow-2xl border border-slate-200 flex flex-col items-center justify-center p-12 text-center my-4 print:my-0 print:shadow-none print:border-none">
          <div className="mb-auto">
             <p className="text-xs font-bold uppercase leading-relaxed text-slate-800 font-sans tracking-wide">
               SECRETARIA DE ESTADO DA DEFESA CIVIL<br/>
               CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO<br/>
               COMANDO DE BOMBEIRO MILITAR DA ÁREA DA COSTA VERDE<br/>
               10° GRUPAMENTO DE BOMBEIROS MILITAR - ANGRA DOS REIS
             </p>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-4">
             <h1 className="text-6xl font-black uppercase tracking-tighter leading-none text-slate-900 mb-2">PLANO</h1>
             <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 mb-2">DE</h1>
             <h1 className="text-6xl font-black uppercase tracking-tighter leading-none text-slate-900 mb-2">CHAMADA</h1>
             <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 mb-2">POR ALAS</h1>
             <h1 className="text-6xl font-black uppercase tracking-tighter leading-none text-slate-900 mt-4">2026</h1>
          </div>

          <div className="mt-auto"></div>
        </div>
      )}

      {showCover && (
        <div className="bg-white min-h-[842px] max-w-[595px] mx-auto w-full shadow-2xl border border-slate-200 flex flex-col p-12 my-4 print:my-0 print:shadow-none print:border-none">
           <h2 className="text-xl font-black uppercase text-center mb-8 text-slate-800 underline underline-offset-4">PLANO DE CHAMADA</h2>
           
           <div className="space-y-6 text-xs text-justify leading-relaxed text-slate-700">
             <div>
               <h3 className="font-bold text-sm mb-1 uppercase">1 - DEFINIÇÃO</h3>
               <p>O presente plano visa mobilizar todos os bombeiros militares do 10º GBM que não são a guarnição de serviço por escala quando na constituição de guarnições especiais de socorro para reforçar ou substituir as guarnições de serviço empenhadas numa missão de grande vulto ou de duração prolongada.</p>
             </div>
             
             <div>
               <h3 className="font-bold text-sm mb-1 uppercase">2 - RESPONSABILIDADE</h3>
               <p>O plano de chamada será acionado mediante determinação das autoridades abaixo relacionadas:</p>
               <ul className="list-disc pl-5 mt-1 space-y-0.5">
                 <li>Diretor de Serviço e Coordenador de Operação</li>
                 <li>Comandante do 10º GBM</li>
                 <li>Comandante de Socorro do 10º GBM</li>
                 <li>Comandante dos Destacamentos</li>
               </ul>
             </div>

             <div>
               <h3 className="font-bold text-sm mb-1 uppercase">3 - ACIONAMENTO</h3>
               <p>Após recebida a determinação caberá ao SGT de dia, ou quem responder por ele, o acionamento do Plano de Chamada.</p>
             </div>

             <div>
               <h3 className="font-bold text-sm mb-1 uppercase">COMPOSIÇÃO DO EFETIVO DE SOBRE-AVISO</h3>
               <ul className="list-none mt-1 space-y-1 bg-slate-50 p-3 rounded border border-slate-200 font-medium">
                 <li><strong>SOBREAVISO I</strong> - Todos os BMs da ALA I quando a ALA III estiver de serviço.</li>
                 <li><strong>SOBREAVISO II</strong> - Todos os BMs da ALA II quando a ALA IV estiver de serviço.</li>
                 <li><strong>SOBREAVISO III</strong> - Todos os BMs da ALA III quando a ALA I estiver de serviço.</li>
                 <li><strong>SOBREAVISO IV</strong> - Todos os BMs da ALA IV quando a ALA II estiver de serviço.</li>
               </ul>
             </div>
           </div>
        </div>
      )}

      {/* Military Cards grouped by OBM and then ALA */}
      {sortedObms.map(obm => (
        <div key={obm} className="flex flex-col gap-6">
           <h1 className="text-2xl font-black text-slate-900 border-b-4 border-slate-900 pb-2 uppercase tracking-tighter w-full col-span-full mt-8">
             {obm}
           </h1>
           {['OFICIAIS', 'OFICIAIS MÉDICOS', '1', '2', '3', '4', 'EXPEDIENTE'].map(ala => {
             let list = groupedData[obm][ala];
             if (!list || list.length === 0) return null;

             list = [...list].sort(sortAllBySeniority);

             const title = ala === 'EXPEDIENTE' ? 'Expediente' : 
                           ala === 'OFICIAIS' ? 'Oficiais' :
                           ala === 'OFICIAIS MÉDICOS' ? 'Oficiais Médicos' :
                           `Ala ${ala}`;

             return (
               <div key={`${obm}-${ala}`} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 print:break-inside-avoid mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tighter text-indigo-900 border-b-2 border-indigo-100 pb-3 mb-6 print:border-indigo-400 print:text-indigo-800">
                     {title} ({list.length} Militares)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map(militar => (
                      <div key={militar.rg} className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col gap-2 print:break-inside-avoid print:bg-white print:border-slate-300">
                         <div className="flex items-start justify-between border-b border-slate-200 pb-2 mb-1">
                           <div className="flex items-center gap-3">
                             <RankInsignia rankStr={militar.rank} className="scale-110" />
                             <div>
                               <div className="text-sm font-black text-slate-800 leading-tight">{militar.rank} {militar.warName || (militar.name || '').split(' ')[0]}</div>
                               <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest overflow-hidden text-ellipsis line-clamp-1" title={militar.name}>{militar.name}</div>
                             </div>
                           </div>
                           <div className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded tracking-widest shrink-0 ml-2 print:bg-slate-100 print:text-slate-800">
                             RG: {militar.rg}
                           </div>
                         </div>
                         
                         <div className="text-xs text-slate-600 flex flex-col gap-1.5 mt-1">
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Telefone:</span>
                              <span className="font-semibold">{militar.cel || militar.tel || 'Não informado'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-0.5">Endereço:</span>
                              <span className="font-semibold text-[11px] leading-tight">{militar.endereco || 'Não informado'}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Localidade:</span>
                              <span className="font-semibold bg-slate-200 px-2 py-0.5 rounded text-[10px] uppercase print:bg-slate-100">{militar.cidade || 'Não informada'}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
             )
           })}
        </div>
      ))}
    </div>
  );
}

