import { buildUnifiedTampermonkeyScript, buildUnifiedBookmarkletScript } from '../lib/tampermonkey';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Users, CheckCircle2, AlertCircle, FileJson, Table as TableIcon, TrendingUp, Download, ExternalLink, UserIcon, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Vacation } from '../types';
import { db } from '../lib/firebase';
import { collection, query, limit, getDocs, orderBy, setDoc, doc } from 'firebase/firestore';

interface DgpSyncModuleProps {
  user: UserProfile;
  onBack: () => void;
}

export function DgpSyncModule({ user, onBack }: DgpSyncModuleProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ferias' | 'pessoal'>('ferias');
  const [syncedData, setSyncedData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [urlType, setUrlType] = useState<'dev' | 'pre'>('dev');

  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<Partial<Vacation>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState<'none' | 'extension' | 'tampermonkey'>('none');
  const [targetRg, setTargetRg] = useState('');

  // Personal data manual sync states
  const [personalInputText, setPersonalInputText] = useState('');
  const [personalPreview, setPersonalPreview] = useState<any | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const rawAppUrl = window.location.origin;
  const appUrl = urlType === 'pre' ? rawAppUrl.replace('ais-dev-', 'ais-pre-') : rawAppUrl;

  const tampermonkeyCode = buildUnifiedTampermonkeyScript(appUrl);
  const bookmarkletCode = buildUnifiedBookmarkletScript();

  useEffect(() => {
    const loadData = async () => {
       try {
          const q = query(collection(db, 'personalData'), orderBy('updatedAt', 'desc'), limit(50));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSyncedData(data);
       } catch(e) {
          console.error("Erro ao carregar personalData:", e);
       } finally {
          setLoading(false);
       }
    };
    loadData();
  }, []);

  const parseData = (text: string) => {
    try {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const extracted: Partial<Vacation>[] = [];
      let foundRg = targetRg;

      if (!foundRg) {
         let rgMatch = text.match(/RG[:\s]*([\d.]+)/i);
         if (rgMatch) foundRg = rgMatch[1].replace(/\D/g, '');
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Ano Ref.') || line.includes('DIRETORIA GERAL') || line.includes('AFASTAMENTOS')) continue;

        let parts = line.split('\t');
        if (parts.length < 5) {
          parts = line.split(/\s{2,}/);
        }

        const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
        const potentialDates = parts.filter(p => dateRegex.test(p));

        if (potentialDates.length >= 2) {
           const status: 'gozado' | 'marcado' | 'pendente' = potentialDates[0].includes('2026') ? 'marcado' : 'gozado';

           extracted.push({
             id: Math.random().toString(36).substr(2, 9),
             militarRg: foundRg || '00000',
             ato: parts[1] || parts[0] || 'Concessão',
             anoRef: parts[2] || parts[1] || '',
             anoRetifi: parts[3] || '',
             dataInicio: potentialDates[0],
             dataRetorno: potentialDates[1],
             boletim: parts[6] || parts[5] || parts[4] || '',
             diasGozados: parseInt(parts[7]) || parseInt(parts[6]) || 0,
             diasAGozar: parseInt(parts[8]) || parseInt(parts[7]) || 0,
             boletimOrigem: parts[9] || parts[8] || '',
             obs: parts[10] || parts[parts.length - 1] || '',
             status
           });
        }
      }

      if (extracted.length === 0) {
        setError('Não foi possível identificar dados. Tente usar a extensão ou copie a tabela de férias novamente.');
      } else if (!foundRg) {
        setError('RG não encontrado no texto. Por favor, insira o RG no campo acima.');
        setPreview(extracted);
      } else {
        setPreview(extracted);
        setError(null);
      }
    } catch (e) {
      setError('Erro ao processar os dados.');
    }
  };

  const handleProcess = async () => {
    if (preview.length > 0 && targetRg) {
      try {
         for (const v of preview) {
            const docId = `${targetRg}_${v.anoRef}_${v.dataInicio?.replace(/\//g, "")}`;
            const savedData = {
               ...v,
               militarRg: targetRg,
               updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, "vacations", docId), savedData, { merge: true });
            await setDoc(doc(db, "militaries", targetRg, "ferias", docId), savedData, { merge: true });
         }
         alert("Dados de férias importados com sucesso!");
         setInputText('');
         setPreview([]);
         setTargetRg('');
      } catch (e) {
         console.error(e);
         alert("Erro ao importar férias.");
      }
    } else {
       alert("RG ausente ou sem registros para importar.");
    }
  };

  const parsePersonalData = (text: string) => {
    try {
      const pageText = text.replace(/\s+/g, ' ');
      
      const extractField = (str: string, fn: string, nfn: string) => {
          const regex = new RegExp(fn + ':?\\s*(.*?)\\s*(?:' + nfn + '|$)', 'i');
          const match = str.match(regex);
          return match ? match[1].trim() : '';
      };

      let rgMatch = pageText.match(/RG:\s*([\d.]+)/i) || pageText.match(/RG\s*([\d.]+)/i);
      const rg = rgMatch ? rgMatch[1].replace(/\D/g, '') : '';

      if (!rg) {
         setPersonalError("RG não encontrado no texto. Cole a página de dados do militar.");
         setPersonalPreview(null);
         return;
      }

      const personalData = {
          rg: rg,
          pai: extractField(pageText, 'PAI', 'MAE:'),
          mae: extractField(pageText, 'MAE', 'Nome de Guerra:'),
          nomeGuerra: extractField(pageText, 'Nome de Guerra', 'Nascimento:'),
          nascimento: extractField(pageText, 'Nascimento', 'CPF:'),
          cpf: extractField(pageText, 'CPF', 'PASEP:'),
          pasep: extractField(pageText, 'PASEP', 'CNH:'),
          cnh: extractField(pageText, 'CNH', 'CAT:'),
          cnhCat: extractField(pageText, 'CAT', 'Grau de Instru'),
          grauInstrucao: extractField(pageText, 'Grau de Instrução', 'E-mail:'),
          email: extractField(pageText, 'E-mail', 'Nacionalidade:'),
          nacionalidade: extractField(pageText, 'Nacionalidade', 'Naturalidade:'),
          naturalidade: extractField(pageText, 'Naturalidade', 'Estado Civil:'),
          estadoCivil: extractField(pageText, 'Estado Civil', 'Sexo:'),
          sexo: extractField(pageText, 'Sexo', 'Tipo Sang'),
          tipoSanguineo: extractField(pageText, 'Tipo Sangüíneo', 'Cor dos Cabelos:'),
          corCabelos: extractField(pageText, 'Cor dos Cabelos', 'Cor dos Olhos:'),
          corOlhos: extractField(pageText, 'Cor dos Olhos', 'Cútis:'),
          cutis: extractField(pageText, 'Cútis', 'Altura:'),
          altura: extractField(pageText, 'Altura', 'Num Calçado:'),
          numCalcado: extractField(pageText, 'Num Calçado', 'Num Quepe:'),
          numQuepe: extractField(pageText, 'Num Quepe', 'Num camisa:'),
          numCamisa: extractField(pageText, 'Num camisa', 'Num Calça:'),
          numCalca: extractField(pageText, 'Num Calça', 'Endereco'),
          telefoneCelular: extractField(pageText, 'Telefone Celular', 'WhatsApp:'),
          whatsapp: extractField(pageText, 'WhatsApp', 'Telefone Funcional:'),
          telefoneFuncional: extractField(pageText, 'Telefone Funcional', 'Telefone Residencial:'),
          telefoneResidencial: extractField(pageText, 'Telefone Residencial', 'OBM Atual:'),
          obmAtual: extractField(pageText, 'OBM Atual', 'Comportamento:'),
          comportamento: extractField(pageText, 'Comportamento', 'Data Boletim'),
          dataBoletim: extractField(pageText, 'Data Boletim', 'Ala:'),
          ala: extractField(pageText, 'Ala', 'Atividade na Ala:'),
          atividadeAla: extractField(pageText, 'Atividade na Ala', 'Função:'),
          funcao: extractField(pageText, 'Função', 'Função Específica:'),
          funcaoEspecifica: extractField(pageText, 'Função Específica', 'Detalhes:'),
          detalhes: extractField(pageText, 'Detalhes', 'Atividade:'),
          atividade: extractField(pageText, 'Atividade', 'RG Anterior:'),
          identidadeCivil: extractField(pageText, 'Identidade Civil', 'Orgao Emissor'),
          orgaoEmissor: extractField(pageText, 'Orgao Emissor', 'Estado Emissor')
      };

      if (personalData.nomeGuerra || personalData.cpf) {
         setPersonalPreview(personalData);
         setPersonalError(null);
      } else {
         setPersonalError("Não foi possível extrair os dados. Copie todo o texto da página de consulta do militar.");
         setPersonalPreview(null);
      }
    } catch (e) {
      setPersonalError('Erro ao processar os dados pessoais.');
    }
  };

  const handlePersonalProcess = async () => {
     if (personalPreview && personalPreview.rg) {
        try {
           const savedData = {
              ...personalPreview,
              updatedAt: new Date().toISOString()
           };
           await setDoc(doc(db, "personalData", personalPreview.rg), savedData, { merge: true });
           await setDoc(doc(db, "militaries", personalPreview.rg), savedData, { merge: true });
           
           alert("Dados pessoais importados com sucesso!");
           setPersonalInputText('');
           setPersonalPreview(null);
           
           // Reload recent data
           const q = query(collection(db, 'personalData'), orderBy('updatedAt', 'desc'), limit(50));
           const snap = await getDocs(q);
           setSyncedData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
           console.error(e);
           alert("Erro ao importar dados pessoais.");
        }
     }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full">
      <div className="mb-4 pt-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group mt-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <TrendingUp className="w-8 h-8" />
           </div>
           <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">DGP Sync</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                Sincronização Universal (Férias e Pessoal)
              </p>
           </div>
        </div>
        <button
          onClick={() =>
            window.open(
              "https://cbmerj.rj.gov.br/dgp/sistema/relatorio_mapa_forca.php",
              "_blank",
            )
          }
          className="px-6 py-4 bg-slate-100 text-slate-600 border-2 border-slate-200 rounded-2xl hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-sm"
        >
          <ExternalLink className="w-5 h-5" /> Acessar DGP
        </button>
      </div>

      <div className="flex gap-4 mb-2">
         <button
            onClick={() => setActiveTab('ferias')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
               activeTab === 'ferias' 
               ? 'bg-orange-600 text-white shadow-lg' 
               : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
         >
            <TableIcon className="w-4 h-4" /> Controle de Férias
         </button>
         <button
            onClick={() => setActiveTab('pessoal')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
               activeTab === 'pessoal' 
               ? 'bg-emerald-600 text-white shadow-lg' 
               : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
         >
            <UserIcon className="w-4 h-4" /> Dados Pessoais
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {showSource !== 'none' ? (
            <div className="col-span-1 lg:col-span-2 space-y-6">
               <button 
                 onClick={() => setShowSource('none')}
                 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-colors"
               >
                 ← Voltar
               </button>

               {showSource === 'tampermonkey' ? (
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 shadow-inner">
                     <h3 className="text-orange-600 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                        Script para Tampermonkey (Recomendado)
                     </h3>
                     <p className="text-slate-600 mb-6 text-sm">
                       O <strong>Tampermonkey</strong> é o método mais estável para sistemas antigos como o DGP.<br/>
                       1. Instale a extensão <strong>Tampermonkey</strong> no seu Chrome.<br/>
                       2. Clique no ícone do Tampermonkey e vá em "Criar novo script".<br/>
                       3. Apague tudo o que estiver lá e cole o código abaixo.<br/>
                       4. Salve (Arquivo - Salvar) e pronto! Um botão Universal aparecerá em todas as páginas do DGP.
                     </p>
                     <textarea 
                       readOnly
                       className="w-full h-80 bg-white border border-slate-200 rounded-2xl p-6 font-mono text-[10px] shadow-sm mb-4"
                       value={tampermonkeyCode}
                     />
                     <button 
                       onClick={() => {
                          navigator.clipboard.writeText(tampermonkeyCode).then(() => {
                            alert('CÓDIGO COPIADO!\nAgora cole no Tampermonkey e salve.');
                          }).catch(err => {
                            console.error('Failed to copy', err);
                            alert('Erro ao copiar.');
                          });
                       }}
                       className="w-full py-4 bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow-lg hover:bg-orange-700 transition-colors"
                     >
                       COPIAR CÓDIGO DO SCRIPT
                     </button>
                  </div>
               ) : (
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8">
                     <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest mb-4">Arquivos da Extensão DGP (Manual)</h3>
                     <p className="text-slate-600 mb-6 text-sm">
                       Crie uma pasta no seu computador chamada <strong>"ExtensaoDGP"</strong>.<br/>
                       Dentro dessa pasta, crie os arquivos abaixo e cole os respectivos códigos. <br/>
                       Em seguida, no Chrome, acesse <strong>chrome://extensions</strong>, ative o "Modo do desenvolvedor" e clique em "Carregar sem compactação".
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {['manifest', 'content', 'popupjs', 'popuphtml'].map(file => {
                          const exactExt = file === 'manifest' ? '.json' : file === 'content' ? '.js' : file === 'popupjs' ? 'popup.js' : 'popup.html';
                          const link = `${appUrl}/api/admin/extension/raw/${file}`;
                          return (
                            <div key={file} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm group">
                              <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-4">{file === 'manifest' ? 'manifest.json' : file === 'content' ? 'content.js' : exactExt}</h4>
                              <a 
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full py-3 bg-slate-100 text-slate-800 group-hover:bg-slate-200 rounded-xl text-center font-black text-[10px] uppercase tracking-widest transition-colors"
                              >
                                 VER CÓDIGO FONTE ({exactExt.toUpperCase()})
                              </a>
                            </div>
                          )
                       })}
                     </div>
                  </div>
               )}
            </div>
         ) : (
          <div className="space-y-8">
             <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                <h3 className="text-orange-400 font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                   <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                   Sincronização Automática
                </h3>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-8">
                  Escolha o método que melhor se adapta ao seu computador no quartel. O <strong>Tampermonkey</strong> é o mais recomendado por ser definitivo e ter o Sincronizador Universal integrado.
                </p>
                
                <div className="bg-zinc-900/50 p-4 rounded-2xl mb-6 border border-zinc-800 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-zinc-400 text-[10px] uppercase font-black tracking-[0.2em]">Conexão do Servidor</p>
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                     <button 
                       onClick={() => setUrlType('pre')}
                       className={`py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${urlType === 'pre' ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                     >
                       Produção (PRE)
                     </button>
                     <button 
                       onClick={() => setUrlType('dev')}
                       className={`py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${urlType === 'dev' ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                     >
                       Desenvolvimento
                     </button>
                  </div>
                </div>

                <div className="space-y-4">
                   <button 
                     onClick={() => setShowSource('tampermonkey')}
                     className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-center font-black text-[9px] uppercase tracking-[0.3em] transition-all shadow-lg flex items-center justify-center gap-2"
                   >
                      🐵 MODO ESTÁVEL (TAMPERMONKEY)
                   </button>

                   <button 
                     onClick={() => setShowSource('extension')}
                     className="block w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-center font-black text-[9px] uppercase tracking-[0.3em] transition-all border border-white/10"
                   >
                      📝 MODO EXTENSÃO (CARREGAR MANUAL)
                   </button>
                </div>
             </div>

             <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8">
                <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                   <TableIcon className="w-5 h-5 text-emerald-500" />
                   Últimos Dados de Pessoal Sincronizados
                </h3>
                {loading ? (
                  <div className="text-slate-300 font-black uppercase tracking-widest text-[10px] text-center">
                     Carregando dados...
                  </div>
                ) : syncedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-4 opacity-40">
                     <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Nenhum dado sincronizado ainda</p>
                  </div>
                ) : (
                  <div className="h-[200px] overflow-auto pr-2 space-y-3">
                     {syncedData.map((d, i) => (
                        <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="text-[10px] font-black tracking-tighter text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                {d.rg}
                              </div>
                              <div>
                                 <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">{d.nomeGuerra || 'NOME'}</div>
                              </div>
                           </div>
                           <div className="flex flex-col text-right justify-center">
                              <div className="text-[10px] font-bold text-slate-600">
                                {new Date(d.updatedAt).toLocaleDateString('pt-BR')}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
             </div>
          </div>
         )}

         {showSource === 'none' && activeTab === 'ferias' && (
            <div className="flex flex-col h-full">
               <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                     <TableIcon className="w-4 h-4" /> Importação Manual de Férias (Backup)
                  </h3>
                  
                  <div className="flex flex-col gap-4 mb-4">
                     <input
                       type="text"
                       placeholder="Digite o RG do Militar"
                       value={targetRg}
                       onChange={(e) => setTargetRg(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold focus:border-orange-500 outline-none"
                     />
                  </div>

                  <div className="flex-1 flex flex-col gap-6">
                    <textarea 
                      className="w-full h-32 bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 font-mono text-[11px] focus:border-orange-500 transition-all outline-none resize-none shadow-inner"
                      placeholder="Cole os dados de férias (tabela do DGP) aqui..."
                      value={inputText}
                      onChange={(e) => {
                         setInputText(e.target.value);
                         parseData(e.target.value);
                      }}
                    />

                    <div className="flex-1 min-h-[150px] border-2 border-dashed border-slate-200 rounded-3xl p-4 overflow-y-auto">
                       {error ? (
                          <div className="h-full flex flex-col items-center justify-center text-center">
                             <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                             <p className="text-slate-400 text-[10px] font-black uppercase leading-relaxed">{error}</p>
                          </div>
                       ) : preview.length > 0 ? (
                          <div className="space-y-2">
                             {preview.map((v, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded">R:{v.anoRef}</div>
                                      <div>
                                         <div className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{v.dataInicio} - {v.dataRetorno}</div>
                                      </div>
                                   </div>
                                   <div className="text-right font-black text-slate-400 text-[9px] uppercase">
                                      {v.diasGozados}D
                                   </div>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                             <FileJson className="w-10 h-10 text-slate-300 mb-2" />
                             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aguardando dados...</p>
                          </div>
                       )}
                    </div>

                    <button 
                      onClick={handleProcess}
                      disabled={preview.length === 0 || !targetRg}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                       <CheckCircle2 className="w-4 h-4" /> Importar {preview.length} Registros
                    </button>
                  </div>
               </div>
            </div>
         )}

         {showSource === 'none' && activeTab === 'pessoal' && (
            <div className="flex flex-col h-full">
               <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                     <UserIcon className="w-4 h-4" /> Importação Manual de Dados Pessoais (Backup)
                  </h3>

                  <div className="flex-1 flex flex-col gap-6 mt-4">
                    <textarea 
                      className="w-full h-40 bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 font-mono text-[11px] focus:border-emerald-500 transition-all outline-none resize-none shadow-inner"
                      placeholder="Cole todo o texto da página de dados pessoais do DGP (Ctrl+A e Ctrl+C na página da intranet)..."
                      value={personalInputText}
                      onChange={(e) => {
                         setPersonalInputText(e.target.value);
                         parsePersonalData(e.target.value);
                      }}
                    />

                    <div className="flex-1 min-h-[150px] border-2 border-dashed border-slate-200 rounded-3xl p-4 overflow-y-auto">
                       {personalError ? (
                          <div className="h-full flex flex-col items-center justify-center text-center">
                             <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                             <p className="text-slate-400 text-[10px] font-black uppercase leading-relaxed">{personalError}</p>
                          </div>
                       ) : personalPreview ? (
                          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-3">
                             <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                                <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">RG: {personalPreview.rg}</div>
                                <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{personalPreview.nomeGuerra || personalPreview.cpf}</div>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-wider text-slate-500">
                                <div><span className="font-bold text-slate-400">NASCIMENTO:</span> {personalPreview.nascimento || '---'}</div>
                                <div><span className="font-bold text-slate-400">CPF:</span> {personalPreview.cpf || '---'}</div>
                                <div><span className="font-bold text-slate-400">TELEFONE:</span> {personalPreview.telefoneCelular || '---'}</div>
                                <div><span className="font-bold text-slate-400">TIPO SANG:</span> {personalPreview.tipoSanguineo || '---'}</div>
                             </div>
                          </div>
                       ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                             <FileText className="w-10 h-10 text-emerald-600 mb-2" />
                             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aguardando colagem...</p>
                          </div>
                       )}
                    </div>

                    <button 
                      onClick={handlePersonalProcess}
                      disabled={!personalPreview}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                       <CheckCircle2 className="w-4 h-4" /> Importar Dados de Pessoal
                    </button>
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
