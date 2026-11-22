const el = id => document.getElementById(id);
const make = (tag, text) => Object.assign(document.createElement(tag), {textContent:text || ''});
const storageKey = 'loreal-studio-selection';
let catalog = [], picked = new Set(), messages = [], busy = false;
try {picked = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));} catch {}
function controls() {
  el('generate').disabled = busy || !picked.size;
  el('clear').disabled = !picked.size;
  el('send').disabled = el('question').disabled = busy || !messages.length;
}
function save() {
  try {localStorage.setItem(storageKey, JSON.stringify([...picked]));} catch {el('status').textContent='Browser storage is unavailable.';}
  render();
}
function toggle(id) {if (picked.has(id)) picked.delete(id); else picked.add(id); save();}
function render() {
  const term = el('search').value.trim().toLowerCase();
  const shown = catalog.filter(p => (!el('category').value || el('category').value === p.category) && [p.brand,p.name,p.category,p.description].join(' ').toLowerCase().includes(term));
  el('grid').replaceChildren(); el('selected').replaceChildren();
  el('count').textContent = shown.length ? shown.length + ' products' : 'No matching products.';
  for (const p of shown) {
    const card = make('article'), button = make('button'), image = make('img');
    image.src=p.image; image.loading='lazy'; image.alt='';
    button.setAttribute('aria-pressed', picked.has(p.id));
    button.append(image,make('small',p.brand),make('h3',p.name),make('span',picked.has(p.id)?'✓ Selected':'+ Select'));
    button.onclick=()=>{toggle(p.id); document.getElementById('pick-'+p.id)?.focus({preventScroll:true});}; button.id='pick-'+p.id;
    const details=make('details'); details.append(make('summary','Description'),make('p',p.description));card.append(button,details);el('grid').append(card);
  }
  for (const p of catalog.filter(p=>picked.has(p.id))) {const b=make('button',p.brand+' · '+p.name+' ×');b.setAttribute('aria-label','Remove '+p.name);b.onclick=()=>toggle(p.id);el('selected').append(b);}
  if (!picked.size) el('selected').textContent='Your selection is empty.';
  controls();
}
el('category').onchange=el('search').oninput=render;
el('clear').onclick=()=>{picked.clear();save();};
el('direction').onclick=()=>{const rtl=document.documentElement.dir!=='rtl';document.documentElement.dir=rtl?'rtl':'ltr';el('direction').setAttribute('aria-pressed',rtl);};
async function ask(content, fresh) {
  if (busy) return;
  const prior=fresh?[]:messages, next=[...prior,{role:'user',content}];
  busy=true;controls();el('status').textContent='Your advisor is preparing a reply…';
  try {
    const response=await fetch('https://late-paper-f272.sgb5.workers.dev/api/routine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next})});
    const data=await response.json();if(!response.ok || !data.reply) throw Error(data.error || 'No reply received.');
    messages=[...next,{role:'assistant',content:data.reply}];
    if(fresh) el('chat').replaceChildren(); else el('chat').append(make('p','You · '+content));
    const reply=make('p',data.reply);reply.dir='auto';el('chat').append(reply);
    for(const source of data.sources || []) {if(!/^https?:\/\//i.test(source.url)) continue;const link=make('a',source.title || source.url);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';reply.append(link);}
    if(!fresh) el('question').value='';el('status').textContent='Ask about this routine, or generate a new one after changing your selection.';reply.scrollIntoView({block:'nearest'});
  } catch(error) {el('status').textContent=error.message+' Please try again.';} finally {busy=false;controls();}
}
el('generate').onclick=()=>ask('Build a routine using these selected products: '+JSON.stringify(catalog.filter(p=>picked.has(p.id)).map(({name,brand,category,description})=>({name,brand,category,description}))),true);
document.querySelector('form').onsubmit=e=>{e.preventDefault();const question=el('question').value.trim();if(question && messages.length) ask(question,false);};
async function init(){try{const response=await fetch('products.json');if(!response.ok) throw Error();catalog=(await response.json()).products;picked=new Set(catalog.filter(p=>picked.has(p.id)).map(p=>p.id));for(const category of [...new Set(catalog.map(p=>p.category))].sort()) el('category').add(new Option(category,category));render();}catch{el('count').textContent='The catalog could not load. Refresh to retry.';}}init();
