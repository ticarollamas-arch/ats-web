(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const api = p => new URL('api/' + p, document.baseURI).toString();
const KEY = 'ats-resume-v1';

const EMPTY = () => ({ basics: { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
  summary: '', experience: [], education: [], skills: [], certifications: [] });
let R = load();

function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.basics) return s; } catch (e) {} return EMPTY(); }
let saveT; function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) {} }, 300); }

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800); }

// DOM helper (sem innerHTML para conteúdo do usuário)
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

// ---------- abas
function showTab(id) {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
  $$('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + id));
  if (id === 'guia' && !guideLoaded) loadGuides();
  if (id === 'linkedin') liCheck();
  try { history.replaceState(null, '', '#' + id); } catch (e) {}
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });

// ---------- formulário
function field(label, get, set, opts = {}) {
  const inp = opts.area ? h('textarea', { rows: opts.rows || 3 }) : h('input', { type: opts.type || 'text', autocomplete: 'off' });
  inp.value = get() || '';
  if (opts.ph) inp.placeholder = opts.ph;
  inp.addEventListener('input', () => { set(inp.value); changed(); });
  return h('div', { class: 'f' }, h('label', {}, label), inp);
}
function rmBtn(fn) { return h('button', { class: 'btn sm ghost danger rm', type: 'button', onclick: fn }, 'Remover'); }

function renderForm() {
  const f = $('#form'); f.replaceChildren();
  const b = R.basics;
  f.append(h('fieldset', {}, h('legend', {}, 'Dados de contato'), h('div', { class: 'grid' },
    field('Nome completo', () => b.name, v => b.name = v),
    field('Título profissional', () => b.headline, v => b.headline = v, { ph: 'Ex.: Analista de Dados Sênior' }),
    field('E-mail', () => b.email, v => b.email = v, { type: 'email' }),
    field('Telefone', () => b.phone, v => b.phone = v, { ph: '(11) 91234-5678' }),
    field('Cidade/UF', () => b.location, v => b.location = v),
    field('LinkedIn', () => b.linkedin, v => b.linkedin = v, { ph: 'linkedin.com/in/seu-nome' }),
    field('GitHub / Portfólio', () => b.github, v => b.github = v),
    field('Site', () => b.website, v => b.website = v))));

  f.append(h('fieldset', {}, h('legend', {}, 'Resumo profissional'),
    field('2 a 4 linhas: quem é, maior resultado real, o que busca', () => R.summary, v => R.summary = v, { area: true, rows: 4 })));

  const list = (key, title, mk, itemFn, addLabel) => {
    const fs = h('fieldset', {}, h('legend', {}, title));
    (R[key] = R[key] || []).forEach((it, i) => {
      const box = h('div', { class: 'item' }, rmBtn(() => { R[key].splice(i, 1); renderForm(); changed(); }), itemFn(it));
      fs.append(box);
    });
    fs.append(h('button', { class: 'btn', type: 'button', onclick: () => { R[key].push(mk()); renderForm(); changed(); } }, '+ ' + addLabel));
    f.append(fs);
  };

  list('experience', 'Experiência profissional', () => ({ title: '', company: '', location: '', start: '', end: '', bullets: [] }), e =>
    h('div', {}, h('div', { class: 'grid' },
      field('Cargo', () => e.title, v => e.title = v), field('Empresa', () => e.company, v => e.company = v),
      field('Local', () => e.location, v => e.location = v),
      h('div', { class: 'grid' }, field('Início', () => e.start, v => e.start = v, { ph: 'Março 2021' }), field('Fim', () => e.end, v => e.end = v, { ph: 'Atual' }))),
      bulletsField('Conquistas — uma por linha (verbo + o que fez + resultado com número real)', e, 'bullets')), 'Adicionar experiência');

  list('education', 'Formação acadêmica', () => ({ degree: '', field: '', institution: '', location: '', end: '' }), e =>
    h('div', { class: 'grid' },
      field('Grau', () => e.degree, v => e.degree = v, { ph: 'Bacharelado' }), field('Curso', () => e.field, v => e.field = v),
      field('Instituição', () => e.institution, v => e.institution = v), field('Conclusão', () => e.end, v => e.end = v, { ph: '2018' })), 'Adicionar formação');

  const sk = h('fieldset', {}, h('legend', {}, 'Competências'));
  (R.skills = R.skills || []).forEach((g, i) => sk.append(h('div', { class: 'item' }, rmBtn(() => { R.skills.splice(i, 1); renderForm(); changed(); }),
    h('div', { class: 'grid' }, field('Categoria', () => g.category, v => g.category = v, { ph: 'Técnicas, Ferramentas, Idiomas…' }),
      field('Itens (separados por vírgula)', () => (g.items || []).join(', '), v => g.items = v.split(',').map(s => s.trim()).filter(Boolean))))));
  sk.append(h('button', { class: 'btn', type: 'button', onclick: () => { R.skills.push({ category: '', items: [] }); renderForm(); changed(); } }, '+ Adicionar grupo'));
  f.append(sk);

  list('certifications', 'Certificações', () => ({ name: '', issuer: '', year: '' }), c =>
    h('div', { class: 'grid' }, field('Nome', () => c.name, v => c.name = v), field('Emissor', () => c.issuer, v => c.issuer = v), field('Ano', () => c.year, v => c.year = v)), 'Adicionar certificação');
}
function bulletsField(label, obj, key) {
  const ta = h('textarea', { rows: 5 }); ta.value = (obj[key] || []).join('\n');
  ta.addEventListener('input', () => { obj[key] = ta.value.split('\n').map(s => s.trim()).filter(Boolean); changed(); });
  return h('div', { class: 'f' }, h('label', {}, label), ta);
}

