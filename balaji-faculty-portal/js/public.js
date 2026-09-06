import { db } from './firebase.js';
import {
  collection, getDocs, getDoc, doc, query, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const safe = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'short', year:'numeric' }).format(d);
}
function isNew(ts) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Date.now() - d.getTime() <= 48 * 60 * 60 * 1000;
}
function docButton(item) {
  if (item.url) return `<a class="small-link" href="${safe(item.url)}" target="_blank" rel="noopener">Open ↗</a>`;
  return '';
}

async function loadAllContent() {
  const q = query(collection(db, 'content'), orderBy('publishedAt', 'desc'), limit(250));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}
async function loadSubjects() {
  const snap = await getDocs(collection(db, 'subjects'));
  return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (a.order ?? 999) - (b.order ?? 999));
}

async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'main'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function init() {
  $('#year').textContent = new Date().getFullYear();
  const settings = await loadSiteSettings();
  if (settings.profileUrl) {
    $('#heroProfile').src = settings.profileUrl;
    $('#profileSectionImage').src = settings.profileUrl;
  }
  if (settings.heroUrl) {
    $('.hero').style.setProperty('--hero-image', `url("${settings.heroUrl.replace(/"/g, '\\"')}")`);
  }

  try {
    const [content, subjects] = await Promise.all([loadAllContent(), loadSubjects()]);
    renderUpdates(content);
    renderAcademics(subjects);
    renderQuestionPapers(content, subjects);
    renderResources(content);
    renderResearch(content);
  } catch (err) {
    console.error(err);
    $('#homeUpdates').innerHTML = '<span class="muted">Academic updates are being prepared.</span>';
  }

  try {
    const mediaSnap = await getDocs(query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(80)));
    const media = mediaSnap.docs.map(d => ({id:d.id,...d.data()}));
    renderGallery(media);
  } catch (err) {
    console.error(err);
  }

  setupNavigation();
  observeReveals();
}

function renderUpdates(content) {
  const items = content.filter(x => x.category === 'notification' || x.category === 'resource').slice(0, 4);
  $('#homeUpdates').innerHTML = items.length ? items.map(x => `<a href="${safe(x.url || '#resources')}" ${x.url?'target="_blank" rel="noopener"':''}><span class="update-item">${isNew(x.publishedAt)?'<b class="new-badge">NEW</b>':''} ${safe(x.title)}</span><small>${fmtDate(x.publishedAt)}</small></a>`).join('') : '<span class="muted">No recent updates.</span>';
}

function renderAcademics(subjects) {
  const theory = subjects.filter(x => x.kind === 'theory');
  const labs = subjects.filter(x => x.kind === 'lab');
  $('#theoryGrid').innerHTML = theory.length ? theory.map((s,i) => `<a class="subject-card" href="#students" data-subject="${safe(s.id)}"><span class="num">${String(i+1).padStart(2,'0')}</span><strong>${safe(s.name)}</strong><small>Theory subject · notes & materials</small><i>→</i></a>`).join('') : emptyCard('Theory subjects will be published here.');
  $('#labGrid').innerHTML = labs.length ? labs.map((s,i) => `<a class="subject-card lab" href="#students" data-subject="${safe(s.id)}"><span class="num">${String(i+1).padStart(2,'0')}</span><strong>${safe(s.name)}</strong><small>Practical / Lab · manuals & programs</small><i>→</i></a>`).join('') : emptyCard('Practical / Lab subjects will be published here.');
}
function emptyCard(text){ return `<div class="empty-card">${safe(text)}</div>`; }

function renderQuestionPapers(content, subjects) {
  const qps = content.filter(x=>x.category==='qp');
  const years = [...new Set(qps.map(x=>x.year).filter(Boolean))].sort().reverse();
  const tabs = $('#qpYears');
  if (!years.length) { tabs.innerHTML=''; $('#qpList').innerHTML=emptyCard('Question papers will appear here after publication.'); return; }
  tabs.innerHTML = years.slice(0,8).map((y,i)=>`<button class="year-tab ${i===0?'active':''}" data-year="${safe(y)}">${safe(y)}</button>`).join('');
  const draw = year => {
    const list = qps.filter(x=>x.year===year);
    $('#qpList').innerHTML = list.length ? list.map(x=>`<div class="qp-row"><div><strong>${safe(x.title)}</strong><small>${safe(x.subjectName||'')} · ${safe(x.paperType||'Theory')}</small></div>${docButton(x)}</div>`).join('') : emptyCard('No question papers published for this year.');
  };
  draw(years[0]);
  $$('.year-tab').forEach(b=>b.addEventListener('click',()=>{ $$('.year-tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); draw(b.dataset.year); }));
}

function renderResources(content) {
  const list = content.filter(x=>['resource','notification'].includes(x.category)).slice(0,20);
  $('#resourceList').innerHTML = list.length ? list.map(x=>`<div class="resource-row"><div class="resource-date">${x.publishedAt?fmtDate(x.publishedAt):''}</div><div class="resource-copy"><strong>${safe(x.title)} ${isNew(x.publishedAt)?'<b class="new-badge">NEW</b>':''}</strong><small>${safe(x.description||'Academic resource')}</small></div>${docButton(x)}</div>`).join('') : emptyCard('No resources have been published yet.');
}
function renderResearch(content) {
  const list = content.filter(x=>x.category==='research').slice(0,12);
  $('#researchList').innerHTML = list.length ? list.map(x=>`<article class="content-card"><span>${safe(x.type||'Research')}</span><h3>${safe(x.title)}</h3><p>${safe(x.description||'')}</p>${docButton(x)}</article>`).join('') : '<article class="content-card"><span>RESEARCH</span><h3>Research information will be published here.</h3><p>Publications, projects, conferences, FDPs and research interests can be added through the administration portal.</p></article>';
}
function renderGallery(media) {
  const list = media.filter(x=>x.kind==='gallery' || x.kind==='university' || x.kind==='department').slice(0,12);
  $('#galleryGrid').innerHTML = list.length ? list.map(x=>`<figure class="gallery-item"><img src="${safe(x.url)}" alt="${safe(x.caption||x.title||'Academic photograph')}" loading="lazy"><figcaption><strong>${safe(x.title||'Academic event')}</strong><small>${safe(x.category||'Gallery')}</small></figcaption></figure>`).join('') : '<div class="empty-card">Gallery photographs will appear here.</div>';
}

function setupNavigation() {
  $('#menuBtn')?.addEventListener('click', () => $('#siteNav').classList.toggle('open'));
  $$('#siteNav a').forEach(a => a.addEventListener('click',()=>$('#siteNav').classList.remove('open')));
  window.addEventListener('scroll',()=>{
    const h=document.documentElement.scrollHeight-window.innerHeight;
    $('#progress').style.width=(h>0?(window.scrollY/h)*100:0)+'%';
  },{passive:true});
}
function observeReveals(){
  const els=$$('.section, .quick-card, .subject-card, .hub-card, .content-card, .gallery-item');
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08});
  els.forEach(e=>{e.classList.add('reveal');io.observe(e)});
}
init();
