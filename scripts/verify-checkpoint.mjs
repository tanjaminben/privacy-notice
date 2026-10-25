import assert from 'node:assert/strict';
import { topics } from '../packages/privacy-notice/source/facts.mjs';
import { lessons } from '../packages/privacy-notice/source/lessons.mjs';
assert.equal(topics.length, 15);
const ids = topics.flatMap(t => t.facts.map(f => `${t.id}.${f.id}`));
assert.equal(ids.length, 58);
assert.equal(new Set(ids).size, 58);
assert.deepEqual(Object.keys(lessons).sort(), topics.map(t => t.id).sort());
for (const topic of topics) {
  const lesson = lessons[topic.id];
  assert(lesson.question && lesson.why && lesson.include && lesson.avoid && lesson.driver && lesson.refs.length);
  for (const [label, url] of lesson.refs) assert(label && /^https:\/\/(eur-lex\.europa\.eu|ico\.org\.uk|oag\.ca\.gov|www\.ftc\.gov)\//.test(url));
  for (const fact of topic.facts) assert(fact.plain && fact.formal && fact.label);
}
console.log('Verified 15 teaching topics, 58 unique paired facts, and complete lesson/source mappings. This is structural validation, not legal currency review.');
