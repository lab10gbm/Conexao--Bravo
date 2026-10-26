import { CategoryConfig, SelectableControlFunction } from '../../../components/ControleCategoriasModal';
import { inferDefaultFnIdForSlot } from '../../viaturas/lib/viaturaUtils';
import { checkConditions } from '../../funcoes/lib/funcoesUtils';

export const normalizeFnName = (s: string): string => {
  if (!s) return "";
  return s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim().toUpperCase();
};

export const isVtrType = (vtrName: string, prefix: string): boolean => {
  const name = (vtrName || "").trim().toUpperCase();
  const p = prefix.trim().toUpperCase();
  if (p === 'AR-' || p === 'AR') return (name.startsWith('AR-') || name.startsWith('AR ') || name === 'AR') && !name.startsWith('ARC');
  if (p === 'L-' || p === 'L') return name.startsWith('L-') || name.startsWith('L ') || name === 'L';
  if (p === 'BIA-' || p === 'BIA') return name.startsWith('BIA');
  return name.startsWith(p) || name.includes(p);
};

export const isMaritima = (v: any): boolean => {
  if (v.maritima !== undefined) return Boolean(v.maritima);
  return isVtrType(v.vtr, "L-") || isVtrType(v.vtr, "BIA-");
};

export const getDefaultName = (v: any, slot: string): string => {
  const vtrName = (v.vtr || "").toUpperCase();
  const maritima = isMaritima(v);
  const rawSigla = (v.vtr || "").split(/[-_\s]/)[0]?.trim().toUpperCase() || "";
  const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
  
  if (slot === 'condutor') {
    if (maritima) return vtrName.startsWith('BIA') ? 'MESTRE BIA' : 'MESTRE L';
    if (isVtrType(vtrName, 'AR')) return 'CONDUTOR AR';
    if (isVtrType(vtrName, 'ABSL')) return 'CONDUTOR ABSL';
    if (isVtrType(vtrName, 'ABT')) return 'CONDUTOR ABT';
    if (isVtrType(vtrName, 'ASE')) return 'CONDUTOR ASE';
    if (isVtrType(vtrName, 'ARC')) return 'CONDUTOR ARC';
    return sigla ? `CONDUTOR ${sigla}` : 'CONDUTOR';
  }
  if (slot === 'cg') {
    if (isVtrType(vtrName, 'ABSL')) return 'CHEFE ABSL';
    if (isVtrType(vtrName, 'ABT')) return 'CHEFE ABT';
    if (isVtrType(vtrName, 'ARC')) return 'AUXILIAR/CHEFE ARC';
    return sigla ? `CHEFE ${sigla}` : 'CHEFE';
  }
  // Auxiliares (g1, g2, g3, g4)
  if (maritima) return vtrName.startsWith('BIA') ? 'MARINHEIRO BIA' : 'MARINHEIRO L';
  if (isVtrType(vtrName, 'ABSL')) return 'AUXILIAR ABSL';
  if (isVtrType(vtrName, 'ABT')) return 'AUXILIAR ABT';
  if (isVtrType(vtrName, 'ASE')) return 'AUXILIAR ASE';
  if (isVtrType(vtrName, 'ARC')) return 'AUXILIAR/CHEFE ARC';
  if (isVtrType(vtrName, 'AR')) return 'AUXILIAR AR';
  return sigla ? `AUXILIAR ${sigla}` : 'AUXILIAR';
};

