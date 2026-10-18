export type {
  SwapRequest,
  WeeklyDayChange,
  WeeklyChangeRequest,
  Afastamento,
  PermutaDayDetails,
  DayStatusResult,
  ExpedienteData,
  MilitaryMoveModalData,
  QuickAddModalData
} from '../features/expediente/types';

export {
  FUNCOES_ESCALA,
  COMPETENCY_MAP,
  WORK_REGIMES,
  parseRankAndNameFromString,
  splitMilitaryRankAndWarName,
  formatPreferenceFunction
} from '../features/expediente/lib/expedienteCalculos';

export {
  ExpedienteScheduler,
  type ExpedienteSchedulerProps
} from '../features/expediente/ExpedienteScheduler';

import { ExpedienteScheduler } from '../features/expediente/ExpedienteScheduler';
export default ExpedienteScheduler;
