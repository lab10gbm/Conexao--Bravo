async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/militar');
    const data = await res.json();
    const m = data.members.find((x: any) => x.rg === '12708');
    console.log(JSON.stringify(m, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();