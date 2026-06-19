import React, { useState } from 'react';
import { Columns, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface SmartDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  onSearch?: (item: T, searchTerm: string) => boolean;
  onRowClick?: (item: T) => void;
  renderActions?: (item: T) => React.ReactNode;
  actionsLabel?: string;
  emptyMessage?: React.ReactNode;
}

export function SmartDataTable<T>({ 
  data, 
  columns, 
  searchPlaceholder = 'Buscar...', 
  onSearch,
  onRowClick,
  renderActions,
  actionsLabel = 'Ações',
  emptyMessage = 'Nenhum registro encontrado',
  hideColumnsMenu = false
}: SmartDataTableProps<T> & { hideColumnsMenu?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderedColumnIds, setOrderedColumnIds] = useState(columns.map(c => c.id));
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(columns.map(c => c.id));
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredData = React.useMemo(() => {
    if (!searchTerm || !onSearch) return data;
    return data.filter(item => onSearch(item, searchTerm));
  }, [data, searchTerm, onSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // reset page if data changes significantly
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const orderedColumns = React.useMemo(() => {
    return orderedColumnIds.map(id => columns.find(c => c.id === id)!).filter(Boolean);
  }, [orderedColumnIds, columns]);

  const visibleColumns = React.useMemo(() => {
    return orderedColumns.filter(c => visibleColumnIds.includes(c.id));
  }, [orderedColumns, visibleColumnIds]);

  const activeColumns = hideColumnsMenu ? columns : visibleColumns;

  return (
    <div className="flex flex-col h-full w-full gap-4">
      <div className="flex items-center justify-between gap-4">
        {onSearch && (
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        )}

        <div className="relative ml-auto">
          {!hideColumnsMenu && (
            <button 
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <Columns size={16} /> Colunas
            </button>
          )}
          
          {showColumnsMenu && !hideColumnsMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 w-56 flex flex-col gap-2">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1 border-b border-slate-100 pb-1">Colunas Visíveis</div>
              {orderedColumns.map((col, index) => (
                <div 
                  key={col.id} 
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('origIndex', index.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const origIndex = parseInt(e.dataTransfer.getData('origIndex'), 10);
                    if (origIndex !== index) {
                      const newOrder = [...orderedColumnIds];
                      const [dragged] = newOrder.splice(origIndex, 1);
                      newOrder.splice(index, 0, dragged);
                      setOrderedColumnIds(newOrder);
                    }
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-grab hover:bg-slate-50 py-1.5 px-3 border-b border-slate-50 last:border-0"
                >
                  <div className="text-slate-300 w-4 flex flex-col justify-center items-center gap-0.5" title="Arraste para reordenar">
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  </div>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-500 rounded-sm w-3 h-3"
                    checked={visibleColumnIds.includes(col.id)}
                    onChange={(e) => {
                      if (e.target.checked) setVisibleColumnIds([...visibleColumnIds, col.id]);
                      else setVisibleColumnIds(visibleColumnIds.filter(id => id !== col.id));
                    }}
                  />
                  <span className="flex-1">{col.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#1e293b] text-white sticky top-0 z-10 text-[10px] uppercase font-black tracking-widest">
              <tr>
                {activeColumns.map(col => (
                  <th key={col.id} className="p-3 border-b border-white/20 whitespace-nowrap">{col.label}</th>
                ))}
                {renderActions && <th className="p-3 border-b border-white/20 whitespace-nowrap">{actionsLabel}</th>}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {paginatedData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={`transition-colors ${onRowClick ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {activeColumns.map(col => (
                    <React.Fragment key={col.id}>
                      {col.render ? col.render(item) : (
                        <td className="p-3 text-xs text-slate-800">
                          {String((item as any)[col.id] || '-')}
                        </td>
                      )}
                    </React.Fragment>
                  ))}
                  {renderActions && (
                    <td className="p-3 text-xs text-slate-800" onClick={e => e.stopPropagation()}>
                      {renderActions(item)}
                    </td>
                  )}
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={activeColumns.length + (renderActions ? 1 : 0)} className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Details */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Mostrando {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
