import { collection, query, getDocs } from "firebase/firestore";
import { db } from "./src/lib/firebase";

async function main() {
  const result = await getDocs(query(collection(db, 'permutas')));
  const permutas = result.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("Total permutas:", permutas.length);
  const byDate = permutas.filter(p => p.date === '2024-06-11' || p.date === '2025-06-11' || p.date === '2026-06-11');
  console.log("permutas for 11/06:", JSON.stringify(byDate, null, 2));
}
main().catch(console.error);
