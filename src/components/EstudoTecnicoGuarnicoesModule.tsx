import React, { useState, useEffect, useMemo } from "react";
import { useMilitars } from "../contexts/MilitarContext";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  ArrowLeft, Activity, TrendingDown, Users, Shield, ShieldAlert,
  Truck, Anchor, Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, getAlaColor, getAlaName, normalizeObm, normalizeAlaField } from '../lib/utils';
import { motion } from "framer-motion";

const DEFAULT_VIATURAS: any[] = [
  { id: "ABT-183", vtr: "ABT-183", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-404", vtr: "ASE-404", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "AR-583", vtr: "AR-583", ativa: true, exibir: true, maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: true, exibir: true, maritima: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
];

export function EstudoTecnicoGuarnicoesModule({ obmContext }: { obmContext: string }) {
  const navigate = useNavigate();
  const { militars, loading: militarsLoading } = useMilitars();

  const [viaturasInfo, setViaturasInfo] = useState<any[]>(DEFAULT_VIATURAS);
  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({});
  const [roleQtds, setRoleQtds] = useState<Record<string, number>>({});
  const [afastamentos, setAfastamentos] = useState<any[]>([]);
  const [selectedDetailedMonth, setSelectedDetailedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') {
        setLoading(false);
        return;
    }
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "obm_settings", obmContext);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.escala_regras) {
            setCorrelation(data.escala_regras.correlation || {});
            setRoleQtds(data.escala_regras.qtds || {});
          }
          if (data.viaturasInfo) {
             setViaturasInfo(data.viaturasInfo);
          } else if (data.viaturas_config) {
             setViaturasInfo(data.viaturas_config);
          }
        }
      } catch (e) {
        console.error("Error loading obm settings", e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [obmContext]);

  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') return;
    const q = query(collection(db, 'afastamentos_alas'), where('obm', '==', normalizeObm(obmContext)));
    const unsub = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach(doc => {
         data.push({ id: doc.id, ...doc.data() });
      });
      setAfastamentos(data);
    }, (err) => {
      console.error("Error fetching afastamentos:", err);
    });
    return () => unsub();
  }, [obmContext]);

  // --- Logic helpers copied from EscalaEspelhoModule ---
  const isMaritima = (v: any) => v.maritima === true;
  const getDefaultName = (v: any, slot: string) => {
    const isMar = isMaritima(v);
    const prefix = v.vtr ? v.vtr.split('-')[0].trim().toUpperCase() : '';

    if (slot === 'condutor') {
       if (isMar) return 'CONDUTOR MARITIMO';
       if (prefix === 'ABT') return 'CONDUTOR ABT';
       if (prefix === 'ABSL') return 'CONDUTOR ABSL';
       if (prefix === 'AR') return 'CONDUTOR AR';
       if (prefix === 'ASE') return 'CONDUTOR ASE';
       if (prefix === 'ARC') return 'CONDUTOR ARC';
       return 'CONDUTOR';
    }
    if (slot === 'cg') {
       if (isMar) return 'CHEFE GUA MARITIMA';
       if (prefix === 'ABT') return 'CHEFE ABT';
       if (prefix === 'ABSL') return 'CHEFE ABSL';
       if (prefix === 'ARC') return 'AUXILIAR/CHEFE ARC';
       return 'CHEFE GUA';
    }
    
    return isMar ? 'AUXILIAR MARITIMO' : 'AUXILIAR GUA';
  };
  const getSlotDisplayName = (v: any, slot: string) => {
    if (v.vtr) {
      const vtrPrefix = v.vtr.split('-')[0].trim().toUpperCase();
      if (slot === 'condutor') return 'CONDUTOR ' + vtrPrefix;
      if (slot === 'cg') return 'CHEFE ' + vtrPrefix;
      return 'AUXILIAR ' + vtrPrefix;
    }
    return getDefaultName(v, slot);
  };
  const getAllowedOptions = (militar: any) => {
    if (!militar) return undefined;
    const allowed = new Set<string>();
    
    if (militar.ativoCondutor) {
      allowed.add('CONDUTOR');
      if (militar.ativoEncarregado) allowed.add('ENCARREGADO DE MOTORISTA');
      if (militar.ativoAbastecedor) allowed.add('ABASTECEDOR');
      if (militar.viaturas?.AR) allowed.add('CONDUTOR AR');
      if (militar.viaturas?.ABSL) allowed.add('CONDUTOR ABSL');
      if (militar.viaturas?.ABT) allowed.add('CONDUTOR ABT');
      if (militar.viaturas?.ASE) allowed.add('CONDUTOR ASE');
      if (militar.viaturas?.ARC) allowed.add('CONDUTOR ARC');
    }
    
    if (militar.ativoChefeGua) {
      allowed.add('CHEFE GUA');
      if (militar.chefeAbsl) allowed.add('CHEFE ABSL');
      if (militar.chefeAbt) allowed.add('CHEFE ABT');
      allowed.add('AUXILIAR/CHEFE ARC');
    }
    
    if (militar.ativoAuxiliar) {
      allowed.add('AUXILIAR GUA');
      if (militar.auxAbt) allowed.add('AUXILIAR ABT');
      if (militar.auxAbsl) allowed.add('AUXILIAR ABSL');
      if (militar.auxArc) allowed.add('AUXILIAR/CHEFE ARC');
      if (militar.auxAse) allowed.add('AUXILIAR ASE');
    }
    
    if (militar.ativoEnfermeiro) {
      allowed.add('ENFERMEIRO');
    }
    
    if (militar.ativoMaritimo) {
      if (militar.mestreAl) allowed.add('MESTRE L');
      if (militar.mestreBia) allowed.add('MESTRE BIA');
      if (militar.marinheiros) {
        allowed.add('MARINHEIRO L');
        allowed.add('MARINHEIRO BIA');
      }
      if (militar.opAma) allowed.add('OPERADOR AMA');
      if (militar.gvAma) allowed.add('GV AMA');
    }
    
    if (militar.ativoGraduado) {
      if (militar.adjunto) allowed.add('ADJUNTO');
      if (militar.sgtDia) allowed.add('SGT DIA');
      if (militar.cmtGuarda) allowed.add('CMT GUARDA');
      if (militar.disponivel1) allowed.add('DISPONIVEL 1');
      if (militar.disponivel2) allowed.add('DISPONIVEL 2');
    }
    
    if (militar.ativoCbsSds) {
      if (militar.cbGuarda) allowed.add('CB GUARDA');
      if (militar.cbDia) allowed.add('CB DIA');
      if (militar.sentinela) allowed.add('SENTINELA');
      if (militar.auxRancho) allowed.add('AUXILIAR RANCHO');
      if (militar.toqueDeFogo) allowed.add('TOQUE DE FOGO');
      if (militar.deposito) allowed.add('DIA AO DEPOSITO');
      if (militar.faxina) allowed.add('RESP FAXINA');
      if (militar.disponivelCbsSds) allowed.add('DISPONIVEL CBS/SDS');
    }
    
    if (militar.ativoComunicante) {
      allowed.add('COMUNICANTE');
    }
    
    if (militar.isEscalante) {
      allowed.add('ESCALANTE');
    }
    
    return Array.from(allowed);
  };

  const dynamicRequirements = useMemo(() => {
    let reqs: {name: string, genericName: string, req: number, category: string}[] = [
      { name: "ADJUNTO", genericName: "ADJUNTO", req: roleQtds["ADJUNTO"] ?? 1, category: 'admin' },
      { name: "ENCARREGADO DE MOTORISTA", genericName: "ENCARREGADO DE MOTORISTA", req: roleQtds["ENCARREGADO DE MOTORISTA"] ?? 1, category: 'admin' },
    ];
    
    const vtrReqs: Record<string, {req: number, category: string, genericName: string}> = {};
    viaturasInfo.forEach(v => {
      if (!v.ativa) return;
      ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
        if (v[slot as keyof typeof v] === true) {
          const roleName = getSlotDisplayName(v, slot);
          let cat = 'auxiliar';
          const isMar = isMaritima(v);
          if (slot === 'condutor') cat = isMar ? 'condutor_maritimo' : 'condutor';
          else if (slot === 'cg') cat = isMar ? 'chefe_maritimo' : 'chefe';
          else cat = isMar ? 'auxiliar_maritimo' : 'auxiliar';
          
          const genericName = getDefaultName(v, slot);
          if (!vtrReqs[roleName]) {
             vtrReqs[roleName] = { req: 0, category: cat, genericName };
          }
          vtrReqs[roleName].req += 1;
        }
      });
    });
    Object.entries(vtrReqs).forEach(([name, data]) => {
      reqs.push({ name, genericName: data.genericName, req: data.req, category: data.category });
    });

    reqs.push({ name: "ENFERMEIRO", genericName: "ENFERMEIRO", req: roleQtds["ENFERMEIRO"] ?? 1, category: 'admin' });
    reqs.push({ name: "AUXILIAR RANCHO", genericName: "AUXILIAR RANCHO", req: roleQtds["AUXILIAR RANCHO"] ?? 1, category: 'admin' });
    reqs.push({ name: "TOQUE DE FOGO", genericName: "TOQUE DE FOGO", req: roleQtds["TOQUE DE FOGO"] ?? 1, category: 'admin' });
    reqs.push({ name: "DIA AO DEPOSITO", genericName: "DIA AO DEPOSITO", req: roleQtds["DIA AO DEPOSITO"] ?? 2, category: 'admin' });
    reqs.push({ name: "RESP FAXINA", genericName: "RESP FAXINA", req: roleQtds["RESP FAXINA"] ?? 1, category: 'admin' });
    reqs.push({ name: "ABASTECEDOR", genericName: "ABASTECEDOR", req: roleQtds["ABASTECEDOR"] ?? 1, category: 'admin' });
    reqs.push({ name: "SGT DIA", genericName: "SGT DIA", req: roleQtds["SGT DIA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CMT GUARDA", genericName: "CMT GUARDA", req: roleQtds["CMT GUARDA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CB GUARDA", genericName: "CB GUARDA", req: roleQtds["CB GUARDA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CB DIA", genericName: "CB DIA", req: roleQtds["CB DIA"] ?? 1, category: 'admin' });
    reqs.push({ name: "COMUNICANTE", genericName: "COMUNICANTE", req: roleQtds["COMUNICANTE"] ?? 2, category: 'admin' });
    reqs.push({ name: "ESCALANTE", genericName: "ESCALANTE", req: roleQtds["ESCALANTE"] ?? 1, category: 'admin' });
    reqs.push({ name: "SENTINELA", genericName: "SENTINELA", req: roleQtds["SENTINELA"] ?? 4, category: 'admin' });
    
    return reqs;
  }, [viaturasInfo, roleQtds]);

  // Compute for each Ala
  const alasStats = useMemo(() => {
    if (!militars || militars.length === 0) return [];
    
    const activeObmMilitars = militars.filter(m => {
      const rawObm = m.obm ? m.obm.trim().toUpperCase() : '10º GBM';
      const ctx = (obmContext || '').trim().toUpperCase();
      const inObm = ctx === 'GLOBAL' ? true : (rawObm === ctx || normalizeObm(m.obm) === normalizeObm(obmContext));
      const isActive = !m.situacao || m.situacao.trim().toUpperCase() === 'ATIVO';
      
      return inObm && isActive;
    });
    
    const alas = ['1', '2', '3', '4'];
    
    return alas.map(alaName => {
       const roster = activeObmMilitars.filter(m => normalizeAlaField(m.ala) === alaName);
       
       const allSlots: {name: string, genericName: string, category: string}[] = [];
       dynamicRequirements.forEach(req => {
         for (let i = 0; i < req.req; i++) {
           allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
         }
       });

       const militarCapabilities = roster.map(m => ({
         rg: m.rg || '',
         rank: m.rank || '',
         allowed: getAllowedOptions(m) || [],
         assignedRoles: [] as string[]
       }));

       let unfulfilledCondutores = 0;
       let unfulfilledCondutoresMaritimos = 0;
       let unfulfilledChefes = 0;
       let unfulfilledChefesMaritimos = 0;
       let unfulfilledAuxiliares = 0;
       let unfulfilledAuxiliaresMaritimos = 0;
       let unfulfilledAdmin = 0;
       let unfulfilledEfetivo = 0;
       
       let reqCondutores = 0;
       let reqCondutoresMaritimos = 0;
       let reqChefes = 0;
       let reqChefesMaritimos = 0;
       let reqAuxiliares = 0;
       let reqAuxiliaresMaritimos = 0;
       let reqAdmin = 0;
       const reqEfetivo = allSlots.length;

       const slotOptionsCount = allSlots.map(slot => {
         const count = militarCapabilities.filter(m => m.allowed.includes(slot.genericName)).length;
         return { slot, count };
       });

       slotOptionsCount.sort((a, b) => {
         const aIsAdmin = a.slot.category === 'admin';
         const bIsAdmin = b.slot.category === 'admin';
         if (aIsAdmin && !bIsAdmin) return 1;
         if (!aIsAdmin && bIsAdmin) return -1;
         return a.count - b.count;
       });

       const unfulfilledSlots: {name: string, category: string}[] = [];
       slotOptionsCount.forEach(({ slot }) => {
          if (slot.category === 'admin') reqAdmin++;
          else if (slot.category === 'condutor') reqCondutores++;
          else if (slot.category === 'condutor_maritimo') reqCondutoresMaritimos++;
          else if (slot.category === 'chefe') reqChefes++;
          else if (slot.category === 'chefe_maritimo') reqChefesMaritimos++;
          else if (slot.category === 'auxiliar') reqAuxiliares++;
          else if (slot.category === 'auxiliar_maritimo') reqAuxiliaresMaritimos++;

          const available = militarCapabilities.filter(m => {
             if (!m.allowed.includes(slot.genericName)) return false;
             if (m.assignedRoles.includes(slot.genericName)) return false;
             for (const role of m.assignedRoles) {
                const isSentinelaAux = (
                   (slot.genericName === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(role)) ||
                   (role === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(slot.genericName))
                );
                if (isSentinelaAux) {
                   if (slot.genericName === 'AUXILIAR/CHEFE ARC' || role === 'AUXILIAR/CHEFE ARC') {
                      if (m.rank === 'Soldado') continue;
                   } else {
                      continue;
                   }
                }
                const val1 = correlation[slot.genericName]?.[role] ?? 0;
                const val2 = correlation[role]?.[slot.genericName] ?? 0;
                if (val1 === 0 || val2 === 0) return false;
             }
             return true;
          });

          if (available.length > 0) {
             available.sort((a, b) => {
                 if (a.allowed.length !== b.allowed.length) return a.allowed.length - b.allowed.length;
                 return a.assignedRoles.length - b.assignedRoles.length;
             });
             available[0].assignedRoles.push(slot.genericName);
          } else {
             unfulfilledSlots.push(slot);
          }
       });

       unfulfilledSlots.forEach(slot => {
          unfulfilledEfetivo++;
          if (slot.category === 'admin') unfulfilledAdmin++;
          else if (slot.category === 'condutor') unfulfilledCondutores++;
          else if (slot.category === 'condutor_maritimo') unfulfilledCondutoresMaritimos++;
          else if (slot.category === 'chefe') unfulfilledChefes++;
          else if (slot.category === 'chefe_maritimo') unfulfilledChefesMaritimos++;
          else if (slot.category === 'auxiliar') unfulfilledAuxiliares++;
          else if (slot.category === 'auxiliar_maritimo') unfulfilledAuxiliaresMaritimos++;
       });

       const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;
       
       let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
       let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

       return {
         ala: alaName,
         rosterCount: roster.length,
         stats: {
             efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
             efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
             efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },
             condutores: { req: reqCondutores, deficit: unfulfilledCondutores, chance: calcChance(unfulfilledCondutores, reqCondutores) },
             condutores_maritimos: { req: reqCondutoresMaritimos, deficit: unfulfilledCondutoresMaritimos, chance: calcChance(unfulfilledCondutoresMaritimos, reqCondutoresMaritimos) },
             chefes: { req: reqChefes, deficit: unfulfilledChefes, chance: calcChance(unfulfilledChefes, reqChefes) },
             chefes_maritimos: { req: reqChefesMaritimos, deficit: unfulfilledChefesMaritimos, chance: calcChance(unfulfilledChefesMaritimos, reqChefesMaritimos) },
             auxiliares: { req: reqAuxiliares, deficit: unfulfilledAuxiliares, chance: calcChance(unfulfilledAuxiliares, reqAuxiliares) },
             auxiliares_maritimos: { req: reqAuxiliaresMaritimos, deficit: unfulfilledAuxiliaresMaritimos, chance: calcChance(unfulfilledAuxiliaresMaritimos, reqAuxiliaresMaritimos) },
             admin: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) }
         }
       };
    });
  }, [militars, obmContext, dynamicRequirements, correlation]);

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i <= 11; i++) {
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1).replace('.', '') });
      d.setMonth(d.getMonth() + 1);
    }
    return opts;
  }, []);

  const detailedMonthStats = useMemo(() => {
    if (!militars || militars.length === 0) return null;
    
    const [selYear, selMonth] = selectedDetailedMonth.split('-');
    const startOfMonth = `${selectedDetailedMonth}-01`;
    const endOfMonth = `${selectedDetailedMonth}-${new Date(parseInt(selYear), parseInt(selMonth), 0).getDate().toString().padStart(2, '0')}`;
    
    const monthOpt = monthOptions.find(o => o.value === selectedDetailedMonth) || monthOptions[0];

    const alas = ['1', '2', '3', '4'];
    const alasResult = alas.map(alaName => {
       const allObmMilitarsInAla = militars.filter(m => {
          const rawObm = m.obm ? m.obm.trim().toUpperCase() : '10º GBM';
          const ctx = (obmContext || '').trim().toUpperCase();
          const inObm = ctx === 'GLOBAL' ? true : (rawObm === ctx || normalizeObm(m.obm) === normalizeObm(obmContext));
          const isActive = !m.situacao || m.situacao.trim().toUpperCase() === 'ATIVO';
          return inObm && isActive && normalizeAlaField(m.ala) === alaName;
       });

       const afastadosList: any[] = [];
       const disponiveisList: any[] = [];

       allObmMilitarsInAla.forEach(m => {
          const rgString = m.rg ? String(m.rg).replace(/^0+/, '').replace(/\D/g, '') : '';
          const hasAfastamento = afastamentos.find(af => {
              if (!af.inicio || !af.retorno) return false;
              const afRg = String(af.rg).replace(/^0+/, '').replace(/\D/g, '');
              if (afRg !== rgString) return false;
              return af.inicio <= endOfMonth && af.retorno >= startOfMonth;
          });

          if (hasAfastamento) {
              afastadosList.push({ ...m, afastamentoInfo: hasAfastamento });
          } else {
              disponiveisList.push(m);
          }
       });

       const allSlots: {name: string, genericName: string, category: string}[] = [];
       dynamicRequirements.forEach(req => {
         for (let i = 0; i < req.req; i++) {
           allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
         }
       });

       const militarCapabilities = disponiveisList.map(m => ({
         rg: m.rg || '',
         rank: m.rank || '',
         allowed: getAllowedOptions(m) || [],
         assignedRoles: [] as string[]
       }));

       let unfulfilledEfetivo = 0;
       let unfulfilledOperacional = 0;
       let unfulfilledAdmin = 0;
       let unfulfilledCondutores = 0;
       let unfulfilledCondutoresMaritimos = 0;
       let unfulfilledChefes = 0;
       let unfulfilledChefesMaritimos = 0;
       let unfulfilledAuxiliares = 0;
       let unfulfilledAuxiliaresMaritimos = 0;

       let reqEfetivo = allSlots.length;
       let reqOperacional = 0;
       let reqAdmin = 0;
       let reqCondutores = 0;
       let reqCondutoresMaritimos = 0;
       let reqChefes = 0;
       let reqChefesMaritimos = 0;
       let reqAuxiliares = 0;
       let reqAuxiliaresMaritimos = 0;

       const slotOptionsCount = allSlots.map(slot => {
         const count = militarCapabilities.filter(m => m.allowed.includes(slot.genericName)).length;
         return { slot, count };
       });

       slotOptionsCount.sort((a, b) => {
         const aIsAdmin = a.slot.category === 'admin';
         const bIsAdmin = b.slot.category === 'admin';
         if (aIsAdmin && !bIsAdmin) return 1;
         if (!aIsAdmin && bIsAdmin) return -1;
         return a.count - b.count;
       });

       slotOptionsCount.forEach(({ slot }) => {
          if (slot.category === 'admin') reqAdmin++;
          else {
             reqOperacional++;
             if (slot.category === 'condutor') reqCondutores++;
             else if (slot.category === 'condutor_maritimo') reqCondutoresMaritimos++;
             else if (slot.category === 'chefe') reqChefes++;
             else if (slot.category === 'chefe_maritimo') reqChefesMaritimos++;
             else if (slot.category === 'auxiliar') reqAuxiliares++;
             else if (slot.category === 'auxiliar_maritimo') reqAuxiliaresMaritimos++;
          }

          const available = militarCapabilities.filter(m => {
             if (!m.allowed.includes(slot.genericName)) return false;
             if (m.assignedRoles.includes(slot.genericName)) return false;
             for (const role of m.assignedRoles) {
                const isSentinelaAux = (
                   (slot.genericName === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(role)) ||
                   (role === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(slot.genericName))
                );
                if (isSentinelaAux) {
                   if (slot.genericName === 'AUXILIAR/CHEFE ARC' || role === 'AUXILIAR/CHEFE ARC') {
                      if (m.rank === 'Soldado') continue;
                   } else {
                      continue;
                   }
                }
                const val1 = correlation[slot.genericName]?.[role] ?? 0;
                const val2 = correlation[role]?.[slot.genericName] ?? 0;
                if (val1 === 0 || val2 === 0) return false;
             }
             return true;
          });

          if (available.length > 0) {
             available.sort((a, b) => {
                 if (a.allowed.length !== b.allowed.length) return a.allowed.length - b.allowed.length;
                 return a.assignedRoles.length - b.assignedRoles.length;
             });
             available[0].assignedRoles.push(slot.genericName);
          } else {
             unfulfilledEfetivo++;
             if (slot.category === 'admin') unfulfilledAdmin++;
             else {
                unfulfilledOperacional++;
                if (slot.category === 'condutor') unfulfilledCondutores++;
                else if (slot.category === 'condutor_maritimo') unfulfilledCondutoresMaritimos++;
                else if (slot.category === 'chefe') unfulfilledChefes++;
                else if (slot.category === 'chefe_maritimo') unfulfilledChefesMaritimos++;
                else if (slot.category === 'auxiliar') unfulfilledAuxiliares++;
                else if (slot.category === 'auxiliar_maritimo') unfulfilledAuxiliaresMaritimos++;
             }
          }
       });

       const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;
       
       return {
         ala: alaName,
         rosterCount: allObmMilitarsInAla.length,
         disponiveisCount: disponiveisList.length,
         afastadosCount: afastadosList.length,
         afastadosList,
         stats: {
             efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
             efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
             efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },
             condutores: { req: reqCondutores, deficit: unfulfilledCondutores, chance: calcChance(unfulfilledCondutores, reqCondutores) },
             condutores_maritimos: { req: reqCondutoresMaritimos, deficit: unfulfilledCondutoresMaritimos, chance: calcChance(unfulfilledCondutoresMaritimos, reqCondutoresMaritimos) },
             chefes: { req: reqChefes, deficit: unfulfilledChefes, chance: calcChance(unfulfilledChefes, reqChefes) },
             chefes_maritimos: { req: reqChefesMaritimos, deficit: unfulfilledChefesMaritimos, chance: calcChance(unfulfilledChefesMaritimos, reqChefesMaritimos) },
             auxiliares: { req: reqAuxiliares, deficit: unfulfilledAuxiliares, chance: calcChance(unfulfilledAuxiliares, reqAuxiliares) },
             auxiliares_maritimos: { req: reqAuxiliaresMaritimos, deficit: unfulfilledAuxiliaresMaritimos, chance: calcChance(unfulfilledAuxiliaresMaritimos, reqAuxiliaresMaritimos) },
             admin: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) }
         }
       };
    });

    return {
       monthLabel: monthOpt?.label || '',
       monthValue: selectedDetailedMonth,
       alas: alasResult
    };
  }, [militars, obmContext, dynamicRequirements, correlation, selectedDetailedMonth, monthOptions, afastamentos]);

  if (loading || militarsLoading) {
     return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <button 
            onClick={() => navigate('/escala')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Espelho da Escala
          </button>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Activity className="w-7 h-7 text-rose-600" />
            Estudo Técnico das Guarnições (Plurianual)
          </h1>
          <p className="text-slate-500 mt-1">Análise teórica a longo prazo de preenchimento de vagas e déficit funcional de cada ala.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {alasStats.map(alaData => {
            const { ala, rosterCount, stats } = alaData;
            const isDanger = stats.efetivo.chance > 0;
            
            return (
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  key={ala} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
               >
                  <div className={cn("p-4 border-b flex justify-between items-center", `bg-${getAlaColor(ala as '1'|'2'|'3'|'4')}-50`, `border-${getAlaColor(ala as '1'|'2'|'3'|'4')}-100`)}>
                     <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", `bg-${getAlaColor(ala as '1'|'2'|'3'|'4')}-500`)} />
                        <h2 className={cn("text-xs font-black uppercase tracking-widest", `text-${getAlaColor(ala as '1'|'2'|'3'|'4')}-700`)}>
                           {getAlaName(ala as '1'|'2'|'3'|'4')}
                        </h2>
                     </div>
                     <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", `bg-${getAlaColor(ala as '1'|'2'|'3'|'4')}-100 text-${getAlaColor(ala as '1'|'2'|'3'|'4')}-700`)}>
                        {rosterCount} MILITARES
                     </span>
                  </div>
                  
                  <div className="p-5 flex-1 bg-white">
                     <div className="space-y-4">
                        
                        {/* Efetivo Global (Total) */}
                        <div className="mb-6">
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                 <Users className="w-3.5 h-3.5" />
                                 Efetivo Global (Total)
                              </span>
                              <span className={cn("text-[11px] font-black", stats.efetivo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.efetivo.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.efetivo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivo.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.efetivo.deficit}</span>
                              <span>Nec: {stats.efetivo.req}</span>
                           </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-3">Funções Operacionais</span>
                        </div>

                        {/* Global Operacional */}
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Operacional</span>
                              <span className={cn("text-[11px] font-black", stats.efetivoOperacional.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.efetivoOperacional.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.efetivoOperacional.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivoOperacional.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.efetivoOperacional.deficit}</span>
                              <span>Nec: {stats.efetivoOperacional.req}</span>
                           </div>
                        </div>

                        {/* Condutores */}
                        {stats.condutores.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Condutores</span>
                              <span className={cn("text-[11px] font-black", stats.condutores.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.condutores.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.condutores.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.condutores.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.condutores.deficit}</span>
                              <span>Nec: {stats.condutores.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Condutores Marítimos */}
                        {stats.condutores_maritimos.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mestres (Marítimo)</span>
                              <span className={cn("text-[11px] font-black", stats.condutores_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.condutores_maritimos.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.condutores_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.condutores_maritimos.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.condutores_maritimos.deficit}</span>
                              <span>Nec: {stats.condutores_maritimos.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Chefes */}
                        {stats.chefes.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chefes de Guarnição</span>
                              <span className={cn("text-[11px] font-black", stats.chefes.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.chefes.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.chefes.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.chefes.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.chefes.deficit}</span>
                              <span>Nec: {stats.chefes.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Chefes Maritimos */}
                        {stats.chefes_maritimos.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chefes (Marítimo)</span>
                              <span className={cn("text-[11px] font-black", stats.chefes_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.chefes_maritimos.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.chefes_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.chefes_maritimos.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.chefes_maritimos.deficit}</span>
                              <span>Nec: {stats.chefes_maritimos.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Auxiliares */}
                        {stats.auxiliares.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auxiliares / Geral</span>
                              <span className={cn("text-[11px] font-black", stats.auxiliares.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.auxiliares.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.auxiliares.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.auxiliares.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.auxiliares.deficit}</span>
                              <span>Nec: {stats.auxiliares.req}</span>
                           </div>
                        </div>
                        )}

                        {/* Auxiliares Maritimos */}
                        {stats.auxiliares_maritimos.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marinheiros (Marítimo)</span>
                              <span className={cn("text-[11px] font-black", stats.auxiliares_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.auxiliares_maritimos.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.auxiliares_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.auxiliares_maritimos.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.auxiliares_maritimos.deficit}</span>
                              <span>Nec: {stats.auxiliares_maritimos.req}</span>
                           </div>
                        </div>
                        )}

                        <div className="pt-4">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-3">Funções Administrativas</span>
                        </div>

                        {/* Efetivo Administrativo */}
                        {stats.efetivoAdministrativo.req > 0 && (
                        <div>
                           <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Administrativo</span>
                              <span className={cn("text-[11px] font-black", stats.efetivoAdministrativo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {stats.efetivoAdministrativo.chance}% Vazio
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", stats.efetivoAdministrativo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${stats.efetivoAdministrativo.chance}%` }} />
                           </div>
                           <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                              <span>Lacunas: {stats.efetivoAdministrativo.deficit}</span>
                              <span>Nec: {stats.efetivoAdministrativo.req}</span>
                           </div>
                        </div>
                        )}

                     </div>
                  </div>
               </motion.div>
            )
         })}
      </div>

      <div className="mt-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
           <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                 <Calendar className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Análise Detalhada Mensal</h2>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Impacto de Férias e Afastamentos</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mês de Referência:</span>
              <select 
                 className="text-sm font-black text-indigo-700 bg-transparent outline-none cursor-pointer hover:text-indigo-800 transition-colors"
                 value={selectedDetailedMonth}
                 onChange={e => setSelectedDetailedMonth(e.target.value)}
              >
                 {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                 ))}
              </select>
           </div>
        </div>

        {detailedMonthStats && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {detailedMonthStats.alas.map(alaData => (
                 <div key={alaData.ala} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className={cn("p-4 border-b", `bg-${getAlaColor(alaData.ala as '1'|'2'|'3'|'4')}-50`, `border-${getAlaColor(alaData.ala as '1'|'2'|'3'|'4')}-100`)}>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className={cn("w-3 h-3 rounded-full", `bg-${getAlaColor(alaData.ala as '1'|'2'|'3'|'4')}-500`)} />
                             <span className={cn("text-base font-black uppercase tracking-widest", `text-${getAlaColor(alaData.ala as '1'|'2'|'3'|'4')}-800`)}>
                                {getAlaName(alaData.ala as '1'|'2'|'3'|'4')}
                             </span>
                          </div>
                          <div className="flex gap-4 text-xs font-bold">
                             <div className="flex flex-col items-end">
                                <span className="text-slate-500">Total Previsto</span>
                                <span className="text-slate-800 text-sm">{alaData.rosterCount}</span>
                             </div>
                             <div className="flex flex-col items-end">
                                <span className="text-emerald-600">Disponível</span>
                                <span className="text-emerald-700 text-sm">{alaData.disponiveisCount}</span>
                             </div>
                             <div className="flex flex-col items-end">
                                <span className="text-rose-500">Afastados</span>
                                <span className="text-rose-600 text-sm">{alaData.afastadosCount}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                       {/* Estatísticas Críticas */}
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Análise de Funções (Pós-Férias)</h4>
                          
                          <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Déficit Geral (Efetivo)</span>
                                <span className={cn("text-xs font-black px-2 py-0.5 rounded-full", alaData.stats.efetivo.chance > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                                   {alaData.stats.efetivo.chance > 0 ? `-${alaData.stats.efetivo.deficit} func.` : 'OK'}
                                </span>
                             </div>
                             
                             {alaData.stats.condutores.req > 0 && (
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Déficit Condutores</span>
                                <span className={cn("text-xs font-black px-2 py-0.5 rounded-full", alaData.stats.condutores.chance > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                                   {alaData.stats.condutores.chance > 0 ? `-${alaData.stats.condutores.deficit} func.` : 'OK'}
                                </span>
                             </div>
                             )}

                             {alaData.stats.chefes.req > 0 && (
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Déficit Chefes de Guarnição</span>
                                <span className={cn("text-xs font-black px-2 py-0.5 rounded-full", alaData.stats.chefes.chance > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                                   {alaData.stats.chefes.chance > 0 ? `-${alaData.stats.chefes.deficit} func.` : 'OK'}
                                </span>
                             </div>
                             )}
                          </div>
                       </div>

                       {/* Lista de Afastados */}
                       <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">Militares Afastados ({alaData.afastadosCount})</h4>
                          {alaData.afastadosCount === 0 ? (
                             <div className="text-xs font-medium text-slate-400 italic">Nenhum militar afastado neste mês.</div>
                          ) : (
                             <ul className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {alaData.afastadosList.map((m: any, idx: number) => (
                                   <li key={idx} className="bg-slate-50 border border-slate-100 rounded p-2">
                                      <div className="flex justify-between items-start">
                                         <div>
                                            <div className="text-xs font-bold text-slate-700">{m.rank} {m.warName || m.name}</div>
                                            <div className="text-[10px] font-medium text-slate-500">RG: {m.rg}</div>
                                         </div>
                                         <div className="text-[9px] font-black text-rose-500 uppercase bg-rose-50 px-1.5 py-0.5 rounded">
                                            {m.afastamentoInfo.situacao || 'Afastado'}
                                         </div>
                                      </div>
                                   </li>
                                ))}
                             </ul>
                          )}
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
