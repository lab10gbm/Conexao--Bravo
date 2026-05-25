import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const rawData = `26/01	Segunda-feira	Filé de frango grelhado com purê de batata	-	Lombo ao molho madeira
27/01	Terça-feira	Bife na panela acebolado (patinho) com fritas	-	Coxa e sobrecoxa
28/01	Quarta-feira	Strogonoff de frango	-	Quibe de forno
29/01	Quinta-feira	Filé de peixe com pirão e legumes	-	Macarrão com carne moída
30/01	Sexta-feira	Feijoada	-	Carne assada ao molho madeira
31/01	Sábado	Lasanha de carne ou frango	-	Lombo acebolado
01/02	Domingo	Jardineira 	-	Frango grelhado e salada de alface e tomate
02/02	Segunda-feira	Filé de frango grelhado com purê de abóbora 	Gelatina de Morango	Lombo ao molho madeira e salada de legumes
03/02	Terça-feira	Frango a parmegiana e salada de cenoura, milho e rúcula	Doce de Leite	Carne assada e salada de pepino, alface e cebola
04/02	Quarta-feira	Strogonoff de frango e salada de alface e tomate	Fruta da Época	Calabresa acebolada e salada de cenoura 
05/02	Quinta-feira	Jardineira 	Mousse de Limão	Coxa e sobrecoxa com salada de legumes
06/02	Sexta-feira	Lombo ao molho madeira, repolho refogado e salada	Sorvete	Coxa e sobrecoxa e salada de abóbora 
07/02	Sábado	Lasanha de carne ou frango 	Pudim	"Lombo acebolado com salada de legumes
"
08/02	Domingo	Tutu, couve, linguiça e couve refogada	Fruta da Época	Carne assada e salada fresca 
09/02	Segunda-feira	Filé de Frango Empanado com purê de Batata	Gelatina de Morango	Lombo ao molho madeira e salada de legumes
10/02	Terça-feira	Coxa e sobrecoxa , macarrão alho e oleo, Salada de Cenoura	Doce de Leite	Kibe de Forno e Salada de Cenoura
11/02	Quarta-feira	Filé de peixe com salada de pepino, alface e tomate	Fruta da Época	Calabresa acebolada com isca de frango
12/02	Quinta-feira	Strogonoff de carne e salada de alface e tomate	Mousse de Limão	Filé de Peixe com salada de legumes
13/02	Sexta-feira	Jardineira e macarrão alho e óleo 	Fruta da Época	Filé de frango grelhado com salada de legumes
14/02	Sábado	Churrasco 	Pudim	Filé de peito e salada de alface, tomate e pepino
15/02	Domingo	Churrasco 	Fruta da Época	Coxa e sobrecoxa com salada de legumes
16/02	Segunda-feira	Churrasco 	Gelatina de Morango	calabresa acebolada com iscas de frango
17/02	Terça-feira	Churrasco 	Doce de Leite	coxa e sobrecoxa com salada de legumes
18/02	Quarta-feira	coxa e sobrecoxa e salada de pepino, alface e tomate	Fruta da Época	lombo ao molho madeira e aipim frito
19/02	Quinta-feira	Strogonof de frango com batata palha e salada de alface e tomate	Mousse de Limão	 carne assada com aipim frito e salada de beterraba com cenoura
20/02	Sexta-feira	lombo ao molho madeira e aipim frito	Doce de Leite	calabresa com iscas de frango e macarrão alho e óleo
21/02	Sábado	lasanha de carne	Gelatina de Morango	filé de peito e salada de alface, tomate e pepino
22/02	Domingo	Coxa e sobrecoxa com salada de legumes	Doce de Leite	quibe de forno e salada de beterraba e cenoura
23/02	Segunda-feira	Strogonoff de frango, batata palha e salada de alface e tomate	Fruta da Época	Carne assada e salada de alface e tomate
24/02	Terça-feira	Filé de frango grelhado, quibebe de abóbora e salada de cenoura e beterraba 	Mousse de Limão	Macarrão com carne moída com salada de cenoura e beterraba 
25/02	Quarta-feira	Filé de peixe com pirão e salada de alface, tomate e milho 	Sorvete	Coxa e sobrecoxa e salada de alface, tomate e milho
26/02	Quinta-feira	Lombo ao molho madeira e salada de legumes	Pudim	Quibe de forno e salada 
27/02	Sexta-feira	Coxa e sobrecoxa, macarrão alho e óleo e salada 	Fruta da Época	Calabresa acebolada com iscas de frango e salada de legumes
28/02	Sábado	Jardineira	Gelatina de Morango	Filé de frango grelhado e salada de alface, tomate e pepino
01/03	Domingo	 Tutu, linguiça e couve refogada	Doce de Leite	Coxa e sobrecoxa e salada de legumes
02/03	Segunda-feira	Filé de frango grelhado e quibebe de abóbora 	Laranja / Abacaxi	Carne assada ao molho madeira
03/03	Terça-feira	Coxa e sobrecoxa ao molho 	Mousse de Limão	Lombo acebolado
04/03	Quarta-feira	Coxa e sobrecoxa e quibebe de abóbora 	Sorvete	Iscas de Carré 
05/03	Quinta-feira	Strogonoff de frango	Pudim	Lombo ao molho madeira
06/03	Sexta-feira	Lasanha de Carne 	Fruta da Época	Coxa e sobrecoxa e macarrão alho e óleo
07/03	Sábado	Filé de peixe com quibebe de abóbora 	Gelatina de Morango	Filé de frango grelhado 
08/03	Domingo	Carne assada ao molho madeira e polenta	Doce de Leite	Coxa e sobrecoxa ao molho
16/03	Segunda-feira	Coxa e sobrecoxa e macarrão alho e óleo	Mousse de Limão	Jardineira 
17/03	Terça-feira	Frango (coxa e sobrecoxa) com quiabo e polenta 	Mousse de Limão	Filé de peixe com pirão 
18/03	Quarta-feira	Filé de peixe com quibebe de abóbora 	Sorvete	Lombo ao molho madeira e polenta
19/03	Quinta-feira	Feijoada de frutos do mar 	Pudim	Filé de frango grelhado e repolho refogado
20/03	Sexta-feira	Carne assada ao molho madeira e macarrão alho e óleo 	Fruta da Época	Coxa e sobrecoxa e salada de legumes
21/03	Sábado	Lasanha de carne	Gelatina de Morango	Coxa e sobrecoxa e repolho refogado
22/03	Domingo	Filé de frango a parmegiana e purê de batata	Doce de Leite	Lombo acebolado com calabresa
23/03	Segunda-feira	Jardineira 	Laranja / Abacaxi	Lombo acebolado com calabresa 
24/03	Terça-feira	Coxa e sobrecoxa e salada de legumes	Mousse de Limão	Carne assada ao molho madeira e polenta
25/03	Quarta-feira	Costela com batata e agrião 	Sorvete	Lombo ao molho madeira e farofa
26/03	Quinta-feira	Filé de frango grelhado e quibebe de abóbora com carne seca	Gelatina de Morango	Quibe de forno e salada
27/03	Sexta-feira	Cozido de carne com aipim e farofa	Doce de Leite	Frango grelhado e salada de legumes 
28/03	Sábado	Lasanha de carne 	Laranja / Abacaxi	Lombo acebolado e polenta 
29/03	Domingo	Feijoada	Doce de Leite	Iscas de frango com calabresa e repolho refogado 
30/03	segunda-feira	Coxa e sobrecoxa e macarrão alho e óleo	Fruta da Época	Quibe de forno
31/03	terça-feira	Lombo ao molho madeira e polenta	Gelatina de Morango	Coxa e sobrecoxa e repolho refogado
01/04	quarta-feira	Filé de frango e quibebe de abóbora	Doce de Leite	Escondidinho de carne moída
02/04	quinta-feira	Cozido de carne com aipim e farofa	Laranja / Abacaxi	Lombo acebolado e purê de batata
03/04	sexta-feira	Risoto de frutos do mar	Mousse de Limão	Filé de peixe com pirâo
04/04	sábado	Lasanha de frango	Sorvete	Carne assada ao molho madeira e polenta
05/04	domingo	Churrasco 	Gelatina de Morango	Coxa e sobrecoxa e macarrâo alho e óeo
06/04	segunda-feira	strogonoff de frango	Doce de Leite	Lombo acebolado com calabresa
07/04	terça-feira	Carne assada ao molho madeira e polenta	Laranja / Abacaxi	Coxa e sobrecoxa e repolho refogado
08/04	quarta-feira	Cozido de carne com legumes e farofa	Mousse de Limão	 Iscas de frango com calabresa
09/04	quinta-feira	Filé de peixe com pirão 	Sorvete	Lombo ao molho madeira e polenta
10/04	sexta-feira	Filé de frango grelhado e quibebe de abóbora 	Pudim	Escondidinho de batata com carne moída 
11/04	sábado	Lasanha de carne	Fruta da Época	Coxa e sobrecoxa e salada de legumes
12/04	domingo	Churrasco 	Gelatina de Morango	Carne assada ao molho madeira
13/04	segunda-feira	Frango na panela (coxa e sobrecoxa) e polenta 	Doce de Leite	Quibe de forno 
14/04	terça-feira	Strogonoff de frango	Laranja / Abacaxi	Carne assada ao molho madeira e polenta
15/04	quarta-feira	Cozido de carne com legumes, macarrão alho e óleo e farofa	Mousse de Limão	Iscas de frango com calabresa
16/04	quinta-feira	Filé de peixe com pirão 	Sorvete	Lombo ao molho madeira e polenta
17/04	sexta-feira	Filé de frango grelhado e purê de batata 	Pudim	Iscas de lombo com calabresa e macarrão alho e óleo 
18/04	sábado	Lasanha de carne	Fruta da Época	Coxa e sobrecoxa na panela e polenta
19/04	domingo	Churrasco 	Gelatina de Morango	Coxa e sobrecoxa e macarrão alho e óleo
20/04	segunda-feira	Frango na panela (coxa e sobrecoxa) e polenta 	Doce de Leite	 Escondidinho de batata com carne moída 
21/04	terça-feira	Strogonoff de Frango e salada com cenoura 	Laranja / Abacaxi	 Carne assada ao molho madeira e polenta
22/04	quarta-feira	Cozido de carne com aipim ( vaca atolada) e farofa	Mousse de Limão	Frango Grelhado
23/04	quinta-feira	 Filé de peixe com pirão e salada de legumes 	Sorvete	 Lombo ao molho madeira e macarrão alho e óleo 
24/04	sexta-feira	Cozido de carne com legumes (mix dos disponíveis no aprovisiomento) e farofa	Pudim	 Filé de frango grelhado com purê de inhame
25/04	sábado	Lasanha de carne	Fruta da Época	Coxa e sobrecoxa na panela e polenta
26/04	domingo	Feijoada	Gelatina de Morango	 Coxa e sobrecoxa e macarrão alho e óleo
27/04	segunda-feira	Filé de peixe com pirão	Doce de Leite	Iscas de Lombo com calabresa
28/04	terça-feira	Frango na panela (coxa/sob) e polenta 	Laranja / Abacaxi	Quibe de forno 
29/04	quarta-feira	Cozido de carne com legumes e farofa	Mousse de Limão	Filé de frango grelhado e purê de inhame
30/04	quinta-feira	Strogonoff de frango 	Sorvete	Filé de peixe com pirão 
01/05	sexta-feira	Coxa e sobrecoxa assada e quibebe de abóbora 	Gelatina de Morango	Lombo ao molho madeira e macarrão alho e óleo 
02/05	sábado	Lasanha de carne	Doce de Leite	Coxa e sobrecoxa na panela e polenta
03/05	domingo	Carne assada e batata frita 	Laranja / Abacaxi	Filé de frango grelhado e macarrão alho e óleo
11/05	segunda-feira	ARROZ, FEIJÃO, FRANGO EMPANADO/GRELHADO, PURÊ, SALADA	DOCE DE LEITE	CAFÉ, SUCO, PIPOCA
12/05	terça-feira	Carne ao molho madeira e polenta 	Fruta da Época	Coxa e sobrecoxa assada e macarrão alho e óleo 
13/05	quarta-feira	Cozido de carne com legumes e farofa	Gelatina de Morango	Filé de frango grelhado 
14/05	quinta-feira	Filé de peixe com pirão 	Doce de Leite	Lombo ao molho madeira e macarrão alho e óleo 
15/05	sexta-feira	Filé de frango grelhado e quibebe de abóbora 	Laranja / Abacaxi	Carne assada ao molho madeira e macarrão alho e óleo 
16/05	sábado	Lasanha de frango 	Mousse de Limão	Filé de peixe com pirão 
17/05	domingo	Carne assada ao molho madeira e polenta	Sorvete	Coxa e sobrecoxa e macarrão alho e óleo 
18/05	segunda-feira	ARROZ, FEIJÃO, FRANGO EMPANADO/GRELHADO, QUIBEBE DE ABÓBORA SALADA	DOCE DE LEITE	ARROZ, FEIJÃO, FAROFA, CARNE ASSADA, SALADA
19/05	terça-feira	ARROZ, FEIJÃO, STROGONOFF DE FRANGO, BATATA PALHA, FAROFA, SALADA	FRUTA DA ÉPOCA	ARROZ, FEIJÃO, LOMBO C/BARBECUE, REPOLHO REFOGADO, MACARRÃO ALHO E OLEO
20/05	quarta-feira	ARROZ, FEIJÃO, FILÉ DE PEIXE COM MOLHO DE CAMARÃO, FAROFA DE BANANA, PURÊ DE BATATA SALADA	MOUSSE DE LIMÃO	ARROZ, FEIJÃO, CARNE ASSADA, SALADA DE BATATA, MACARRÃO ALHO E ÓLEO
21/05	quinta-feira	ARROZ, FEIJÃO, COXA SOBRE COXA C/QUIABO, POLENTA, SALADA	GELATINA DE MORANGO	ARROZ, FEIJÃO, ESCONDIDINHO DE CARNE MOÍDA, FAROFA E SALADA
22/05	sexta-feira	ARROZ, FEIJOADA, FAROFA, COUVE REFOGADA	PAVÊ DE CHOCOLATE	ARROZ, FEIJÃO, FILÉ DE PEIXE, PIRÃO, FAROFA, SALADA
23/05	sábado	ARROZ, FEIJÃO, LASANHA DE FRANGO, SALADA	MOUSSE DE MARACUJÁ	ARROZ, FEIJÃO, LOMBO AO MOLHO MADEIRA, BATATA FRITA, SALADA
24/05	domingo	ARROZ, FEIJÃO, FRANGO ASSADO, SALADA DE MAIONESE, FAROFA	BANOFFE	ARROZ, FEIJÃO, ALMONDEGAS, ESPAGUETE ALHO E OLEO, SALADA`;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

