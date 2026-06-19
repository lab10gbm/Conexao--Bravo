import { buildUnifiedTampermonkeyScript, buildUnifiedBookmarkletScript } from '../lib/tampermonkey';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, TrendingUp, CheckCircle2, AlertCircle, FileJson, Table as TableIcon } from 'lucide-react';
import { Vacation } from '../types';

interface VacationImporterProps {
  militarRg: string;
  onImport: (vacations: Vacation[]) => void;
  onClose: () => void;
}

export function VacationImporter({ militarRg, onImport, onClose, allMilitars = [] }: VacationImporterProps & { allMilitars?: any[] }) {
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<Partial<Vacation>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showSource, setShowSource] = useState<'none' | 'extension' | 'tampermonkey'>('none');

  const parseData = (text: string) => {
    try {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const extracted: Partial<Vacation>[] = [];

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
             militarRg,
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
        setError('Não foi possível identificar dados. Tente usar o botão de favorito acima ou copie a tabela novamente.');
      } else {
        setPreview(extracted);
        setError(null);
      }
    } catch (e) {
      setError('Erro ao processar os dados.');
    }
  };

  const handleProcess = () => {
    if (preview.length > 0) {
      onImport(preview as Vacation[]);
    }
  };

  const [urlType, setUrlType] = React.useState<'dev' | 'pre'>('dev');
  const rawAppUrl = window.location.origin;
  const appUrl = urlType === 'pre' ? rawAppUrl.replace('ais-dev-', 'ais-pre-') : rawAppUrl;
  const appDomain = new URL(appUrl).hostname;

  const tampermonkeyCode = buildUnifiedTampermonkeyScript(appUrl);
  const bookmarkletCode = buildUnifiedBookmarkletScript();
  const scannerCode = "";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-orange-600 flex items-center justify-between text-white">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                 <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tighter">Sincronizador DGP de Elite</h2>
                 <p className="text-[10px] font-bold uppercase opacity-80 tracking-[0.2em] mt-1">Conectado ao Portal de Permutas</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
           </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
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
                          Script para Tampermonkey
                       </h3>
                       <p className="text-slate-600 mb-6 text-sm">
                         O <strong>Tampermonkey</strong> é o método mais estável para sistemas antigos como o DGP.<br/>
                         1. Instale a extensão <strong>Tampermonkey</strong> no seu Chrome.<br/>
                         2. Clique no ícone do Tampermonkey e vá em "Criar novo script".<br/>
                         3. Apague tudo o que estiver lá e cole o código abaixo.<br/>
                         4. Salve (Arquivo - Salvar) e pronto! Um botão aparecerá no DGP.
                       </p>
                       <textarea 
                         readOnly
                         className="w-full h-80 bg-white border border-slate-200 rounded-2xl p-6 font-mono text-[10px] shadow-sm mb-4"
                         value={tampermonkeyCode}
                       />
                       <button 
                         onClick={() => {
                            navigator.clipboard.writeText(tampermonkeyCode);
                            alert('CÓDIGO COPIADO!\nAgora cole no Tampermonkey e salve.');
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
                                  className="block w-full py-3 bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 rounded-xl text-center font-black text-[10px] uppercase tracking-widest transition-colors"
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
                     Sincronização Ativa
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-8">
                    Escolha o método que melhor se adapta ao seu computador no quartel. O <strong>Tampermonkey</strong> é o mais recomendado por ser definitivo.
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
                    <div className="text-[9px] text-zinc-500 mt-3 text-center space-y-1">
                      <p>{urlType === 'pre' ? '⚠️ Erro 503? Clique no botão "Share" no TOPO Roxo da tela!' : '⚡ Conectado ao servidor de código vivo.'}</p>
                      {urlType === 'pre' && (
                        <p className="text-orange-500/80 font-bold uppercase tracking-tighter">O botão SHARE fica fora do app, no topo do Studio</p>
                      )}
                      <div className="flex justify-center gap-4 mt-2">
                        <button 
                          onClick={() => {
                            fetch(`${appUrl}/api/health`)
                              .then(r => r.json())
                              .then(d => alert(`✅ CONEXÃO OK!\nBanco: ${d.db}\nSincronizador: Pronto`))
                              .catch(e => alert(`❌ FALHA: ${e.message}`));
                          }}
                          className="text-zinc-400 hover:text-white underline font-bold"
                        >
                          TESTAR CONEXÃO
                        </button>
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-orange-400 hover:text-orange-300 underline font-bold"
                        >
                          ATUALIZAR PAINEL
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <a 
                       ref={bookmarkletRef}
                       onClick={(e) => {
                          if (e.button === 0) { // Left click only
                            e.preventDefault();
                            navigator.clipboard.writeText(bookmarkletCode);
                            alert('CÓDIGO COPIADO!\n\nCOMO USAR:\n1. Arraste este botão para sua barra de favoritos\nOU\n2. Crie um favorito novo e cole o código na URL.');
                          }
                       }}
                       className="block relative w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl text-center font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-3 cursor-move group"
                     >
                       <span className="relative z-10 flex items-center gap-2">
                         <span className="animate-bounce">🚀</span> ARRASTE O ATALHO SINCRONIZAR
                       </span>
                     </a>

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
                  <p className="mt-4 text-center text-[10px] text-orange-500 font-black uppercase tracking-widest animate-pulse italic text-balance">Recomendamos remover versões antigas antes de instalar estas!</p>
               </div>

               <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8">
                  <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest mb-6">Como funciona no quartel?</h3>
                  <div className="space-y-4">
                     {[
                       "Abra o DGP na aba de Férias do militar.",
                       "Use o botão do Tampermonkey (superior direito) ou o Favorito.",
                       "Os dados viajam sozinhos para este sistema.",
                       "Nenhum dado sensível é capturado, apenas as datas de férias."
                     ].map((step, i) => (
                       <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</div>
                          <p className="text-xs text-slate-600 font-bold leading-relaxed">{step}</p>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
           )}

           <div className="flex flex-col h-full">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                 <TableIcon className="w-4 h-4" /> Importação Manual (Backup)
              </h3>
              
              <div className="flex-1 flex flex-col gap-6">
                <textarea 
                  className="w-full h-48 bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 font-mono text-[11px] focus:border-orange-500 transition-all outline-none resize-none shadow-inner"
                  placeholder="Se o botão não funcionar, cole os dados aqui..."
                  value={inputText}
                  onChange={(e) => {
                     setInputText(e.target.value);
                     parseData(e.target.value);
                  }}
                />

                <div className="flex-1 min-h-[200px] border-2 border-dashed border-slate-200 rounded-3xl p-6 overflow-y-auto">
                   {error ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                         <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                         <p className="text-slate-400 text-[10px] font-black uppercase leading-relaxed">{error}</p>
                      </div>
                   ) : preview.length > 0 ? (
                      <div className="space-y-3">
                         {preview.map((v, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">R:{v.anoRef}</div>
                                  <div>
                                     <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">{v.dataInicio} - {v.dataRetorno}</div>
                                     <div className="text-[9px] font-bold text-slate-400 uppercase">{v.boletim}</div>
                                  </div>
                               </div>
                               <div className="text-right font-black text-slate-400 text-[10px] uppercase">
                                  {v.diasGozados}D
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                         <FileJson className="w-16 h-16 text-slate-300 mb-4" />
                         <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Aguardando dados...</p>
                      </div>
                   )}
                </div>

                <button 
                  onClick={handleProcess}
                  disabled={preview.length === 0}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-4 shadow-xl"
                >
                   <CheckCircle2 className="w-5 h-5" /> Importar {preview.length} Registros
                </button>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
