import React, { useState, useRef, useEffect } from 'react';
import { normalizeRg, normalizeObm, getUserObmAccess } from '../../../lib/utils';
import { parseRank, sortAllBySeniority, isOfficer, isPraca } from '../../../lib/rankUtils';
import { UserProfile } from '../../../types';

export function isPracaForAla(m: any): boolean {
  if (!m) return false;
  if (m.isOfficer) return false;
  const parsed = parseRank(m.rank || '');
  if (isOfficer(parsed)) return false;
  const quadroUp = (m.quadro || '').trim().toUpperCase();
  if (quadroUp.startsWith('QO')) return false;
  const combinedUp = `${m.rank || ''} ${m.name || ''}`.toUpperCase();
  if (
    /\b(CORONEL|CEL|TENENTE[\s-]*CORONEL|TEN[\s.]*CEL|TC|MAJOR|MAJ|CAPIT[ÃA]O|CAP|1[º°]?\s*TENENTE|2[º°]?\s*TENENTE|1[º°]?\s*TEN|2[º°]?\s*TEN|ASPIRANTE|ASP\s*OF)\b/.test(combinedUp) &&
    !combinedUp.includes('SUBTEN') &&
    !combinedUp.includes('SUB TEN')
  ) {
    return false;
  }
  if (parsed) return isPraca(parsed);
  return true;
}

export interface SearchableMilitarSelectProps {
  value: string;
  onChange: (val: string) => void;
  militars: UserProfile[];
  obmContext: string;
  onMilitarSelected?: (militar: UserProfile) => void;
}

export function SearchableMilitarSelect({ 
  value, 
  onChange, 
  militars, 
  obmContext,
  onMilitarSelected
}: SearchableMilitarSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allowedObms = getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL');
  const filteredMilitars = militars
    .filter(m => isPracaForAla(m) && (!m.obm || allowedObms.includes(normalizeObm(m.obm)) || normalizeObm(obmContext) === 'GLOBAL'))
    .sort(sortAllBySeniority);

  const selectedMilitar = filteredMilitars.find(m => normalizeRg(m.rg) === value);
  const displayValue = open 
    ? search 
    : (selectedMilitar ? `${parseRank(selectedMilitar.rank)} ${selectedMilitar.warName || selectedMilitar.name} (${selectedMilitar.rg})` : '');

  const normalizeString = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchWords = normalizeString(search).split(/\s+/).filter(Boolean);
  
  const searchResults = filteredMilitars.filter(m => {
    const text = normalizeString(`${m.rank} ${parseRank(m.rank)} ${m.name} ${m.warName || ''} ${m.rg}`);
    return searchWords.every(word => text.includes(word));
  });

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        placeholder="Selecione ou busque..."
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch('');
        }}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
          {searchResults.length > 0 ? (
            searchResults.map(m => {
              const val = normalizeRg(m.rg);
              return (
                <div
                  key={val}
                  className="px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 text-slate-700 font-bold transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(val);
                    if (onMilitarSelected) onMilitarSelected(m);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{parseRank(m.rank)} {m.warName || m.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">RG {m.rg}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500 text-center font-medium">Nenhum militar encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}
