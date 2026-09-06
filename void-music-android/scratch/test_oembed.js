async function test() {
  const vids = ['PeZGK3zNRLc', 'hPeafiA5gUc', '0c0V5yNuILk', '1Y3cWSXf6Zk', 'egYqi1g1tBQ'];
  for (const v of vids) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v}&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      console.log(`${v}: author="${data.author_name}" | title="${data.title}"`);
    } else {
      console.log(`${v}: oembed failed with ${res.status}`);
    }
  }
}
test();