export const getSlotDisplayName = (v: any, slot: string, availableControlFunctions: SelectableControlFunction[] = []): string => {
  if (v.customNames?.[slot]?.trim()) {
    const custom = v.customNames[slot].trim().toUpperCase();
    const sigla = (v.vtr || "").split('-')[0].trim().toUpperCase();
    const genericPrefixes = ['CONDUTOR', 'AUXILIAR', 'CHEFE', 'MARINHEIRO', 'MESTRE', 'OPERADOR'];
    if (genericPrefixes.includes(custom) && sigla) {
      return `${custom} ${sigla}`.trim();
    }
    if (custom === 'CHEFE GUA' && sigla) {
      return `CHEFE ${sigla}`;
    }
    if (custom === 'AUXILIAR / CHEFE ARC') return 'AUXILIAR/CHEFE ARC';
    if (v.customFunctions?.[slot]) {
      return custom;
    }
    const isKnownControlFn = availableControlFunctions.some(
      f => f.scaleName === custom || f.name.trim().toUpperCase() === custom
    );
    if (isKnownControlFn || custom === 'ENFERMEIRO' || custom === 'AUXILIAR/CHEFE ARC' || custom === 'MESTRE L' || custom === 'MESTRE BIA' || custom.endsWith(sigla)) {
      return custom;
    }
    return `${custom} ${sigla}`.trim();
  }
  return getDefaultName(v, slot);
};

export const getMilitarProp = (militar: any, path: string): boolean => {
  if (!militar || !path) return false;
  if (path === "ativoAdministrativo") {
    if (militar.ativoAdministrativo !== undefined) return Boolean(militar.ativoAdministrativo);
    return Boolean(militar.ativoGraduado || militar.ativoCbsSds);
  }
  if (path.startsWith("viaturas.")) {
    const key = path.split(".")[1];
    return Boolean(militar.viaturas?.[key]);
  }
  if (path.startsWith("dynamicFunctions.")) {
    const key = path.split(".")[1];
    return Boolean(militar.dynamicFunctions?.[key]);
  }
  return Boolean(militar[path]);
};

const CONDUTOR_FN_IDS = new Set([
  "viaturas.ABT",
  "viaturas.ABSL",
  "viaturas.ASE",
  "viaturas.AR",
  "viaturas.ARC",
  "ativoEncarregado",
  "ativoAbastecedor",
  "ativoCondutor",
]);

const CHEFE_FN_IDS = new Set(["chefeAbt", "chefeAbsl", "ativoChefeGua"]);

const AUXILIAR_FN_IDS = new Set(["auxAbt", "auxAbsl", "auxArc", "auxAse", "disponivelAux", "ativoAuxiliar"]);

const MARITIMO_FN_IDS = new Set(["mestreAl", "mestreBia", "opAma", "gvAma", "marinheiros", "ativoMaritimo"]);

const GRADUADO_ADMIN_FN_IDS = new Set(["adjunto", "sgtDia", "cmtGuarda", "disponivel1", "disponivel2"]);

const CB_SD_ADMIN_FN_IDS = new Set([
  "cbGuarda",
  "cbDia",
  "sentinela",
  "auxRancho",
  "toqueDeFogo",
  "deposito",
  "faxina",
  "disponivelCbsSds",
]);

/**
 * Verifica se uma função (`fnId`) está efetivamente habilitada para o militar,
 * respeitando a chave mestre (`activeProperty`) da categoria correspondente e
 * eventuais condições de posto/CNH configuradas no Controle de Funções.
 */