// ---------- prévia e checagem rápida
function previewText() {
  const b = R.basics, o = [];
  o.push(b.name || '(sem nome)'); if (b.headline) o.push(b.headline);
  const c = ['phone', 'email', 'location', 'linkedin', 'github', 'website'].map(k => b[k]).filter(Boolean).join(' | '); if (c) o.push(c);
  if (R.summary) o.push('', 'RESUMO', R.summary);
  if ((R.experience || []).length) { o.push('', 'EXPERIÊNCIA'); R.experience.forEach(e => { o.push(`${e.title} — ${e.company}`); o.push([e.location, [e.start, e.end].filter(Boolean).join(' – ')].filter(Boolean).join(' | ')); (e.bullets || []).forEach(x => o.push('• ' + x)); o.push(''); }); }
  if ((R.skills || []).length) { o.push('COMPETÊNCIAS'); R.skills.forEach(g => o.push(`${g.category}: ${(g.items || []).join(', ')}`)); o.push(''); }
  if ((R.education || []).length) { o.push('FORMAÇÃO'); R.education.forEach(e => o.push(`${[e.degree, e.field].filter(Boolean).join(', ')} — ${e.institution}${e.end ? ' (' + e.end + ')' : ''}`)); o.push(''); }
  if ((R.certifications || []).length) { o.push('CERTIFICAÇÕES'); R.certifications.forEach(c => o.push([c.name, c.issuer, c.year].filter(Boolean).join(', '))); }
  return o.join('\n').trim();
}
function quick() {
  const b = R.basics, items = [];
  const add = (lvl, t) => items.push([lvl, t]);
  add(b.name ? 'ok' : 'err', b.name ? 'Nome preenchido' : 'Falta o nome');
  add(b.email ? 'ok' : 'err', b.email ? 'E-mail no corpo do documento' : 'Falta o e-mail');
  add(b.phone ? 'ok' : 'warn', b.phone ? 'Telefone preenchido' : 'Sem telefone');
  const bl = (R.experience || []).flatMap(e => e.bullets || []);
  if (!(R.experience || []).length) add('err', 'Nenhuma experiência adicionada');
  else {
    const q = bl.filter(x => /\d/.test(x)).length;
    const pct = bl.length ? Math.round(100 * q / bl.length) : 0;
    add(pct >= 60 ? 'ok' : pct >= 30 ? 'warn' : 'err', `${pct}% das conquistas têm número (meta ≥ 60%)`);
    const long = bl.filter(x => x.length > 260).length; if (long) add('warn', `${long} conquista(s) com mais de 260 caracteres`);
    const weak = bl.filter(x => /^(respons[aá]vel|auxili|ajud|atuei|participei)/i.test(x)).length; if (weak) add('warn', `${weak} conquista(s) começam com verbo fraco`);
  }
  add(R.summary ? 'ok' : 'warn', R.summary ? 'Resumo presente' : 'Sem resumo profissional');
  add((R.skills || []).length ? 'ok' : 'warn', (R.skills || []).length ? 'Seção de competências presente' : 'Sem competências');
  add((R.education || []).length ? 'ok' : 'warn', (R.education || []).length ? 'Formação presente' : 'Sem formação');
  return items;
}
function refresh() {
  $('#preview').textContent = previewText();
  $('#quick').replaceChildren(...quick().map(([l, t]) => h('li', { class: l }, t)));
}
let jsonFocus = false;
function changed() { save(); refresh(); if (!jsonFocus) $('#json').value = JSON.stringify(R, null, 2); }

