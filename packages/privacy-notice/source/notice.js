import { explanations } from '/explanation-annotations.js';

const root=document.querySelector('[data-privacy-editions]');
const content=document.querySelector('[data-notice-content]');
const topics=[...root.querySelectorAll('[data-pe-topic]')];
const links=[...root.querySelectorAll('[data-pe-topic-link]')];
const edition=new URL(location.href).searchParams.get('edition')==='full'?'full':'plain';
root.dataset.edition=edition;
root.classList.toggle('grocery',edition==='plain');
root.classList.toggle('newspaper',edition==='full');
root.dataset.ready='true';
content.querySelectorAll('.pe-editions').forEach(el=>el.hidden=false);
content.querySelectorAll('[data-pe-edition]').forEach(link=>{
  if(link.dataset.peEdition===edition) link.setAttribute('aria-current','page');
});
// Edition controls live at the top. Their native links start the other edition
// at the top too, without carrying a stale section fragment across.
function currentTopic() {
  const addressed=topics.find(el=>'#'+el.id===location.hash);
  if(addressed) {
    const rect=addressed.getBoundingClientRect();
    if(rect.top<innerHeight*.5&&rect.bottom>innerHeight*.38) return addressed.id;
  }
  const above=topics.filter(el=>el.getBoundingClientRect().top<=innerHeight*.38);
  return above.at(-1)?.id||'';
}
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
root.querySelector('[data-pe-announcement]').textContent=`${edition==='plain'?'Plain-language grocery flyer':'Detailed newspaper'} edition. Fifteen topics describe the same fictional practices.`;
