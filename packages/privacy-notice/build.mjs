import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { topics, example } from './source/facts.mjs';
import { lessons, lessonSources } from './source/lessons.mjs';
import { editionIcon, couponBarcode } from './source/decoration.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const out=path.join(root,'site/guides/privacy-notice');
const read=p=>fs.readFileSync(path.join(here,p),'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const source=JSON.parse(read('SOURCE-PROVENANCE.json'));

const pictures=new Map(source.lineage.map(a=>[a.asset,a]));
const imageURL=f=>'/guides/privacy-notice/art/'+f.split('/').at(-1);
function art(name,classes='pe-news-art',hero=false) {
  const a=pictures.get(name); if(!a) throw new Error('Missing art '+name);
  const d=a.derivatives.find(d=>d.width===800)||a.derivatives.at(-1);
  return `<figure class="pe-art pe-art--${name} ${classes}"${hero?'':' aria-hidden="true"'}><img src="${imageURL(d.file)}" srcset="${a.derivatives.map(x=>`${imageURL(x.file)} ${x.width}w`).join(', ')}" sizes="(max-width: 640px) 90vw, 600px" width="${d.width}" height="${d.height}" style="--pe-art-ratio:${d.width}/${d.height};--pe-food-ratio:${d.width}/${d.height}" ${hero?'fetchpriority="high"':'loading="lazy"'} alt="${hero?'A folded newspaper and a grocery flyer, side by side.':''}"></figure>`;
}
// Nutshell matches normalized heading text, including partial matches. A unique
// prefix prevents e.g. "Noticechanges" from selecting the visible topic title.
const nutshellId=t=>'PrivacyNoticeLesson'+t.id.replaceAll('-','')+'Topic';
const exampleId=t=>'PrivacyNoticeExample'+t.id.replaceAll('-','')+'Topic';
const openLink=t=>`<a class="notice-expand" href="#${nutshellId(t)}">:${esc(lessons[t.id].question)}</a>`;
function plain(t) {
  const content=`<p>${esc(t.lead)}</p>`;
  if(t.id==='analytics') return `<div class="notice-recipe"><div class="notice-recipe-meta"><span><strong>Recipe</strong> Readership statistics</span><span><strong>Yield</strong> Aggregate page totals</span></div><div class="notice-recipe-grid"><section><h3>Ingredients</h3><p>${esc(t.facts[0].plain)}</p></section><section><h3>Method</h3><p>${esc(t.facts[1].plain)}</p></section></div><div class="notice-recipe-result"><h3>Storage</h3><p>${esc(t.facts[2].plain)}</p></div><p class="notice-recipe-choice"><strong>Purpose and choice.</strong> ${esc(t.facts[3].plain)}</p></div>`;
  return content;
}
const factParagraph=(t,f)=>`<p data-notice-fact="${t.id}.${f.id}"><strong>${esc(f.label)}.</strong> ${esc(f.formal)}</p>`;
function formalContent(t) {
  const paragraphs=t.facts.map(f=>factParagraph(t,f));
  if(['shop','specifics','rights'].includes(t.id)) {
    const name={shop:'shop',specifics:'records-archive',rights:'rights-correspondence'}[t.id];
    const rest=t.id==='specifics'?`<div class="pn-specs">${t.facts.slice(2).map(f=>`<section class="pn-spec" data-notice-fact="${t.id}.${f.id}"><h3 class="pn-spec-h">${esc(f.label)}</h3><p>${esc(f.formal)}</p></section>`).join('')}</div>`:paragraphs.slice(2).join('');
    return `<div class="pe-feature-opening"><div class="pe-feature-intro">${paragraphs.slice(0,2).join('')}</div>${art(name)}</div><div class="pe-feature-body">${rest}</div>`;
  }
  if(t.id==='subscribe') return `<div class="pe-dispatch-columns">${[paragraphs.slice(0,2).join(''),paragraphs[2]+art('courier-pigeon-cool','pe-news-art pe-dispatch-courier'),paragraphs.slice(3).join('')].map(p=>`<div class="pe-dispatch-column">${p}</div>`).join('')}</div>`;
  if(t.id==='children') return paragraphs.join('')+art('adult-pigeon-cool','pe-news-art pe-adult-pigeon');
  return paragraphs.join('');
}
const formal=t=>formalContent(t);
function visual(t) {
  if(t.id==='tools') return `<figure data-explanation-visual><figcaption>Two separate paths</figcaption><div data-explanation-cards="two"><div><small>Tool input</small><strong>Text, files, settings → your browser</strong><span>Processing stays on your device.</span></div><div><small>Page request</small><strong>Connection details → host</strong><span>Loads and protects the application.</span></div></div></figure>`;
  if(t.id==='subscribe') return `<figure data-explanation-visual><figcaption>Two decisions in this fictional example</figcaption><div data-explanation-cards="two"><div><small>Newsletter signup</small><strong>Receive the email</strong><span>The delivery choice.</span></div><div><small>Separate tracking choice</small><strong>Measure opens and clicks</strong><span>Signup alone does not enable it.</span></div></div></figure>`;
  if(t.id==='shop') return `<figure data-explanation-visual><figcaption>From checkout to delivery</figcaption><ol data-explanation-steps><li><strong>Pay</strong><span>Card details go to the payment provider.</span></li><li><strong>Pack</strong><span>The publisher receives order and payment status.</span></li><li><strong>Deliver</strong><span>The carrier receives delivery details.</span></li></ol></figure>`;
  if(t.id==='analytics') return `<figure data-explanation-visual><figcaption>From an event to a count</figcaption><div data-explanation-pipeline><div><small>Event records</small><strong>${example.logs}</strong><span>Page and connection categories</span></div><span aria-hidden="true">→</span><div><small>Aggregate totals</small><strong>${example.engagement}</strong><span>Page and source statistics</span></div></div></figure>`;
  return '';
}
const glossary={
  tools:['PrivacyDemoLocalCopies','What counts as a local copy?'],
  subscribe:['PrivacyDemoSuppressionRecord','Why keep an opt-out record?'],
  others:['PrivacyDemoProviderRoles','Processor or independent controller?'],
  rights:['PrivacyDemoRightConditions','Why can a right have conditions?']
};
function exampleExpansion(t) {
  const facts=t.facts.map(f=>`<div data-notice-plain-fact="${t.id}.${f.id}"><dt>${esc(f.label)}</dt><dd>${esc(f.plain)}</dd></div>`).join('');
  return `<section><h2>:x ${exampleId(t)}</h2><p><strong>Example Studio · fictional wording</strong></p><dl data-explanation-${t.id==='specifics'?'cards="two"':'record'}>${facts}</dl></section>`;
}
function lessonBody(t, interactive=true) {
  const l=lessons[t.id];
  const nested=glossary[t.id];
  return `<p class="notice-takeaway"><span data-explanation-mark="highlight">${esc(l.why)}</span></p><div data-explanation-cards="two"><div><small>Include</small><strong>${esc(l.includeTitle)}</strong><p>${esc(l.include)}</p></div><div><small>Drafting pitfall</small><strong><span data-explanation-mark="underline">${esc(l.avoidTitle)}</span></strong><p>${esc(l.avoid)}</p></div></div>${visual(t)}<p><strong>Legal driver.</strong> ${esc(l.driver)}</p><p class="notice-lesson-sources">${l.refs.map(([label,url])=>`<a href="${esc(url)}">${esc(label)}</a>`).join(' · ')}</p>${interactive&&nested?`<p><a href="#${nested[0]}">:${nested[1]}</a></p>`:''}${interactive?`<p><a href="#${exampleId(t)}">:Inspect the example wording</a></p>`:''}`;
}
const expansion=t=>`<section><h2>:x ${nutshellId(t)}</h2>${lessonBody(t)}</section>`;
const glossarySources=`
<section><h2>:x PrivacyDemoLocalCopies</h2><p>A local copy is kept on your device: browser storage, a downloaded file, or an email already delivered to your inbox. <span data-explanation-mark="underline">Deleting an account does not reach into your device.</span> Use the tool’s reset, browser storage controls, or file controls for those copies.</p></section>
<section><h2>:x PrivacyDemoSuppressionRecord</h2><p>After deletion, a small record of your email address and opt-out can prevent an accidental resubscription. It has one job: <span data-explanation-mark="highlight">remember not to email you</span>. It is not permission to keep the rest of your profile.</p></section>
<section><h2>:x PrivacyDemoProviderRoles</h2><div data-explanation-cards="two"><div><strong>Processor</strong><p>Handles information on the publisher’s instructions for an agreed service.</p></div><div><strong>Independent controller</strong><p>Decides its own purposes for certain information, such as a payment provider meeting its own legal duties.</p></div></div><p data-explanation-mark="bracket">One provider can have different roles for different activities. The role follows the activity, not just the company name.</p></section>
<section><h2>:x PrivacyDemoRightConditions</h2><p>A right applies to particular information and circumstances. For example, deleting a shopping account may leave tax records that must legally be retained. <span data-explanation-mark="underline">An exception needs a reason tied to the actual records.</span> It is not a blanket reason to deny a request.</p></section>`;

// The comparison consumes the actual two edition strings, not a third example.
const engagement=topics.find(t=>t.id==='subscribe').facts.find(f=>f.id==='engagement');
const comparison=`<section><h2>:x PrivacyDemoComparison</h2><p>Different wording must preserve the same promise: <span data-explanation-mark="highlight">email tracking needs a separate choice</span>.</p><div data-explanation-cards="two"><div><strong>The detailed wording</strong><p>${esc(engagement.formal).replace('Where separate consent has been provided','<span data-explanation-mark="underline">Where separate consent has been provided</span>')}</p></div><div><strong>The plain-language wording</strong><p>${esc(engagement.plain).replace('Only with separate consent','<span data-explanation-mark="highlight">Only with separate consent</span>').replace(esc(example.engagement),`<span data-explanation-mark="circle">${example.engagement}</span>`)}</p></div></div><p>Same opens and clicks. Same subscriber connection. Same purpose and retention limit. Neither version treats newsletter signup as permission to track engagement.</p><p>When rewriting, keep the conditions and limits. Complex language is not a compliance requirement: <a href="${lessonSources.drafting}">clear, accessible wording is part of the job</a>.</p></section>`;

const opening=`<header class="notice-intro tool-workspace" id="pe-start" aria-labelledby="notice-title"><div class="page-identity notice-page-identity"><span class="page-emblem"><img src="/assets/work/privacy-notice.svg" width="80" height="80" alt=""></span><div class="page-heading-copy"><h1 class="page-title" id="notice-title">Anatomy of a Privacy <span class="page-title-end">Notice<span class="title-strokes" aria-hidden="true"></span></span></h1><p class="page-subtitle">Learn what belongs in a privacy notice, and why.</p></div></div><div class="notice-intro-controls"><nav class="pe-editions" aria-label="Choose a reading edition" hidden><a href="?edition=full" data-pe-edition="full">${editionIcon('newspaper')}<span class="pe-edition-copy"><strong>Newspaper</strong><span>Detailed notice</span></span></a><a href="?edition=plain" data-pe-edition="plain">${editionIcon('circular')}<span class="pe-edition-copy"><strong>Grocery flyer</strong><span>Plain language</span></span></a></nav></div><p class="notice-example-note">Example Studio is fictional. Open a lesson to learn what to include and why. Legal examples use the EU GDPR, with UK and US rules where labeled. <a href="/privacy">This portfolio’s actual privacy notice.</a></p>${art('sunday-pair','notice-intro-art',true)}<p class="notice-comparison-link"><a href="#PrivacyDemoComparison">:Compare one fact, side by side</a></p><noscript><p>The detailed example and the writing lessons are available below. JavaScript enables edition switching and inline lessons.</p></noscript></header>`;
const rail=`<aside class="pe-topic-rail" aria-label="Explore the sections"><p class="pe-kicker">Explore the sections</p><nav aria-label="Notice topics">${topics.map(t=>`<a href="#pn-${t.id}" data-pe-topic-link>${esc(t.rail)}</a>`).join('')}</nav></aside>`;
const news=`<nav class="pe-news-briefs" aria-label="Four everyday activities">${[['reading','Reading','Public articles, no account required.'],['tools','Browser tools','Inputs are processed on your device.'],['subscribe','Newsletter','Optional email, separate engagement choice.'],['shop','Shopping','Payments, orders, and delivery.']].map(([id,label,text])=>`<a href="#pn-${id}"><span>${label}</span>${text}</a>`).join('')}</nav>`;
const providers=`<div class="pe-provider-spread">${[['game-day-soda','Pages & accounts','Hosting and access'],['game-day-chips','Newsletter','Email delivery'],['game-day-pretzels','Readership','Visit statistics'],['game-day-sausages','Orders','Payments and delivery']].map(([a,label,name])=>`<div class="pe-provider"><p class="pe-provider-label">${label}</p>${art(a,'pe-food')}<h3>${name}</h3></div>`).join('')}</div>`;
const coupon=`<aside class="pe-membership-promo" aria-label="Illustrative newsletter coupon"><div class="pe-coupon-heading"><span>Publisher’s coupon</span><span>Example Studio</span></div><div class="pe-coupon-main"><div class="pe-coupon-offer"><div class="pe-coupon-price-row"><span class="pe-promo-price">$0</span>${art('coupon-plane','pe-coupon-plane')}</div><p class="pe-coupon-title">The newsletter</p><p class="pe-coupon-benefits">Optional. Free. No payment details.</p></div>${art('bread','pe-food')}</div><div class="pe-coupon-footer">${couponBarcode}<p>Illustrative offer · no signup form.<br>Public articles and tools stay open.</p></div></aside>`;
const replacements={opening:'',rail,providers,coupon,'news-briefs':news,ending:`<footer class="pe-ending"><p><strong>Example Studio · fictional notice example</strong><br>Example contact: ${example.contact} · not monitored</p><a href="#pe-start">Back to the guide ↑</a></footer>`};
for(const t of topics) {
  replacements[`title-${t.id}`]=esc(t.title);
  replacements[`heading-${t.id}`]=`<div class="pe-story-heading"><p class="pe-kicker">${esc(t.label)}</p><h2><span class="pe-full-name">${esc(t.title)}</span><span class="pe-plain-name">${esc(t.short)}</span></h2></div>`;
  replacements[`brief-${t.id}`]=plain(t);
  replacements[`detail-${t.id}`]=formal(t);
  replacements[`lesson-${t.id}`]=`<div class="notice-lesson"><p class="notice-expand-line">${openLink(t)}</p></div>`;
}
// Teaching rows sit outside newspaper columns and feature/art grids.
let body=read('templates/notice.html').replace(/({{detail-([^}]+)}}<\/div><\/details>)(<\/section>)/g,'$1{{lesson-$2}}$3').replace(/{{([^}]+)}}/g,(_,key)=>{
  if(!(key in replacements)) throw new Error('Unknown template value '+key); return replacements[key];
}).replaceAll('<details class="pe-detail" open>','<div class="pe-detail">').replaceAll('</details>','</div>');
// Only the standard portfolio frame is shared. The migrated artifact owns its interior.
const frame=fs.readFileSync(path.join(root,'preview/frame.html'),'utf8');
const header=frame.match(/<header class="site-header">[\s\S]*?<\/header>/)[0].replace(/ aria-current="page"/g,'');
const footer=frame.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Anatomy of a Privacy Notice — Ben Tan</title><meta name="description" content="Learn how to craft a privacy notice. Explore a fictional example, section-writing lessons, legal drivers, and aligned detailed and plain-language editions."><link rel="icon" href="/assets/bt-soft-upright-01-rounded-favicon.svg"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/guides/privacy-notice/editions.css"><link rel="stylesheet" href="/explanations.css"><link rel="stylesheet" href="/guides/privacy-notice/notice.css"><script src="/landing.js" defer></script></head>
<body class="notice-page-shell" data-explanation-root><a class="skip-link" href="#main">Skip to the privacy notice guide</a>${header}<main class="page-container page-content" id="main"><div data-notice-content>${opening}${body}<noscript><section class="notice-lessons-fallback"><h2>Writing the sections</h2>${topics.map(t=>`<section><h3>${esc(lessons[t.id].question)}</h3>${lessonBody(t,false)}</section>`).join('')}</section></noscript><div class="notice-sources" aria-hidden="true">${topics.map(expansion).join('')}${topics.map(exampleExpansion).join('')}${glossarySources}</div></div></main>${footer}<script src="/vendor/nutshell/nutshell.js"></script><script src="/guides/privacy-notice/config.js"></script><script type="module" src="/guides/privacy-notice/notice.js"></script></body></html>`;
fs.mkdirSync(out,{recursive:true});
const revisedArt=[]; // External runtime assets are supplied separately; no source-art copying.
fs.writeFileSync(path.join(out,'index.html'),html.replace(`${glossarySources}</div></div></main>`,`${glossarySources}${comparison}</div></div></main>`));
for(const file of ['notice.css','notice.js','config.js']) fs.copyFileSync(path.join(here,'source',file),path.join(out,file));
// The original artwork is static. Exempt the newly added explanation UI from
// its global animation freeze so the shared Rough Notation adapter can draw.
const frozen='.pe *, .pe *::before, .pe *::after{animation:none!important;transition:none!important}';
const except='.pe :not(.nutshell-bubble,.nutshell-bubble *,.nutshell-expandable,.nutshell-expandable *)';
fs.writeFileSync(path.join(out,'editions.css'),read('source/editions.css').replace(frozen,`${except},${except}::before,${except}::after{animation:none!important;transition:none!important}`));
const sum=content=>createHash('sha256').update(content).digest('hex');
fs.writeFileSync(path.join(here,'BUILD-MANIFEST.json'),JSON.stringify({
  schema:1,route:'/guides/privacy-notice/',topics:topics.length,facts:topics.reduce((n,t)=>n+t.facts.length,0),
  sourceScope:'sanitized public source snapshot',sharedFrameSource:'preview/frame.html',
  sharedFrameSha256:sum(header+footer),factsSha256:sum(read('source/facts.mjs')),lessonsSha256:sum(read('source/lessons.mjs')),legalSourcesChecked:'2026-10-20',
  outputSha256:sum(fs.readFileSync(path.join(out,'index.html'))),factIds:topics.flatMap(t=>t.facts.map(f=>`${t.id}.${f.id}`)),
  generatedFiles:['index.html','editions.css','notice.css','notice.js','config.js',...revisedArt.map(a=>'art/'+path.basename(a.runtime))].map(name=>({file:'site/guides/privacy-notice/'+name,sha256:sum(fs.readFileSync(path.join(out,name)))})),
  sharedDependencies:['styles.css','explanations.css','explanation-annotations.js','vendor/nutshell/nutshell.js','vendor/rough-notation/rough-notation.esm.js'].map(name=>({file:'site/'+name,sha256:sum(fs.readFileSync(path.join(root,'site',name)))}))
},null,2)+'\n');
console.log(`Built ${topics.length} topics / ${topics.reduce((n,t)=>n+t.facts.length,0)} paired facts at ${out}`);
