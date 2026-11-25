// Busca imagens e vídeos no Wikimedia Commons e lista licença, autor, tamanho e descrição (nada é baixado).
// Uso (na raiz do kit): node ferramentas/commons-busca.mjs "termo 1" "termo 2" ...
// Só use o que tiver licença com uso comercial (CC0, domínio público, CC BY, CC BY-SA); nunca NC nem ND.
const UA = 'image-research-script/1.0';
const consultas = process.argv.slice(2);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', origin: '*', ...params });
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    await espera(2500 + tentativa * 4000);
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const texto = await r.text();
    try { return JSON.parse(texto); } catch { /* limite de requisições: tenta de novo */ }
  }
  throw new Error('Commons recusou as requisições');
}

for (const q of consultas) {
  const busca = await api({ action: 'query', list: 'search', srsearch: q, srnamespace: '6', srlimit: '12' });
  const titulos = (busca.query?.search || []).map((s) => s.title);
  console.log(`\n=== ${q} (${titulos.length})`);
  if (!titulos.length) continue;
  const info = await api({ action: 'query', titles: titulos.join('|'), prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription' });
  for (const p of Object.values(info.query.pages)) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata || {};
    const limpa = (v) => String(v?.value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
    console.log(`- ${p.title} | ${ii.width}x${ii.height} | ${ii.mime} | ${limpa(m.LicenseShortName)} | ${limpa(m.Artist)}`);
    console.log(`    ${limpa(m.ImageDescription)}`);
  }
}
