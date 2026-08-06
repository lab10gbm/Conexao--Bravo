import re

with open('src/components/EscalaPrintView.tsx', 'r') as f:
    content = f.read()

helpers_logic = """
  let usedMilitars = new Set<string>();
  const getVtrByPrefix = (prefix: string, index: number = 0) => {
     if (!viaturasInfo) return null;
     const activeVtrs = viaturasInfo.filter((v: any) => v.ativa && (prefix === 'AR' ? v.vtr.startsWith('AR-') : v.vtr.startsWith(prefix)));
     return activeVtrs[index] || null;
  };

  const getSlotName = (v: any, slot: string, defaultName: string) => {
     if (!v) return defaultName;
     if (v.customNames?.[slot]) return v.customNames[slot].trim().toUpperCase();
     return defaultName;
  };

  const getVtrSlotMilitar = (v: any, slot: string, defaultName: string) => {
     if (!v || v[slot] === false || v.blocked?.includes(slot)) return null;
     const funcName = getSlotName(v, slot, defaultName);
     const candidates = getByFunc(funcName);
     const unused = candidates.find((m: any) => !usedMilitars.has(m.rg));
     if (unused) {
        usedMilitars.add(unused.rg);
        return unused;
     }
     return null;
  };

  const renderVtrSlot = (v: any, slot: string, defaultName: string, fallbackLabel: string, forceRender = false, invisible = false) => {
     if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot))) return null;
     const m = getVtrSlotMilitar(v, slot, defaultName);
     const label = getSlotName(v, slot, defaultName);
     // Shorten label if it's too long, or just use it.
     const displayLabel = v?.customNames?.[slot] ? v.customNames[slot].substring(0, 15) : fallbackLabel;
     
     return (
       <div className={`flex gap-1 items-center min-h-[20px] ${invisible ? 'opacity-0' : ''}`}>
         <span className="font-bold shrink-0">{displayLabel}:</span> 
         <span className="truncate">{renderMilitar(m)}</span>
       </div>
     );
  };
"""

content = re.sub(
    r"const abtCg = getByFunc\('CHEFE ABT'\);.*?const bia013Ms = \[\];",
    helpers_logic,
    content,
    flags=re.DOTALL
)

table_body = """
            <tbody>
              <tr>
                 {/* ABT */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       {(() => { const v = getVtrByPrefix('ABT'); return <>
                          {renderVtrSlot(v, 'cg', 'CHEFE ABT', 'CG')}
                          {renderVtrSlot(v, 'g1', 'AUXILIAR ABT', 'P1')}
                          {renderVtrSlot(v, 'g2', 'AUXILIAR ABT', 'P2')}
                          {renderVtrSlot(v, 'g3', 'AUXILIAR ABT', 'P3')}
                          {renderVtrSlot(v, 'g4', 'AUXILIAR ABT', 'P4')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ABT', 'Mot')}
                       </>})()}
                    </div>
                 </td>
                 {/* ABSL */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       {(() => { const v = getVtrByPrefix('ABSL'); return <>
                          {renderVtrSlot(v, 'cg', 'CHEFE ABSL', 'CG')}
                          {renderVtrSlot(v, 'g1', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'g2', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'g3', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'g4', 'AUXILIAR ABSL', 'Guarnição')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ABSL', 'Mot')}
                       </>})()}
                    </div>
                 </td>
                 {/* ASE */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px] p-2 justify-between">
                       {(() => { const v = getVtrByPrefix('ASE'); return <>
                          {renderVtrSlot(v, 'g1', 'ENFERMEIRO', 'Enfermeiro(a)')}
                          {renderVtrSlot(v, 'g2', 'ENFERMEIRO', 'Enfermeiro(a)')}
                          {renderVtrSlot(v, 'g3', 'AUXILIAR ASE', 'Auxiliar')}
                          {renderVtrSlot(v, 'g4', 'AUXILIAR ASE', 'Auxiliar')}
                          {renderVtrSlot(v, 'cg', 'CHEFE ASE', 'CG')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ASE', 'Mot')}
                       </>})()}
                    </div>
                 </td>
                 {/* ARC & AR */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px]">
                       <div className="p-2 flex-1 flex flex-col justify-between">
                       {(() => { const v = getVtrByPrefix('ARC'); return <>
                          {renderVtrSlot(v, 'cg', 'AUXILIAR / CHEFE ARC', 'Guarnição')}
                          {renderVtrSlot(v, 'g1', 'AUXILIAR / CHEFE ARC', 'Guarnição')}
                          {renderVtrSlot(v, 'g2', 'AUXILIAR / CHEFE ARC', 'Guarnição')}
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR ARC', 'Mot')}
                       </>})()}
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5 mt-auto`}>{getActiveVtr('AR')}</div>
                       <div className="p-2 flex flex-col justify-end">
                       {(() => { const v = getVtrByPrefix('AR'); return <>
                          {renderVtrSlot(v, 'condutor', 'CONDUTOR AR', 'Mot', true)}
                       </>})()}
                       </div>
                    </div>
                 </td>
                 {/* L-09 & BIA */}
                 <td className="border border-black p-0 align-top">
                    <div className="flex flex-col h-full min-h-[180px]">
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                       {(() => { const v = getVtrByPrefix('L-'); return <>
                          {renderVtrSlot(v, 'condutor', 'MESTRE AL', 'MS', true)}
                          {renderVtrSlot(v, 'g1', 'MARINHEIRO', 'MN', true)}
                          {renderVtrSlot(v, 'g2', 'MARINHEIRO', 'MN')}
                       </>})()}
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5`}>{getActiveVtr('BIA', 0)}</div>
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                       {(() => { const v = getVtrByPrefix('BIA', 0); return <>
                          {renderVtrSlot(v, 'condutor', 'MESTRE BIA', 'MS', true)}
                          {renderVtrSlot(v, 'g1', 'MARINHEIRO', 'MN', true)}
                          {renderVtrSlot(v, 'g2', 'MARINHEIRO', 'MN')}
                       </>})()}
                       </div>
                       <div className={`border-y-2 border-black ${headerColorClass} font-bold text-center py-0.5`}>{getActiveVtr('BIA', 1)}</div>
                       <div className="p-2 flex-1 flex flex-col justify-center gap-1">
                       {(() => { const v = getVtrByPrefix('BIA', 1); return <>
                          {renderVtrSlot(v, 'condutor', 'MESTRE BIA', 'MS', true)}
                          {renderVtrSlot(v, 'g1', 'MARINHEIRO', 'MN')}
                       </>})()}
                       </div>
                    </div>
                 </td>
              </tr>
            </tbody>
"""

content = re.sub(
    r"<tbody>.*?</tr>\s*</tbody>",
    table_body,
    content,
    flags=re.DOTALL
)

with open('src/components/EscalaPrintView.tsx', 'w') as f:
    f.write(content)