// ---------- ações
async function post(path, body, isBlob) {
  const r = await fetch(api(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { let m = 'Erro ' + r.status; try { m = (await r.json()).error || m; } catch (e) {} throw new Error(m); }
  return isBlob ? r.blob() : r.json();
}
async function download(fmt, btn) {
  btn.disabled = true;
  try {
    const blob = await post('render', { resume: R, format: fmt, lang: $('#lang').value }, true);
    const a = h('a', { href: URL.createObjectURL(blob), download: `${(R.basics.name || 'Curriculo').replace(/[^\w]+/g, '-')}-Curriculo.${fmt}` });
    document.body.append(a); a.click(); a.remove(); toast('Arquivo gerado.');
  } catch (e) { toast(e.message); } finally { btn.disabled = false; }
}
$('#dlPdf').onclick = e => download('pdf', e.target);
$('#dlDocx').onclick = e => download('docx', e.target);
$('#loadEx').onclick = async () => { if (!confirm('Substituir o currículo atual pelo exemplo (fictício)?')) return; R = await (await fetch(api('example'))).json(); renderForm(); changed(); toast('Exemplo carregado.'); };
$('#clear').onclick = () => { if (confirm('Apagar todo o currículo?')) { R = EMPTY(); renderForm(); changed(); } };
$('#expJson').onclick = () => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(R, null, 2)], { type: 'application/json' })), download: 'curriculo.json' }); a.click(); };
$('#impJson').onclick = () => $('#jsonFile').click();
$('#jsonFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { applyObj(JSON.parse(await f.text())); } catch (x) { toast('JSON inválido.'); } e.target.value = ''; };
function applyObj(o) { if (!o || typeof o !== 'object' || !o.basics) throw 0; R = Object.assign(EMPTY(), o); renderForm(); changed(); toast('Currículo carregado.'); }
$('#json').addEventListener('focus', () => jsonFocus = true); $('#json').addEventListener('blur', () => jsonFocus = false);
$('#applyJson').onclick = () => { try { applyObj(JSON.parse($('#json').value)); } catch (e) { toast('JSON inválido ou sem "basics".'); } };

// ---------- análise
const pct = n => Math.max(0, Math.min(100, n));
function meter(label, v) { return h('div', {}, h('div', { class: 'mrow' }, h('span', {}, label), h('b', {}, v + '%')), h('div', { class: 'bar' }, h('i', { style: `width:${pct(v)}%` }))); }
function tags(arr, cls) { return h('div', { class: 'tags' }, arr.length ? arr.map(t => h('span', { class: 'tag ' + cls }, t)) : h('span', { class: 'muted' }, 'nenhuma')); }
$('#runAnalyze').onclick = async e => {
  const btn = e.target; btn.disabled = true;
  try {
    let source = null; const st = $('#source').value.trim(); if (st) { try { source = JSON.parse(st); } catch (x) { throw new Error('JSON do perfil original inválido.'); } }
    const d = await post('analyze', { resume: R, jd: $('#jd').value, source });
    const out = $('#analysis'); out.replaceChildren();
    if (d.coverage) {
      const c = d.coverage, k = c.components;
      out.append(h('div', { class: 'card' }, h('h3', {}, 'Estimativa de adequação à vaga'),
        h('div', { class: 'score' }, h('div', { class: 'big' }, c.estimated_score_pct + '%'), h('span', { class: 'band ' + c.band }, { strong: 'forte', moderate: 'moderada', weak: 'fraca' }[c.band])),
        h('p', { class: 'muted' }, 'Estimativa de palavras-chave e qualidade — não é a nota interna de nenhum ATS.'),
        meter('Palavras obrigatórias', k.required_coverage_pct), meter('Palavras desejáveis', k.preferred_coverage_pct),
        meter('Conquistas quantificadas', k.quantification_rate_pct), meter('Seções completas', k.section_completeness_pct), meter('Palavras bem distribuídas', k.keyword_distribution_pct),
        h('h3', {}, 'Faltam (obrigatórias)'), tags(c.missing_required_keywords, 'miss'),
        h('h3', {}, 'Faltam (desejáveis)'), tags(c.missing_preferred_keywords, 'pref'),
        h('p', { class: 'muted' }, 'Adicione só o que você realmente domina: em Competências e dentro de uma conquista real. Sem copiar a vaga, sem texto escondido.')));
    } else out.append(h('div', { class: 'card empty' }, 'Cole uma vaga para ver a cobertura de palavras-chave. A checagem de clichês e veracidade abaixo roda mesmo assim.'));
    const sl = d.slop.slop_findings || [];
    out.append(h('div', { class: 'card' }, h('h3', {}, 'Clichês, verbos inflados e enrolação'),
      sl.length ? sl.map(f => h('div', { class: 'alert warn' }, `“${f.found}” `, h('small', {}, `${f.location} · ${f.type} → ${f.suggest}`))) : h('div', { class: 'alert ok' }, 'Nada encontrado.')));
    const v = d.validate;
    out.append(h('div', { class: 'card' }, h('h3', {}, 'Veracidade e estrutura'),
      v.invariants_passed ? h('div', { class: 'alert ok' }, 'Invariantes passaram.') : null,
      (v.failures || []).map(x => h('div', { class: 'alert error' }, x)), (v.warnings || []).map(x => h('div', { class: 'alert warn' }, x)),
      source ? null : h('p', { class: 'muted' }, 'Informe o perfil original para comparar empregadores, cargos e datas.')));
  } catch (x) { toast(x.message); } finally { btn.disabled = false; }
};

// ---------- auditoria de arquivo
let auditFile = null;
const drop = $('#drop');
function setAuditFile(f) { auditFile = f; $('#dropTxt').textContent = f ? `${f.name} (${Math.round(f.size / 1024)} KB)` : 'Arraste o arquivo aqui ou clique para escolher'; }
$('#auditFile').onchange = e => setAuditFile(e.target.files[0]);
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => setAuditFile(e.dataTransfer.files[0]));
$('#runAudit').onclick = async e => {
  if (!auditFile) return toast('Escolha um arquivo .pdf ou .docx.');
  const btn = e.target; btn.disabled = true;
  try {
    const fd = new FormData(); fd.append('file', auditFile); fd.append('jd', $('#auditJd').value);
    const r = await fetch(api('audit'), { method: 'POST', body: fd });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
    const out = $('#auditOut'); out.replaceChildren(
      h('div', { class: 'card' }, h('h3', {}, 'Resultado: ' + d.verdict),
        h('p', { class: 'muted' }, `${d.kind.toUpperCase()} · ${d.pages ? d.pages + ' pág. · ' : ''}${d.words} palavras · ${d.errors} crítico(s) · ${d.warnings} aviso(s)`),
        d.items.map(i => h('div', { class: 'alert ' + (i.level === 'warn' ? 'warn' : i.level), }, i.message, i.fix ? h('small', {}, '→ ' + i.fix) : null)),
        h('p', { class: 'muted' }, d.note)),
      d.coverage ? h('div', { class: 'card' }, h('h3', {}, 'Cobertura de palavras-chave da vaga'), meter('Obrigatórias', d.coverage.required_pct), meter('Desejáveis', d.coverage.preferred_pct),
        h('b', {}, 'Faltam (obrigatórias)'), tags(d.coverage.missing_required, 'miss'), h('b', {}, 'Faltam (desejáveis)'), tags(d.coverage.missing_preferred, 'pref')) : null,
      h('details', { class: 'card' }, h('summary', {}, 'Texto como o ATS enxerga (extraído do arquivo)'), h('pre', { class: 'preview' }, d.extracted_text || '(vazio)')));
  } catch (x) { toast(x.message); } finally { btn.disabled = false; }
};

