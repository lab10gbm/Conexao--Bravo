import re

with open("src/components/EstudoTecnicoGuarnicoesModule.tsx", "r") as f:
    content = f.read()

# I will replace from `return (` of the alasStats map, down to `</motion.div>`
pattern = r"return \(\s*<motion\.div.*?initial=\{\{ opacity: 0, y: 10 \}\}.*?</motion\.div>\s*\)"

replacement = """return (
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  key={ala} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
               >
                  <div className={cn("p-4 border-b flex justify-between items-center", `bg-${getAlaColor(ala as '1'|'2'|'3'|'4')}-50`, `border-${getAlaColor(ala as '1'|'2'|'3'|'4')}-100`)}>
                     <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", `bg-${getAlaColor(ala as '1'|'2'|'3'|'4')}-500`)} />
                        <h2 className={cn("text-xs font-black uppercase tracking-widest", `text-${getAlaColor(ala as '1'|'2'|'3'|'4')}-700`)}>
                           {getAlaName(ala as '1'|'2'|'3'|'4')}
                        </h2>
                     </div>
                     <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", `bg-${getAlaColor(ala as '1'|'2'|'3'|'4')}-100 text-${getAlaColor(ala as '1'|'2'|'3'|'4')}-700`)}>
                        {rosterCount} MILITARES
                     </span>
                  </div>
                  
                  <div className="p-5 flex-1 bg-white">
                     <div className="space-y-4">
                        
                        {/* Efetivo Global (Total) */}
                        <div className="mb-6">
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                 <Users className="w-3.5 h-3.5" />
                                 Efetivo Global (Total)
                              </span>
                              <span className={cn("text-[11px] font-black", stats.efetivo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.efetivo.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.efetivo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivo.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.efetivo.deficit}</span>
                              <span>Nec: {stats.efetivo.req}</span>
                           </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-3">Funções Operacionais</span>
                        </div>

                        {/* Global Operacional */}
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Operacional</span>
                              <span className={cn("text-[11px] font-black", stats.efetivoOperacional.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.efetivoOperacional.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.efetivoOperacional.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivoOperacional.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.efetivoOperacional.deficit}</span>
                              <span>Nec: {stats.efetivoOperacional.req}</span>
                           </div>
                        </div>

                        {/* Condutores */}
                        {stats.condutores.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Condutores</span>
                              <span className={cn("text-[11px] font-black", stats.condutores.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.condutores.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.condutores.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.condutores.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.condutores.deficit}</span>
                              <span>Nec: {stats.condutores.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Condutores Marítimos */}
                        {stats.condutores_maritimos.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mestres (Marítimo)</span>
                              <span className={cn("text-[11px] font-black", stats.condutores_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.condutores_maritimos.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.condutores_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.condutores_maritimos.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.condutores_maritimos.deficit}</span>
                              <span>Nec: {stats.condutores_maritimos.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Chefes */}
                        {stats.chefes.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chefes de Guarnição</span>
                              <span className={cn("text-[11px] font-black", stats.chefes.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.chefes.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.chefes.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.chefes.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.chefes.deficit}</span>
                              <span>Nec: {stats.chefes.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Chefes Maritimos */}
                        {stats.chefes_maritimos.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chefes (Marítimo)</span>
                              <span className={cn("text-[11px] font-black", stats.chefes_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.chefes_maritimos.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.chefes_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.chefes_maritimos.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.chefes_maritimos.deficit}</span>
                              <span>Nec: {stats.chefes_maritimos.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Auxiliares */}
                        {stats.auxiliares.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auxiliares / Geral</span>
                              <span className={cn("text-[11px] font-black", stats.auxiliares.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.auxiliares.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.auxiliares.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.auxiliares.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.auxiliares.deficit}</span>
                              <span>Nec: {stats.auxiliares.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Auxiliares Maritimos */}
                        {stats.auxiliares_maritimos.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marinheiros (Marítimo)</span>
                              <span className={cn("text-[11px] font-black", stats.auxiliares_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.auxiliares_maritimos.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.auxiliares_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.auxiliares_maritimos.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.auxiliares_maritimos.deficit}</span>
                              <span>Nec: {stats.auxiliares_maritimos.req}</span>
                           </div>
                        </div>
                        )}

                        <div className="pt-4">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-3">Funções Administrativas</span>
                        </div>

                        {/* Efetivo Administrativo */}
                        {stats.efetivoAdministrativo.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Administrativo</span>
                              <span className={cn("text-[11px] font-black", stats.efetivoAdministrativo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.efetivoAdministrativo.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.efetivoAdministrativo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivoAdministrativo.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.efetivoAdministrativo.deficit}</span>
                              <span>Nec: {stats.efetivoAdministrativo.req}</span>
                           </div>
                        </div>
                        )}

                     </div>
                  </div>
               </motion.div>
            )"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open("src/components/EstudoTecnicoGuarnicoesModule.tsx", "w") as f:
    f.write(content)
print("done")
