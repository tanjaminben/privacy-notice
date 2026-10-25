import { explanations } from '/explanation-annotations.js';

const root=document.querySelector('[data-privacy-editions]');
const content=document.querySelector('[data-notice-content]');
const topics=[...root.querySelectorAll('[data-pe-topic]')];
const links=[...root.querySelectorAll('[data-pe-topic-link]')];
const edition=new URL(location.href).searchParams.get('edition')==='full'?'full':'plain';
root.dataset.edition=edition;
root.dataset.ready='true';
content.querySelectorAll('.pe-editions').forEach(el=>el.hidden=false);
content.querySelectorAll('[data-pe-edition]').forEach(link=>{
  if(link.dataset.peEdition===edition) link.setAttribute('aria-current','page');
});
// Actual navigations preserve browser Back, reload, and Nutshell's page-URL cache.
// The current topic travels with an edition change; no preference storage is needed.
function currentTopic() {
  const addressed=topics.find(el=>'#'+el.id===location.hash);
  if(addressed) {
    const rect=addressed.getBoundingClientRect();
    if(rect.top<innerHeight*.5&&rect.bottom>innerHeight*.38) return addressed.id;
  }
  const above=topics.filter(el=>el.getBoundingClientRect().top<=innerHeight*.38);
  return above.at(-1)?.id||'';
}
function editionURL(value) {
  const url=new URL(location.href);
  url.searchParams.set('edition',value);
  url.hash=currentTopic()||(topics.some(el=>'#'+el.id===location.hash)?location.hash:'');
  return url;
}
content.querySelectorAll('[data-pe-edition]').forEach(link=>link.addEventListener('click',()=>{
  link.href=editionURL(link.dataset.peEdition).href;
}));
explanations.start(content);
let frame;
function updateRail() {
  frame=0;
  const id=currentTopic();
  links.forEach(link=>{
    if(link.hash==='#'+id) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
}
addEventListener('scroll',()=>{if(!frame) frame=requestAnimationFrame(updateRail);},{passive:true});
updateRail();
links.forEach(link=>link.addEventListener('click',()=>{
  document.querySelector(link.hash)?.focus({preventScroll:true});
}));
// Source art layers share the original layout's movement. Respect reduced motion.
root.querySelector('[data-pe-announcement]').textContent=`${edition==='plain'?'Plain-language grocery flyer':'Detailed newspaper'} edition. Fifteen topics describe the same fictional practices.`;
