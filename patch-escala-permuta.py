import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# 1. Add import RequestPermuta
import_str = "import { RequestPermuta } from './RequestPermuta';\n"
if "import { RequestPermuta }" not in content:
    content = content.replace('import { Search, ChevronDown, Check, X, User, Printer, Calendar as CalendarIcon, Filter, Shuffle, Copy, AlertTriangle, Info, MapPin, Loader2, Link, ArrowRightLeft } from "lucide-react";', 
        'import { Search, ChevronDown, Check, X, User, Printer, Calendar as CalendarIcon, Filter, Shuffle, Copy, AlertTriangle, Info, MapPin, Plus, Loader2, Link, ArrowRightLeft } from "lucide-react";\n' + import_str)

# 2. Add state for RequestPermuta
state_str = "  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);\n  const [loadingPermutas, setLoadingPermutas] = useState(false);"
content = content.replace('  const [loadingPermutas, setLoadingPermutas] = useState(false);', state_str)

# 3. Render button in section 1 header
button_str = '''            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPermutaModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-3 py-1.5 rounded shadow-sm flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Nova Permuta
              </button>
'''
content = content.replace('            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">\n              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />\n              Import Permuta (Substituições Aprovadas)\n            </h3>',
'''            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              Import Permuta (Substituições Aprovadas)
            </h3>
''' + button_str + '            </div>')

# 4. Render RequestPermuta component at the end of return
modal_str = '''      <RequestPermuta 
        isOpen={isPermutaModalOpen}
        setIsOpen={setIsPermutaModalOpen}
        user={user}
        initialDate={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
      />
    </div>
  );
}
'''
# Using regex to find the last </div>\n  );\n}
content = re.sub(r'    </div>\s*\);\s*}\s*$', modal_str, content)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)

