import assert from 'node:assert/strict';
import { topics } from '../packages/privacy-notice/source/facts.mjs';
import { lessons } from '../packages/privacy-notice/source/lessons.mjs';
import { teaching } from '../packages/privacy-notice/source/teaching.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
assert.equal(createHash('sha256').update(readFileSync(new URL('../packages/privacy-notice/source/facts.mjs',import.meta.url))).digest('hex'),'7e65cb30a42a87e34b69fd0f54e9a529ed33be4ca07680e3341afab80e1125b5','released paired fact corpus remains unchanged');
assert.equal(topics.length, 15);
const ids = topics.flatMap(t => t.facts.map(f => `${t.id}.${f.id}`));
assert.equal(ids.length, 58);
assert.equal(new Set(ids).size, 58);
assert.deepEqual(Object.keys(lessons).sort(), topics.map(t => t.id).sort());
assert.deepEqual(Object.keys(teaching).sort(), topics.map(t => t.id).sort());
for (const topic of topics) {
  const lesson = lessons[topic.id];
  assert(lesson.question && lesson.why && lesson.include && lesson.avoid && lesson.driver && lesson.refs.length);
  for (const [label, url] of lesson.refs) assert(label && /^https:\/\/(eur-lex\.europa\.eu|ico\.org\.uk|oag\.ca\.gov|www\.ftc\.gov)\//.test(url));
  for (const fact of topic.facts) assert(fact.plain && fact.formal && fact.label);
  const guidance=teaching[topic.id];
  assert(guidance.heading&&guidance.classification&&guidance.requirement&&guidance.practice&&guidance.example&&guidance.refs.length);
  for(const [label,url] of guidance.refs)assert(label&&/^https:\/\/(www\.legislation\.gov\.uk|eur-lex\.europa\.eu|ico\.org\.uk|commission\.europa\.eu|cppa\.ca\.gov|www\.ecfr\.gov|www\.ftc\.gov)\//.test(url));
}
console.log('Verified 15 teaching topics, 58 unique paired facts, and complete lesson/source mappings. This is structural validation, not legal currency review.');