async function run() {
  const docRef = doc(db, 'refeitorio', 'data');
  const snap = await getDoc(docRef);
  let menus = [];
  if (snap.exists() && snap.data().menus) {
    menus = snap.data().menus;
  }
  
  const lines = rawData.split('\n').filter(l => l.trim().length > 0);
  
  for (const line of lines) {
    const parts = line.split('\t').map(p => p.trim().replace(/^"|"$/g, '').trim());
    if (parts.length >= 5) {
       const date = parts[0];
       const weekdayText = parts[1].toUpperCase();
       const almocoRaw = parts[2];
       const sobremesa = parts[3];
       const jantarRaw = parts[4];
       
       const almParts = almocoRaw.split(/ e |,| com |\//).map(s => s.trim()).filter(Boolean);
       let almPrincipal = almParts.length > 0 ? almParts[0].toUpperCase() : almocoRaw.toUpperCase();
       
       if (almPrincipal.startsWith('ARROZ FEIJÃO')) { almPrincipal = almPrincipal.replace('ARROZ FEIJÃO', '').trim(); }
       if (almPrincipal.startsWith('ARROZ, FEIJÃO')) { almPrincipal = almPrincipal.replace('ARROZ, FEIJÃO', '').trim(); }
       if (almPrincipal.startsWith(',')) { almPrincipal = almPrincipal.substring(1).trim(); }

       const almAcomp = almParts.slice(1).join(', ').toUpperCase() || 'ARROZ, FEIJÃO';
       
       const janParts = jantarRaw.split(/ e |,| com |\//).map(s => s.trim()).filter(Boolean);
       let janPrincipal = janParts.length > 0 ? janParts[0].toUpperCase() : jantarRaw.toUpperCase();

       if (janPrincipal.startsWith('ARROZ FEIJÃO')) { janPrincipal = janPrincipal.replace('ARROZ FEIJÃO', '').trim(); }
       if (janPrincipal.startsWith('ARROZ, FEIJÃO')) { janPrincipal = janPrincipal.replace('ARROZ, FEIJÃO', '').trim(); }
       if (janPrincipal.startsWith(',')) { janPrincipal = janPrincipal.substring(1).trim(); }

       const janAcomp = janParts.slice(1).join(', ').toUpperCase() || 'ARROZ, FEIJÃO';
       
       const isLanche = janPrincipal.includes('CAFÉ') || janPrincipal.includes('SUCO') || janPrincipal.includes('PIPOCA');

       const exists = menus.findIndex(m => m.date === date);
       const item = {
          date,
          weekday: weekdayText,
          almoco: {
             principal: almPrincipal,
             acompanhamentos: almAcomp.length < 5 ? 'ARROZ, FEIJÃO' : almAcomp,
             saladas: 'SALADA TRADICIONAL',
             sobremesa: sobremesa === '-' ? '' : sobremesa.toUpperCase()
          },
          jantar: isLanche ? { principal: '', acompanhamentos: '', saladas: '', ceia: '' } : {
             principal: janPrincipal,
             acompanhamentos: janAcomp.length < 5 ? 'ARROZ, FEIJÃO' : janAcomp,
             saladas: 'SALADA TRADICIONAL',
             ceia: 'CEIA PADRÃO'
          },
          cafeManha: 'CAFÉ, PÃO, OVOS, FRUTAS',
          lancheTarde: isLanche ? jantarRaw.toUpperCase() : 'CAFÉ DA TARDE PADRÃO'
       };
       
       if (exists !== -1) {
          menus[exists] = item;
       } else {
          menus.push(item);
       }
    }
  }
  
  await setDoc(docRef, { menus }, { merge: true });
  console.log("Successfully imported menus. Count:", menus.length);
}

run().then(() => process.exit(0)).catch(e => {
  console.error("Error", e);
  process.exit(1);
});
