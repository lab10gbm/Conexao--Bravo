export const DEFAULT_ALA_NOMENCLATURES: Record<string, string> = {
  '1': 'ALA Nº 01 - Comandante Moraes Antas',
  '2': 'ALA Nº 02 - Capitão Pinto Junior',
  '3': 'ALA Nº 03 - Tenente Sérgio Luiz de Mattos',
  '4': 'ALA Nº 04 - Comandante Manoel Tenreiro',
  'EXP': 'EXPEDIENTE ADMINISTRATIVO'
};

const STORAGE_KEY = 'cbmerj_ala_nomenclatures';

export function getStoredAlaNomenclatures(): Record<string, string> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_ALA_NOMENCLATURES, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler nomenclaturas das alas:', e);
  }
  return { ...DEFAULT_ALA_NOMENCLATURES };
}

export function saveStoredAlaNomenclatures(data: Record<string, string>): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('cbmerj-ala-names-updated', { detail: data }));
    }
  } catch (e) {
    console.warn('Erro ao salvar nomenclaturas das alas localmente:', e);
  }
}
