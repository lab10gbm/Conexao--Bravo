import React from 'react';
import { MultiSelectFilter } from '../../../components/ui/MultiSelectFilter';
import { sortRanks } from '../../../lib/rankUtils';

interface FuncoesFilterBarProps {
  uniqueRanks: string[];
  filterPostoGrad: string[];
  setFilterPostoGrad: (val: string[]) => void;
  uniqueQuadros: string[];
  filterQuadro: string[];
  setFilterQuadro: (val: string[]) => void;
  uniqueAlas: string[];
  filterAla: string[];
  setFilterAla: (val: string[]) => void;
  uniqueSituacoes: string[];
  filterSituacao: string[];
  setFilterSituacao: (val: string[]) => void;
  uniqueCursos: string[];
  filterCursos: string[];
  setFilterCursos: (val: string[]) => void;
  somenteAtivos: boolean;
  setSomenteAtivos: (val: boolean) => void;
}

export const FuncoesFilterBar: React.FC<FuncoesFilterBarProps> = ({
  uniqueRanks,
  filterPostoGrad,
  setFilterPostoGrad,
  uniqueQuadros,
  filterQuadro,
  setFilterQuadro,
  uniqueAlas,
  filterAla,
  setFilterAla,
  uniqueSituacoes,
  filterSituacao,
  setFilterSituacao,
  uniqueCursos,
  filterCursos,
  setFilterCursos,
  somenteAtivos,
  setSomenteAtivos,
}) => {
  return (
    <div className="mt-4 flex flex-wrap items-start gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
      <div className="text-[10px] font-black uppercase text-slate-400 self-center w-full sm:w-auto">
        Filtros:
      </div>
      <div className="flex-1 min-w-[150px]">
        <MultiSelectFilter label="Posto/Grad" options={uniqueRanks.sort(sortRanks)} selected={filterPostoGrad} onChange={setFilterPostoGrad} />
      </div>
      <div className="flex-1 min-w-[150px]">
        <MultiSelectFilter label="Quadro" options={uniqueQuadros} selected={filterQuadro} onChange={setFilterQuadro} />
      </div>
      <div className="flex-1 min-w-[150px]">
        <MultiSelectFilter label="Ala" options={uniqueAlas} selected={filterAla} onChange={setFilterAla} />
      </div>
      <div className="flex-1 min-w-[150px]">
        <MultiSelectFilter label="Situação" options={uniqueSituacoes} selected={filterSituacao} onChange={setFilterSituacao} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <MultiSelectFilter label="Cursos" options={uniqueCursos} selected={filterCursos} onChange={setFilterCursos} />
      </div>
      <div className="flex items-center gap-2 self-center shrink-0">
        <input
          type="checkbox"
          id="somenteAtivos"
          checked={somenteAtivos}
          onChange={(e) => setSomenteAtivos(e.target.checked)}
          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
        />
        <label htmlFor="somenteAtivos" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
          Exibir Não Ativos
        </label>
      </div>
    </div>
  );
};