export const isFunctionEnabledForMilitar = (
  militar: any,
  fnId: string,
  categories: CategoryConfig[] = []
): boolean => {
  if (!militar || !fnId) return false;

  if (fnId.startsWith("viaturas.") || CONDUTOR_FN_IDS.has(fnId)) {
    if (!militar.ativoCondutor) return false;
  } else if (CHEFE_FN_IDS.has(fnId)) {
    if (!militar.ativoChefeGua) return false;
  } else if (AUXILIAR_FN_IDS.has(fnId)) {
    if (!militar.ativoAuxiliar) return false;
  } else if (MARITIMO_FN_IDS.has(fnId)) {
    if (!militar.ativoMaritimo) return false;
  } else if (fnId === "ativoEnfermeiro") {
    if (!militar.ativoEnfermeiro) return false;
  } else if (fnId === "ativoComunicante") {
    if (!militar.ativoComunicante) return false;
  } else if (GRADUADO_ADMIN_FN_IDS.has(fnId)) {
    if (militar.ativoAdministrativo === false) return false;
    const isGradActive =
      militar.ativoGraduado !== undefined
        ? Boolean(militar.ativoGraduado)
        : Boolean(militar.ativoAdministrativo);
    if (!isGradActive) return false;
  } else if (CB_SD_ADMIN_FN_IDS.has(fnId)) {
    if (militar.ativoAdministrativo === false) return false;
    const isCbsActive =
      militar.ativoCbsSds !== undefined
        ? Boolean(militar.ativoCbsSds)
        : Boolean(militar.ativoAdministrativo);
    if (!isCbsActive) return false;
  }

  for (const cat of categories) {
    if (!cat || cat.id === "mostruario") continue;
    const fnCfg = (cat.functions || []).find((f) => f.id === fnId);
    if (fnCfg) {
      if (cat.activeProperty && !getMilitarProp(militar, cat.activeProperty)) {
        return false;
      }
      if (fnCfg.conditions && fnCfg.conditions.length > 0) {
        if (!checkConditions(militar, fnCfg.conditions).valid) {
          return false;
        }
      }
      break;
    }
  }

  return getMilitarProp(militar, fnId);
};

export const getMostruario = (militar: any, availableControlFunctions: SelectableControlFunction[] = []): string => {
  const funcs: string[] = [];
  
  if (militar.ativoCondutor) {
    if (militar.ativoEncarregado) funcs.push("ENC MOTORISTA");
    if (militar.ativoAbastecedor) funcs.push("ABASTECEDOR");
    if (militar.viaturas?.ABT) funcs.push("COND ABT");
    if (militar.viaturas?.ABSL) funcs.push("COND ABSL");
    if (militar.viaturas?.AR) funcs.push("COND AR");
    if (militar.viaturas?.ASE) funcs.push("COND ASE");
    if (militar.viaturas?.ARC) funcs.push("COND ARC");
  }
  
  if (militar.ativoChefeGua) {
    if (militar.chefeAbsl) funcs.push("CHEFE ABSL");
    if (militar.chefeAbt) funcs.push("CHEFE ABT");
  }
  
  if (militar.ativoAuxiliar) {
    if (militar.auxAbt) funcs.push("AUX ABT");
    if (militar.auxAbsl) funcs.push("AUX ABSL");
    if (militar.auxArc) funcs.push("AUX ARC");
    if (militar.auxAse) funcs.push("AUX ASE");
  }
  
  if (militar.ativoEnfermeiro) {
    funcs.push("ENFERMEIRO");
  }
  
  if (militar.ativoMaritimo) {
    if (militar.mestreAl) funcs.push("MESTRE L");
    if (militar.mestreBia) funcs.push("MESTRE BIA");
    if (militar.marinheiros) {
      funcs.push("MARINHEIRO L");
      funcs.push("MARINHEIRO BIA");
    }
    if (militar.opAma) funcs.push("OP AMA");
    if (militar.gvAma) funcs.push("GV AMA");
  }
  
  const isGradActive =
    militar.ativoAdministrativo !== false &&
    (militar.ativoGraduado !== undefined ? Boolean(militar.ativoGraduado) : Boolean(militar.ativoAdministrativo));
  if (isGradActive) {
    if (militar.adjunto) funcs.push("ADJUNTO");
    if (militar.sgtDia) funcs.push("SGT DIA");
    if (militar.cmtGuarda) funcs.push("CMT GUARDA");
    if (militar.disponivel1) funcs.push("DISP 1");
    if (militar.disponivel2) funcs.push("DISP 2");
  }
  
  const isCbsActive =
    militar.ativoAdministrativo !== false &&
    (militar.ativoCbsSds !== undefined ? Boolean(militar.ativoCbsSds) : Boolean(militar.ativoAdministrativo));
  if (isCbsActive) {
    if (militar.cbGuarda) funcs.push("CB GUARDA");
    if (militar.cbDia) funcs.push("CB DIA");
    if (militar.sentinela) funcs.push("SENTINELA");
    if (militar.auxRancho) funcs.push("AUX RANCHO");
    if (militar.toqueDeFogo) funcs.push("T. FOGO");
    if (militar.deposito) funcs.push("DEPOSITO");
    if (militar.faxina) funcs.push("FAXINA");
    if (militar.disponivelCbsSds) funcs.push("DISP");
  }
  
  if (militar.ativoComunicante) {
    funcs.push("COMUNICANTE");
  }

  availableControlFunctions.forEach(fn => {
    if (fn.id.startsWith("dynamicFunctions.") && getMilitarProp(militar, fn.id)) {
      if (!funcs.includes(fn.scaleName)) {
        funcs.push(fn.scaleName);
      }
    }
  });

  return funcs.join(", ") || "NÃO CONFIGURADO";
};

