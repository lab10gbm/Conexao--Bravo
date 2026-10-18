async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/militar/12764');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
