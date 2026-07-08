import fs from 'fs';

const data = JSON.parse(fs.readFileSync('c:/Users/User/OneDrive/Desktop/test-db.txt', 'utf8'));
console.log('profiles', data.length);

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;
const PDF_EXT = /\.pdf(\?|$)/i;

const rows = [];
for (const p of data) {
  const terms = (p._embedded?.['wp:term'] || []).flat().map((x) => `${x.slug}:${x.name}`);
  const feat = p._embedded?.['wp:featuredmedia']?.[0];
  const html = p.content?.rendered || '';
  const urls = [...html.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((m) => m[0]);
  const vids = urls.filter((u) => VIDEO_EXT.test(u));
  const pdfs = urls.filter((u) => PDF_EXT.test(u));
  const hasStats = /cmsmasters-widget-icon-list-item-value/i.test(html);
  rows.push({
    slug: p.slug,
    title: p.title.rendered,
    cats: terms,
    featured: !!feat?.source_url,
    vids: [...new Set(vids)].length,
    pdfs: [...new Set(pdfs)].length,
    hasStats,
    contentLen: html.length,
  });
}

console.log(rows.slice(0, 10));
console.log('with vids in content', rows.filter((t) => t.vids).length);
console.log('with pdfs in content', rows.filter((t) => t.pdfs).length);
console.log('with stats in content', rows.filter((t) => t.hasStats).length);
console.log('all:', rows.map((t) => t.slug).join(', '));
