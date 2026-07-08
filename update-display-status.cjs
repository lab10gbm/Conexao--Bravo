const fs = require('fs');
let content = fs.readFileSync('src/components/VacationModule.tsx', 'utf8');

const oldBlock = `                        let displayStatus: string = v.status;
                        if (v.dataInicio) {
                          const dateParts = v.dataInicio.split("/");
                          const d = new Date(
                            parseInt(dateParts[2]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[0]),
                          );
                          displayStatus = d > new Date() ? "marcado" : "gozado";
                        }
                        if (
                          v.ato &&
                          v.ato.toUpperCase().includes("ASSEGURADAS")
                        )
                          displayStatus = "asseguradas";`;

const newBlock = `                        let displayStatus: string = v.status;
                        if (v.dataInicio) {
                          const dateParts = v.dataInicio.split("/");
                          const d = new Date(
                            parseInt(dateParts[2]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[0]),
                          );
                          displayStatus = d > new Date() ? "marcado" : "gozado";
                        }
                        
                        const atoUp = (v.ato || "").toUpperCase();
                        if (atoUp.includes("ASSEGURADAS")) displayStatus = "asseguradas";
                        else if (atoUp.includes("CANCELAMENT")) displayStatus = "cancelado";
                        else if (atoUp.includes("INTERRUP")) displayStatus = "interrompido";
                        else if (atoUp.includes("PENDENTE")) displayStatus = "pendente";
                        else if (atoUp.includes("PRESUMIDA") || atoUp.includes("PRESUNCAO") || atoUp.includes("PRESUNÇÃO")) displayStatus = "presumida";
                        else if (atoUp.includes("ABONO")) displayStatus = "abono";`;

content = content.replace(oldBlock, newBlock);

const oldSubBlock = `                                  let subStatus: string = subV.status;
                                  if (subV.dataInicio) {
                                    const dp = subV.dataInicio.split("/");
                                    const sd = new Date(
                                      parseInt(dp[2]),
                                      parseInt(dp[1]) - 1,
                                      parseInt(dp[0]),
                                    );
                                    subStatus =
                                      sd > new Date() ? "marcado" : "gozado";
                                  }
                                  if (
                                    subV.ato &&
                                    subV.ato.toUpperCase().includes("ASSEGURADAS")
                                  )
                                    subStatus = "asseguradas";`;

const newSubBlock = `                                  let subStatus: string = subV.status;
                                  if (subV.dataInicio) {
                                    const dp = subV.dataInicio.split("/");
                                    const sd = new Date(
                                      parseInt(dp[2]),
                                      parseInt(dp[1]) - 1,
                                      parseInt(dp[0]),
                                    );
                                    subStatus =
                                      sd > new Date() ? "marcado" : "gozado";
                                  }
                                  
                                  const subAtoUp = (subV.ato || "").toUpperCase();
                                  if (subAtoUp.includes("ASSEGURADAS")) subStatus = "asseguradas";
                                  else if (subAtoUp.includes("CANCELAMENT")) subStatus = "cancelado";
                                  else if (subAtoUp.includes("INTERRUP")) subStatus = "interrompido";
                                  else if (subAtoUp.includes("PENDENTE")) subStatus = "pendente";
                                  else if (subAtoUp.includes("PRESUMIDA") || subAtoUp.includes("PRESUNCAO") || subAtoUp.includes("PRESUNÇÃO")) subStatus = "presumida";
                                  else if (subAtoUp.includes("ABONO")) subStatus = "abono";`;

content = content.replace(oldSubBlock, newSubBlock);


function getStatusColorClassLogic(varName) {
    return '${' + varName + ' === "gozado" ? "bg-emerald-50 text-emerald-600" : ' + varName + ' === "marcado" ? "bg-indigo-50 text-indigo-600" : ' + varName + ' === "cancelado" ? "bg-rose-50 text-rose-600" : ' + varName + ' === "interrompido" ? "bg-orange-50 text-orange-600" : ' + varName + ' === "presumida" ? "bg-slate-100 text-slate-600" : ' + varName + ' === "abono" ? "bg-teal-50 text-teal-600" : "bg-amber-50 text-amber-600"}';
}

function getStatusDotColorClassLogic(varName) {
    return '${' + varName + ' === "gozado" ? "bg-emerald-500" : ' + varName + ' === "marcado" ? "bg-indigo-500" : ' + varName + ' === "cancelado" ? "bg-rose-500" : ' + varName + ' === "interrompido" ? "bg-orange-500" : ' + varName + ' === "presumida" ? "bg-slate-400" : ' + varName + ' === "abono" ? "bg-teal-500" : "bg-amber-500"}';
}

content = content.replace(
  /\$\{displayStatus === "gozado" \? "bg-emerald-50 text-emerald-600" : displayStatus === "marcado" \? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"\}/g,
  getStatusColorClassLogic('displayStatus')
);
content = content.replace(
  /\$\{displayStatus === "gozado" \? "bg-emerald-500" : displayStatus === "marcado" \? "bg-indigo-500" : "bg-amber-500"\}/g,
  getStatusDotColorClassLogic('displayStatus')
);

content = content.replace(
  /\$\{subStatus === "gozado" \? "bg-emerald-50 text-emerald-600" : subStatus === "marcado" \? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"\}/g,
  getStatusColorClassLogic('subStatus')
);
content = content.replace(
  /\$\{subStatus === "gozado" \? "bg-emerald-500" : subStatus === "marcado" \? "bg-indigo-500" : "bg-amber-500"\}/g,
  getStatusDotColorClassLogic('subStatus')
);

fs.writeFileSync('src/components/VacationModule.tsx', content);
