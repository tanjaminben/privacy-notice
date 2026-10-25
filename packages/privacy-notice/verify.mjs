// Content, portability, and asset-integrity checks. Browser/semantic QA is separate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {topics} from './source/facts.mjs';
import {lessons} from './source/lessons.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..'), site=path.join(root,'site');
const html=fs.readFileSync(path.join(site,'guides/privacy-notice/index.html'),'utf8');

const sha=b=>createHash('sha256').update(b).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
assert.equal(topics.length,15);
assert.deepEqual(Object.keys(lessons).sort(),topics.map(t=>t.id).sort(),'every section has a teaching lesson');
assert(html.includes('<title>Anatomy of a Privacy Notice — Ben Tan</title>'));
assert(!/data-notice-edition|data-notice-print|Print full notice|>Reading edition</.test(html),'rejected sidebar controls remain removed');
for(const t of topics) {
  const lesson=lessons[t.id];
  assert(lesson.question && lesson.why && lesson.include && lesson.avoid && lesson.driver && lesson.refs.length);
  assert(html.includes(esc(lesson.question)),`Missing lesson trigger ${t.id}`);
  for(const [label,url] of lesson.refs) {
    assert(/^https:\/\/(eur-lex\.europa\.eu|ico\.org\.uk|oag\.ca\.gov|www\.ftc\.gov)\//.test(url),`Unexpected source ${url}`);
    assert(html.includes(esc(label)),`Missing named source ${label}`);
  }
}
assert.deepEqual([...html.matchAll(/data-pe-topic data-detail-title/g)].length,15);
const facts=topics.flatMap(t=>t.facts.map(f=>`${t.id}.${f.id}`));
assert.equal(new Set(facts).size,58,'stable fact ids must be unique');
for(const attribute of ['data-notice-fact','data-notice-plain-fact']) {
  const actual=[...html.matchAll(new RegExp(`${attribute}="([^"]+)"`,'g'))].map(m=>m[1]);
  assert.deepEqual(actual.sort(),[...facts].sort(),`${attribute}: every fact appears once`);
}
for(const t of topics) for(const f of t.facts) {
  assert(html.includes(esc(f.plain)),`Missing plain fact ${t.id}.${f.id}`);
  assert(html.includes(esc(f.formal)),`Missing formal fact ${t.id}.${f.id}`);
}
assert(!/<dialog\b|data-pe-open-detail|aria-haspopup="dialog"/.test(html),'no detail modal');
assert(!/Advokat|Ducket LLC|Mailgun|Fastly|Fourthwall|support@|data-portal/i.test(html),'no retired operational copy');
assert(!/<form\b|<input\b|mailto:privacy@example/.test(html),'fictional contact and service are non-operational');
assert(!/{{[^}]+}}/.test(html),'all template fields resolved');
assert(html.includes('Example Studio is fictional.'));
assert(html.includes('href="/privacy"'),'actual privacy link stays separate');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'HTML ids unique');
const nutshells=new Set([...html.matchAll(/<h2>:x ([^<]+)<\/h2>/g)].map(m=>m[1]));
const normalizedHeadings=[...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase());
for(const target of nutshells) assert.equal(normalizedHeadings.filter(h=>h.includes(target.toLowerCase())).length,1,`Ambiguous Nutshell heading ${target}`);
for(const m of html.matchAll(/href="#([^"<]+)"/g)) assert(ids.includes(m[1])||nutshells.has(m[1]),`Missing target ${m[1]}`);
const paths=new Set([...html.matchAll(/(?:src|href)="(\/[^"?#]+)/g)].map(m=>m[1]).filter(p=>path.extname(p)&&!p.endsWith('.html')));
for(const url of paths) assert(fs.existsSync(path.join(site,url)),`Missing local asset ${url}`);

const ledger=['# Paired content review','', 'Fictional demonstration. These are the authored versions of the same facts; structural checks do not establish legal compliance.','',...topics.flatMap(t=>[`## ${t.title}`,'','| Fact | Plain expansion | Detailed notice |','| --- | --- | --- |',...t.facts.map(f=>`| ${t.id}.${f.id} | ${f.plain.replaceAll('|','\\|')} | ${f.formal.replaceAll('|','\\|')} |`),''])].join('\n');
fs.writeFileSync(path.join(here,'CONTENT-MAP.md'),ledger+'\n');
console.log(JSON.stringify({topics:topics.length,pairedFacts:facts.length,nutshellSections:nutshells.size,localReferences:paths.size,externalAssets:'validated by verify-assets',outputSha256:sha(html)},null,2));
fs.writeFileSync(path.join(here,'LESSON-MAP.md'),['# Anatomy of a Privacy Notice — lessons','',
  'Sources checked October 20, 2026. EU GDPR baseline; UK and US examples are labeled. Fictional processing values are illustrative.',
  '',...topics.flatMap(t=>{const l=lessons[t.id];return [`## ${l.question}`,'',l.why,'',`Include: ${l.include}`,'',`Pitfall: ${l.avoid}`,'',`Legal driver: ${l.driver}`,'',...l.refs.map(([label,url])=>`- [${label}](${url})`),''];})].join('\n')+'\n');
