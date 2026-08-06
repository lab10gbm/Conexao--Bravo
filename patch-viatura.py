import re

with open('src/components/ControleViaturasModule.tsx', 'r') as f:
    content = f.read()

# Replace editingId state with editingVtr
content = re.sub(
    r"const \[editingId, setEditingId\] = useState<string \| null>\(null\);\n  const \[editingValue, setEditingValue\] = useState\(''\);",
    "const [editingVtr, setEditingVtr] = useState<ViaturaConfig | null>(null);",
    content
)

# Replace inline edit rendering
content = re.sub(
    r"\{editingId === vtr\.id \? \(.*?\)\s*:\s*\(\s*vtr\.vtr\s*\)\}",
    "vtr.vtr",
    content,
    flags=re.DOTALL
)

# Replace edit button onClick
content = re.sub(
    r"onClick=\{\(\) => \{\s*setEditingId\(vtr\.id\);\s*setEditingValue\(vtr\.vtr\);\s*\}\}",
    "onClick={() => setEditingVtr(vtr)}",
    content
)

# Add Modal at the end of the file
modal_code = """
  return (
    <div className="flex flex-col gap-6">
      {editingVtr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setEditingVtr(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 mb-4">
              Editar Viatura
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome da Viatura</label>
                <input 
                  type="text" 
                  value={editingVtr.vtr}
                  onChange={(e) => setEditingVtr({...editingVtr, vtr: e.target.value.toUpperCase()})}
                  className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold"
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-700 mb-2">Nomes Customizados das Funções</h3>
                <p className="text-[10px] text-slate-400 mb-4">Se deixado em branco, o sistema usará o nome padrão (Ex: CONDUTOR, G1, CHEFE, etc).</p>
                
                {['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].map(slot => {
                  if (editingVtr.blocked.includes(slot)) return null;
                  return (
                    <div key={slot} className="mb-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nome p/ {slot === 'cg' ? 'Chefe Guarnição' : slot}</label>
                      <input 
                        type="text" 
                        value={editingVtr.customNames?.[slot as keyof typeof editingVtr.customNames] || ''}
                        onChange={(e) => {
                          const newNames = { ...(editingVtr.customNames || {}) };
                          newNames[slot as keyof typeof newNames] = e.target.value.toUpperCase();
                          setEditingVtr({...editingVtr, customNames: newNames});
                        }}
                        placeholder={`Ex: ${slot === 'condutor' ? 'MESTRE' : slot === 'g1' ? 'MARINHEIRO' : slot.toUpperCase()}`}
                        className="w-full p-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  if (!editingVtr.vtr.trim()) return;
                  if (viaturas.some(v => v.vtr === editingVtr.vtr && v.id !== editingVtr.id)) {
                    alert("Já existe outra viatura com este nome.");
                    return;
                  }
                  setViaturas(prev => prev.map(v => v.id === editingVtr.id ? editingVtr : v));
                  setEditingVtr(null);
                }}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace('  return (\n    <div className="flex flex-col gap-6">', modal_code)

with open('src/components/ControleViaturasModule.tsx', 'w') as f:
    f.write(content)