export const getRawAllowedOptions = (
  militar: any,
  categories: CategoryConfig[] = [],
  availableControlFunctions: SelectableControlFunction[] = [],
  viaturasInfo: any[] = []
): string[] => {
  if (!militar) return [];
  const allowed = new Set<string>();
  
  if (militar.ativoCondutor) {
    if (militar.ativoEncarregado) allowed.add('ENCARREGADO DE MOTORISTA');
    if (militar.ativoAbastecedor) allowed.add('ABASTECEDOR');
    
    if (militar.viaturas?.AR) allowed.add('CONDUTOR AR');
    if (militar.viaturas?.ABSL) allowed.add('CONDUTOR ABSL');
    if (militar.viaturas?.ABT) allowed.add('CONDUTOR ABT');
    if (militar.viaturas?.ASE) allowed.add('CONDUTOR ASE');
    if (militar.viaturas?.ARC) allowed.add('CONDUTOR ARC');
  }
  
  if (militar.ativoChefeGua) {
    if (militar.chefeAbsl) allowed.add('CHEFE ABSL');
    if (militar.chefeAbt) allowed.add('CHEFE ABT');
  }
  
  if (militar.ativoAuxiliar) {
    if (militar.auxAbt) allowed.add('AUXILIAR ABT');
    if (militar.auxAbsl) allowed.add('AUXILIAR ABSL');
    if (militar.auxArc) allowed.add('AUXILIAR/CHEFE ARC');
    if (militar.auxAse) allowed.add('AUXILIAR ASE');
  }
  
  if (militar.ativoEnfermeiro) {
    allowed.add('ENFERMEIRO');
    allowed.add('AUXILIAR ASE');
  }
  
  if (militar.ativoMaritimo) {
    if (militar.mestreAl) allowed.add('MESTRE L');
    if (militar.mestreBia) allowed.add('MESTRE BIA');
    if (militar.marinheiros) {
      allowed.add('MARINHEIRO L');
      allowed.add('MARINHEIRO BIA');
      allowed.add('MARINHEIRO');
    }
    if (militar.opAma) allowed.add('OPERADOR AMA');
    if (militar.gvAma) allowed.add('GV AMA');
  }
  
  const isGradActive =
    militar.ativoAdministrativo !== false &&
    (militar.ativoGraduado !== undefined ? Boolean(militar.ativoGraduado) : Boolean(militar.ativoAdministrativo));
  if (isGradActive) {
    if (militar.adjunto) allowed.add('ADJUNTO');
    if (militar.sgtDia) allowed.add('SGT DIA');
    if (militar.cmtGuarda) allowed.add('CMT GUARDA');
    if (militar.disponivel1) allowed.add('DISPONIVEL 1');
    if (militar.disponivel2) allowed.add('DISPONIVEL 2');
  }
  
  const isCbsActive =
    militar.ativoAdministrativo !== false &&
    (militar.ativoCbsSds !== undefined ? Boolean(militar.ativoCbsSds) : Boolean(militar.ativoAdministrativo));
  if (isCbsActive) {
    if (militar.cbGuarda) allowed.add('CB GUARDA');
    if (militar.cbDia) allowed.add('CB DIA');
    if (militar.sentinela) allowed.add('SENTINELA');
    if (militar.auxRancho) allowed.add('AUXILIAR RANCHO');
    if (militar.toqueDeFogo) allowed.add('TOQUE DE FOGO');
    if (militar.deposito) allowed.add('DIA AO DEPOSITO');
    if (militar.faxina) {
      allowed.add('ENC. FAXINA');
      allowed.add('RESP FAXINA');
    }
    if (militar.disponivelCbsSds) allowed.add('DISPONIVEL CBS/SDS');
  }
  
  if (militar.ativoComunicante) {
    allowed.add('COMUNICANTE');
  }
  
  if (militar.isEscalante) {
    allowed.add('ESCALANTE');
  }

  // Adiciona funções habilitadas no Controle de Função usando exclusivamente o scaleName canônico
  categories.forEach(cat => {
    if (cat.id === 'mostruario') return;
    const isCatActive = cat.activeProperty ? getMilitarProp(militar, cat.activeProperty) : true;
    if (isCatActive) {
      (cat.functions || []).forEach(fn => {
        if (isFunctionEnabledForMilitar(militar, fn.id, categories)) {
          const mapped = availableControlFunctions.find(af => af.id === fn.id);
          const sName = mapped ? mapped.scaleName : fn.name.trim().toUpperCase();
          if (sName === 'MARINHEIRO') {
            allowed.add('MARINHEIRO L');
            allowed.add('MARINHEIRO BIA');
          }
          if (
            sName !== 'CONDUTOR' &&
            sName !== 'CHEFE GUA' &&
            sName !== 'CHEFE' &&
            sName !== 'AUXILIAR GUA' &&
            sName !== 'AUX GUA' &&
            sName !== 'AUXILIAR'
          ) {
            allowed.add(sName);
          }
        }
      });
    }
  });

  // Mapeia as viaturas cadastradas e seus slots de função configurados (respeitando a categoria ativa!)
  viaturasInfo.forEach(v => {
    if (v.ativa === false) return;
    (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
       if (v.blocked?.includes(slot)) return;
       if (v[slot] !== true) return;
       const slotDisplayName = getSlotDisplayName(v, slot, availableControlFunctions);
       const slotGroup = slot === 'condutor' ? 'condutor' : slot === 'cg' ? 'chefe' : 'auxiliar';
       const explicitFnId = v.customFunctions?.[slot];

       if (explicitFnId) {
          if (isFunctionEnabledForMilitar(militar, explicitFnId, categories)) {
             allowed.add(slotDisplayName);
          }
       } else if (v.customNames?.[slot]?.trim()) {
          const customUpper = v.customNames[slot].trim().toUpperCase();
          const matchedFn = availableControlFunctions.find(
            f => f.scaleName === customUpper || f.name.trim().toUpperCase() === customUpper
          );
          if (matchedFn && isFunctionEnabledForMilitar(militar, matchedFn.id, categories)) {
             allowed.add(slotDisplayName);
          } else {
             const defaultFnId = inferDefaultFnIdForSlot(v, slotGroup);
             if (defaultFnId && isFunctionEnabledForMilitar(militar, defaultFnId, categories)) {
                allowed.add(slotDisplayName);
             }
          }
       } else {
          const defaultFnId = inferDefaultFnIdForSlot(v, slotGroup);
          if (defaultFnId && isFunctionEnabledForMilitar(militar, defaultFnId, categories)) {
             allowed.add(slotDisplayName);
          }
       }
    });
  });

  // Remove qualquer resquício de opções genéricas
  allowed.delete('CONDUTOR');
  allowed.delete('CHEFE GUA');
  allowed.delete('CHEFE');
  allowed.delete('AUXILIAR GUA');
  allowed.delete('AUX GUA');
  allowed.delete('AUXILIAR');

  return Array.from(allowed);
};
