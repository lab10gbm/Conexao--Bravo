import re

with open("src/components/EscalaEspelhoModule.tsx", "r") as f:
    content = f.read()

# Fix the return block in `useMemo` for `estudoTecnico`
old_return = """    const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

    return {
      efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },"""

new_return = """    const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

    let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
    let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

    return {
      efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
      efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
      efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },"""

content = content.replace(old_return, new_return)

# Now fix the rendering section
old_render = """                      {/* Efetivo Global */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Efetivo Global</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivo.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivo.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivo.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivo.req}</span>
                        </div>
                      </div>
                      
                      {/* Condutores */}"""

new_render = """                      {/* Efetivo Global */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Efetivo Global (Total)</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivo.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivo.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivo.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivo.req}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-2">Funções Operacionais</span>
                      </div>
                      
                      {/* Efetivo Operacional */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Operacional</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivoOperacional.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivoOperacional.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivoOperacional.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivoOperacional.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivoOperacional.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivoOperacional.req}</span>
                        </div>
                      </div>
                      
                      {/* Condutores */}"""
                      
content = content.replace(old_render, new_render)


old_admin = """                      {/* Admin */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Serviços Internos</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.admin.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.admin.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.admin.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.admin.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.admin.deficit}</span>
                           <span>Nec: {estudoTecnico.admin.req}</span>
                        </div>
                      </div>"""
                      
new_admin = """                      <div className="pt-4">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-2">Funções Administrativas</span>
                      </div>

                      {/* Efetivo Administrativo */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Administrativo</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivoAdministrativo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivoAdministrativo.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivoAdministrativo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivoAdministrativo.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivoAdministrativo.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivoAdministrativo.req}</span>
                        </div>
                      </div>"""

content = content.replace(old_admin, new_admin)

with open("src/components/EscalaEspelhoModule.tsx", "w") as f:
    f.write(content)