// ---------- LinkedIn
function liCheck() {
  $$('.cnt').forEach(c => { const t = $('#' + c.dataset.for), n = t.value.length, m = +c.dataset.max; c.textContent = `${n}/${m}`; c.classList.toggle('over', n > m); });
  const hd = $('#li_head').value, ab = $('#li_about').value, sk = $('#li_skills').value.split(',').map(s => s.trim()).filter(Boolean);
  const it = [];
  const add = (ok, t, warn) => it.push([ok ? 'ok' : warn ? 'warn' : 'err', t]);
  add(hd.length > 0 && hd.length <= 220, 'Título até 220 caracteres', hd.length === 0);
  add(hd.includes('|') || hd.includes('•') || hd.length > 40, 'Título com cargo + especialidades (não só “Desempregado”/cargo genérico)', true);
  add(ab.length >= 800 && ab.length <= 2600, 'Sobre com 800–2600 caracteres', true);
  add(/\d/.test(ab), 'Sobre cita ao menos um resultado com número', true);
  add(/\b(eu|meu|minha|tenho|trabalho|atuo|ajudo)\b/i.test(ab), 'Sobre em 1ª pessoa', true);
  add(/@|contato|e-?mail|whatsapp|fale comigo|mensagem/i.test(ab), 'Sobre termina com chamada para contato', true);
  add(sk.length >= 5, `Pelo menos 5 habilidades (${sk.length})`, true);
  $('#liChecks').replaceChildren(...it.map(([l, t]) => h('li', { class: l }, t)));
}
['li_head', 'li_about', 'li_exp', 'li_skills'].forEach(id => { $('#' + id).addEventListener('input', () => { liCheck(); try { localStorage.setItem('ats-li-' + id, $('#' + id).value); } catch (e) {} }); try { $('#' + id).value = localStorage.getItem('ats-li-' + id) || ''; } catch (e) {} });
$('#liFromResume').onclick = () => {
  const b = R.basics, top = (R.experience || [])[0];
  if (!$('#li_head').value) $('#li_head').value = [b.headline, ((R.skills || [])[0] || {}).items?.slice(0, 3).join(' · ')].filter(Boolean).join(' | ').slice(0, 220);
  if (!$('#li_about').value) $('#li_about').value = R.summary || '';
  if (!$('#li_exp').value && top) $('#li_exp').value = (top.bullets || []).map(x => '• ' + x).join('\n');
  if (!$('#li_skills').value) $('#li_skills').value = (R.skills || []).flatMap(g => g.items || []).join(', ');
  liCheck(); toast('Campos preenchidos a partir do currículo.');
};

