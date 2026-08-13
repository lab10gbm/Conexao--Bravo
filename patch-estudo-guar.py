import re

with open("src/components/EstudoTecnicoGuarnicoesModule.tsx", "r") as f:
    content = f.read()

# Fix the return block in `useMemo` for `alasStats`
old_return = """       const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;
       
       return {
         ala: alaName,
         rosterCount: roster.length,
         stats: {
             efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },"""

new_return = """       const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;
       
       let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
       let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

       return {
         ala: alaName,
         rosterCount: roster.length,
         stats: {
             efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
             efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
             efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },"""

content = content.replace(old_return, new_return)

# Fix rendering block for Operational
old_render = """                     {/* Efetivo Global */}
                     <div className="pb-4 border-b border-slate-100">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Efetivo Global</span>
                           <span className={cn("text-sm font-black", isDanger ? "text-rose-500" : "text-emerald-500")}>
                           {stats.efetivo.chance > 0 ? `DÉFICIT: ${stats.efetivo.deficit}` : 'IDEAL'}
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                           <div className={cn("h-2.5 rounded-full transition-all", isDanger ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivo.chance > 0 ? stats.efetivo.chance : 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold uppercase">
                           <span>{rosterCount} / {stats.efetivo.req} Previstos</span>
                           <span>{stats.efetivo.chance}% de Risco</span>
                        </div>
                     </div>

                     <div className="space-y-4">
                        {/* Motoristas */}"""

new_render = """                     {/* Efetivo Global */}
                     <div className="pb-4 border-b border-slate-100">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Efetivo Global</span>
                           <span className={cn("text-sm font-black", isDanger ? "text-rose-500" : "text-emerald-500")}>
                           {stats.efetivo.chance > 0 ? `DÉFICIT: ${stats.efetivo.deficit}` : 'IDEAL'}
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                           <div className={cn("h-2.5 rounded-full transition-all", isDanger ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivo.chance > 0 ? stats.efetivo.chance : 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold uppercase">
                           <span>{rosterCount} / {stats.efetivo.req} Previstos</span>
                           <span>{stats.efetivo.chance}% de Risco</span>
                        </div>
                     </div>

                     <div className="pt-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-3">Funções Operacionais</span>
                     </div>

                     <div className="pb-4 border-b border-slate-100">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Operacional</span>
                           <span className={cn("text-sm font-black", stats.efetivoOperacional.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                           {stats.efetivoOperacional.chance > 0 ? `DÉFICIT: ${stats.efetivoOperacional.deficit}` : 'IDEAL'}
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                           <div className={cn("h-2.5 rounded-full transition-all", stats.efetivoOperacional.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivoOperacional.chance > 0 ? stats.efetivoOperacional.chance : 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold uppercase">
                           <span>{stats.efetivoOperacional.deficit} Lacunas / {stats.efetivoOperacional.req} Previstos</span>
                           <span>{stats.efetivoOperacional.chance}% de Risco</span>
                        </div>
                     </div>

                     <div className="space-y-4">
                        {/* Motoristas */}"""
content = content.replace(old_render, new_render)


old_admin = """                        {/* Serviços Internos */}
                        {stats.admin.req > 0 && (
                           <div>
                              <div className="flex justify-between text-[11px] mb-1 font-bold text-slate-700">
                                 <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-slate-400" /> Serviços Internos</span>
                                 <span className={stats.admin.chance > 0 ? "text-rose-500" : "text-emerald-500"}>
                                    Faltam {stats.admin.deficit} / {stats.admin.req}
                                 </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                 <div className={cn("h-1.5 rounded-full", stats.admin.chance > 0 ? "bg-rose-400" : "bg-emerald-400")} style={{ width: `${stats.admin.chance > 0 ? stats.admin.chance : 100}%` }}></div>
                              </div>
                           </div>
                        )}"""
                        
new_admin = """                     </div>

                     <div className="pt-4">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-3">Funções Administrativas</span>
                     </div>

                     <div className="pb-4">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Administrativo</span>
                           <span className={cn("text-sm font-black", stats.efetivoAdministrativo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                           {stats.efetivoAdministrativo.chance > 0 ? `DÉFICIT: ${stats.efetivoAdministrativo.deficit}` : 'IDEAL'}
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                           <div className={cn("h-2.5 rounded-full transition-all", stats.efetivoAdministrativo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivoAdministrativo.chance > 0 ? stats.efetivoAdministrativo.chance : 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold uppercase">
                           <span>{stats.efetivoAdministrativo.deficit} Lacunas / {stats.efetivoAdministrativo.req} Previstos</span>
                           <span>{stats.efetivoAdministrativo.chance}% de Risco</span>
                        </div>
                     </div>"""
                     
content = content.replace(old_admin, new_admin)

with open("src/components/EstudoTecnicoGuarnicoesModule.tsx", "w") as f:
    f.write(content)