// ---------- guia (markdown mínimo e seguro)
let guideLoaded = false;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function inline(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); }
function md(src) {
  src = src.replace(/^---\n[\s\S]*?\n---\n/, '');
  const L = src.split('\n'), o = []; let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (/^```/.test(l)) { const b = []; i++; while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]); i++; o.push('<pre><code>' + esc(b.join('\n')) + '</code></pre>'); continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { o.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^\|.*\|\s*$/.test(l) && /^\|[\s:|-]+\|\s*$/.test(L[i + 1] || '')) {
      const row = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      let t = '<table><thead><tr>' + row(l).map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'; i += 2;
      while (i < L.length && /^\|/.test(L[i])) t += '<tr>' + row(L[i++]).map(c => `<td>${c}</td>`).join('') + '</tr>';
      o.push(t + '</tbody></table>'); continue;
    }
    if (/^>\s?/.test(l)) { const b = []; while (i < L.length && /^>\s?/.test(L[i])) b.push(L[i++].replace(/^>\s?/, '')); o.push('<blockquote>' + inline(b.join(' ')) + '</blockquote>'); continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ord = /^\s*\d+\./.test(l), b = [];
      while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) { let t = L[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''); while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*]|\d+\.)\s/.test(L[i])) t += ' ' + L[i++].trim(); b.push('<li>' + inline(t) + '</li>'); }
      o.push((ord ? '<ol>' : '<ul>') + b.join('') + (ord ? '</ol>' : '</ul>')); continue;
    }
    if (/^\s*$/.test(l) || /^---+$/.test(l)) { i++; continue; }
    const p = []; while (i < L.length && !/^\s*$/.test(L[i]) && !/^(#{1,4}\s|```|\||>|\s*([-*]|\d+\.)\s)/.test(L[i])) p.push(L[i++]); o.push('<p>' + inline(p.join(' ')) + '</p>');
  }
  return o.join('\n');
}
async function loadGuides() {
  guideLoaded = true;
  try {
    const list = await (await fetch(api('guides'))).json(), ul = $('#guideList');
    ul.replaceChildren(...list.map(g => h('li', {}, h('button', { 'data-id': g.id, onclick: () => openGuide(g.id) }, g.title))));
    openGuide(list[0].id);
  } catch (e) { $('#guideBody').textContent = 'Não foi possível carregar o guia.'; }
}
async function openGuide(id) {
  $$('#guideList button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  const d = await (await fetch(api('guides/' + id))).json();
  $('#guideBody').innerHTML = md(d.markdown);
  $('#guideBody').scrollIntoView({ block: 'start' });
}

// ---------- init
renderForm(); changed(); liCheck();
const hash = location.hash.slice(1); if (hash && $('#tab-' + hash)) showTab(hash);
})();
