/* =========================================================
   APP COMPLETA - LOGIN GOOGLE + ROLES + RÚBRICAS + RANKINGS
   ========================================================= */

const API_URL = window.APP_CONFIG.API_URL;
const STORAGE_SESION = 'emprende_sesion_v2';
const STORAGE_TOKEN = 'google_id_token';

let state = {
  sesion: null,
  plan: [],
  filas: [],
  ranking: [],
  rankingIndividual: [],
  miInfo: null,
  equipos: [],
  alumnos: [],
  entregas: [],
  rubricaGrupal: [],
  rubricaIndividual: []
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

function toast(msg, ms = 2500) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ============ API ============ */
async function apiGet(accion, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('accion', accion);

  // El id_token siempre viene del localStorage (fuente única de verdad)
  const idToken = localStorage.getItem(STORAGE_TOKEN);
  if (idToken) url.searchParams.set('id_token', idToken);

  // El resto de parámetros, sin pisar id_token
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'id_token') return;
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v);
    }
  });

  url.searchParams.set('t', Date.now());

  const resp = await fetch(url.toString(), { redirect: 'follow' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function apiPost(accion, payload = {}) {
  if (!state.sesion) throw new Error('Sin sesión');
  const body = {
    accion,
    correo: state.sesion.correo,
    id_token: localStorage.getItem(STORAGE_TOKEN) || '',
    ...payload
  };
  const resp = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

/* ============ LOGIN CON GOOGLE ============ */
// Esta función la invoca Google Identity Services automáticamente
function handleGoogleCredential(response) {
  const errEl = $('#loginError');
  try {
    if (!response || !response.credential) {
      throw new Error('No se recibió credencial de Google');
    }
    const idToken = response.credential;

    // Decodificar el payload del JWT para obtener el correo
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const correo = (payload.email || '').toLowerCase().trim();
    if (!correo) throw new Error('El token no contiene correo');

    // Guardar token para futuras peticiones
    localStorage.setItem(STORAGE_TOKEN, idToken);

    hacerLoginConToken(correo);
  } catch (e) {
    if (errEl) errEl.textContent = '⚠️ ' + e.message;
    console.error('Error procesando credencial de Google:', e, response);
  }
}

async function hacerLoginConToken(correo) {
  const errEl = $('#loginError');
  try {
    // El id_token ya lo agrega apiGet automáticamente desde localStorage
    const data = await apiGet('login', { correo });

    if (data.tipo === 'docente') {
      state.sesion = { tipo: 'docente', correo, nombre: data.nombre };
    } else if (data.tipo === 'alumno') {
      state.sesion = {
        tipo: 'alumno',
        correo,
        alumno: data.alumno,
        equipo: data.equipo,
        nombre: data.alumno.nombre
      };
    } else {
      throw new Error('Tipo de usuario desconocido');
    }

    localStorage.setItem(STORAGE_SESION, JSON.stringify(state.sesion));
    mostrarApp();
    await arrancarApp();
  } catch (e) {
    if (errEl) errEl.textContent = '⚠️ ' + e.message;
    console.error('Error en login:', e);
    // Limpiar token inválido
    localStorage.removeItem(STORAGE_TOKEN);
  }
}

function cerrarSesion() {
  localStorage.removeItem(STORAGE_SESION);
  localStorage.removeItem(STORAGE_TOKEN);
  location.reload();
}

function restaurarSesion() {
  try {
    const raw = localStorage.getItem(STORAGE_SESION);
    const token = localStorage.getItem(STORAGE_TOKEN);
    if (raw && token) {
      state.sesion = JSON.parse(raw);
    } else {
      // Si falta uno de los dos, no hay sesión válida
      localStorage.removeItem(STORAGE_SESION);
      localStorage.removeItem(STORAGE_TOKEN);
      state.sesion = null;
    }
  } catch (e) {
    state.sesion = null;
  }
}

function mostrarApp() {
  $('#pantalla-login').style.display = 'none';
  $('#app').style.display = 'flex';
  document.body.classList.toggle('es-alumno', state.sesion.tipo === 'alumno');
  document.body.classList.toggle('es-docente', state.sesion.tipo === 'docente');

  $('#sidebarNombre').textContent = state.sesion.nombre || state.sesion.correo;
  $('#sidebarRol').textContent = state.sesion.tipo === 'docente'
    ? '👩‍🏫 Docente'
    : `${state.sesion.alumno.rol} · ${state.sesion.equipo.nombre || state.sesion.alumno.equipo_id}`;
}

function mostrarLogin() {
  $('#pantalla-login').style.display = 'flex';
  $('#app').style.display = 'none';
}

/* ============ NAVEGACIÓN ============ */
const TITULOS = {
  dashboard: 'Dashboard',
  plan: 'Plan Semanal',
  ranking: 'Ranking Equipos',
  'ranking-individual': 'Ranking Individual',
  'mi-equipo': 'Mi Equipo',
  'mis-notas': 'Mis Notas',
  'mis-notas-individuales': 'Mis Notas Individuales',
  'panel-docente': 'Calificar Equipo',
  'panel-individual': 'Calificar Alumnos',
  'gestion-equipos': 'Grupos y Miembros',
  'entregas-admin': 'Entregas',
  acerca: 'Acerca de'
};

function navegar(view) {
  if (state.sesion.tipo === 'alumno' &&
      (view.startsWith('panel-') || view === 'gestion-equipos' || view === 'entregas-admin')) return;
  if (state.sesion.tipo === 'docente' &&
      (view === 'mi-equipo' || view.startsWith('mis-notas'))) return;

  $$('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $('#viewTitle').textContent = TITULOS[view] || '';

  if (view === 'ranking') cargarRanking();
  if (view === 'ranking-individual') cargarRankingIndividual();
  if (view === 'mi-equipo' || view === 'mis-notas') cargarMiInfo();
  if (view === 'mis-notas-individuales') cargarMisNotasIndividuales();
  if (view === 'panel-docente') inicializarPanelDocente();
  if (view === 'panel-individual') inicializarPanelIndividual();
  if (view === 'gestion-equipos') cargarGestion();
  if (view === 'entregas-admin') cargarEntregasAdmin();

  if (window.innerWidth < 900) $('#sidebar').classList.remove('open');
}

/* ============ CARGAS INICIALES ============ */
async function cargarPlan() {
  try {
    const data = await apiGet('plan');
    console.log('Plan recibido:', (data.data || []).length, 'filas');
    state.plan = data.data || [];
    state.filas = state.plan;
  } catch (e) {
    console.error('Error cargando plan:', e);
    state.plan = [];
    state.filas = [];
  }
}

async function cargarRanking() {
  try {
    const seccion = $('#filtroSeccion').value || '';
    const data = await apiGet('ranking', seccion ? { seccion } : {});
    state.ranking = data.ranking || [];
    renderRanking();
  } catch (e) {
    toast('❌ Ranking: ' + e.message);
  }
}

async function cargarRankingIndividual() {
  try {
    const seccion = $('#filtroSeccion').value || '';
    const data = await apiGet('ranking-individual', seccion ? { seccion } : {});
    state.rankingIndividual = data.ranking || [];
    renderRankingIndividual();
  } catch (e) {
    toast('❌ Ranking individual: ' + e.message);
  }
}

async function cargarMiInfo() {
  if (state.sesion.tipo !== 'alumno') return;
  try {
    const data = await apiGet('equipo', { correo: state.sesion.correo });
    state.miInfo = data;
    renderMiEquipo();
    renderMisNotas();
  } catch (e) {
    toast('❌ ' + e.message);
  }
}

async function cargarMisNotasIndividuales() {
  if (state.sesion.tipo !== 'alumno') return;
  try {
    const data = await apiGet('mi-nota', { correo: state.sesion.correo });
    renderMisNotasIndividuales(data);
  } catch (e) {
    toast('❌ ' + e.message);
  }
}

/* ============ RENDER: DASHBOARD ============ */
function datosFiltrados() {
  const seccion = $('#filtroSeccion').value;
  const grado = $('#filtroGrado').value;
  const semana = $('#filtroSemana').value;
  return state.filas.filter(f =>
    (!seccion || f.Seccion === seccion) &&
    (!grado || f.Grado === grado) &&
    (!semana || String(f.Semana) === String(semana))
  );
}

function renderKPIs() {
  const d = datosFiltrados();
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="num">${d.length}</div><div class="lbl">Tareas totales</div></div>
    <div class="kpi"><div class="num">${new Set(d.map(x => x.Grado)).size}</div><div class="lbl">Grados</div></div>
    <div class="kpi"><div class="num">${new Set(d.map(x => x.Semana)).size}</div><div class="lbl">Semanas</div></div>
    <div class="kpi"><div class="num">${new Set(d.map(x => x.Entregable_Especifico)).size}</div><div class="lbl">Entregables únicos</div></div>
  `;
}

function renderMatriz() {
  const d = datosFiltrados();
  const grados = [...new Set(d.map(x => x.Grado))].sort();
  const semanas = [...new Set(d.map(x => Number(x.Semana)))].sort((a, b) => a - b);
  const m = {};
  grados.forEach(g => { m[g] = {}; semanas.forEach(s => m[g][s] = 0); });
  d.forEach(x => {
    const s = Number(x.Semana);
    if (m[x.Grado] && m[x.Grado][s] !== undefined) m[x.Grado][s]++;
  });

  let html = '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Grado</th>';
  semanas.forEach(s => html += `<th>Sem ${s}</th>`);
  html += '<th>Total</th></tr></thead><tbody>';
  grados.forEach(g => {
    let t = 0;
    html += `<tr><td><b>${g}</b></td>`;
    semanas.forEach(s => {
      const v = m[g][s] || 0;
      t += v;
      html += `<td style="text-align:center">${v}</td>`;
    });
    html += `<td style="text-align:center"><b>${t}</b></td></tr>`;
  });
  html += '</tbody></table></div>';
  $('#matrizGradoSemana').innerHTML = html;
}

function renderBarras(sel, conteo, color) {
  const max = Math.max(...Object.values(conteo), 1);
  let html = '';
  Object.entries(conteo).forEach(([k, n]) => {
    const pct = (n / max * 100).toFixed(0);
    html += `<div class="rol-barra"><div class="fila"><span>${k}</span><span>${n}</span></div>
      <div class="barra"><div style="width:${pct}%;background:${color}"></div></div></div>`;
  });
  $(sel).innerHTML = html || '<p class="hint">Sin datos</p>';
}

function renderDashboard() {
  renderKPIs();
  renderMatriz();
  const d = datosFiltrados();
  renderBarras('#chartRoles', d.reduce((a, x) => { a[x.Rol] = (a[x.Rol] || 0) + 1; return a; }, {}), '#1a73e8');
  renderBarras('#chartTipo', d.reduce((a, x) => { a[x.Tipo_Rol] = (a[x.Tipo_Rol] || 0) + 1; return a; }, {}), '#34a853');
  renderBarras('#chartGrado', d.reduce((a, x) => { a[x.Grado] = (a[x.Grado] || 0) + 1; return a; }, {}), '#ea4335');
}

/* ============ RENDER: PLAN ============ */
function renderPlan() {
  const d = datosFiltrados();
  $('#tablaPlan tbody').innerHTML = d.map(x => `
    <tr>
      <td>${x.Grado}</td>
      <td style="text-align:center">${x.Semana}</td>
      <td>${x.Tema_Semanal}</td>
      <td class="rol-${x.Rol}">${x.Rol}</td>
      <td>${x.Tarea_Detallada}</td>
      <td>${x.Entregable_Especifico}</td>
      <td>${x.Rol_Backup || ''}</td>
    </tr>`).join('');
}

/* ============ RENDER: RANKING EQUIPOS ============ */
function renderRanking() {
  const tbody = $('#tablaRanking tbody');
  if (!state.ranking.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Sin datos</td></tr>';
    return;
  }
  const miEquipoId = state.sesion?.tipo === 'alumno' ? state.sesion.alumno.equipo_id : null;

  tbody.innerHTML = state.ranking.map(r => {
    const medalla = r.posicion === 1 ? '🥇' : r.posicion === 2 ? '🥈' : r.posicion === 3 ? '🥉' : r.posicion;
    const clase = r.posicion <= 3 ? `rank-${r.posicion}` : '';
    const esMio = miEquipoId && String(r.equipo_id) === String(miEquipoId);
    const trello = r.trello_url
      ? `<a href="${r.trello_url}" target="_blank" rel="noopener">🔗 Ver</a>`
      : '—';
    return `<tr class="${clase}" ${esMio ? 'style="background:#e8f0fe;font-weight:bold"' : ''}>
      <td style="text-align:center"><span class="medalla">${medalla}</span></td>
      <td>${r.nombre}${esMio ? ' ⭐' : ''}</td>
      <td>${r.grado}</td>
      <td style="text-align:center"><b>${r.seccion || '-'}</b></td>
      <td>${r.proyecto}</td>
      <td style="text-align:center"><b>${r.puntos}</b></td>
      <td style="text-align:center">${r.porcentaje}%</td>
      <td style="text-align:center">${trello}</td>
    </tr>`;
  }).join('');

  $('#rankingActualizado').textContent = 'Actualizado: ' + new Date().toLocaleString('es-PE');
}

/* ============ RENDER: RANKING INDIVIDUAL ============ */
function renderRankingIndividual() {
  const tbody = $('#tablaRankingIndividual tbody');
  if (!state.rankingIndividual.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Sin datos</td></tr>';
    return;
  }
  const miCorreo = state.sesion?.tipo === 'alumno' ? state.sesion.correo : null;

  tbody.innerHTML = state.rankingIndividual.map(r => {
    const medalla = r.posicion === 1 ? '🥇' : r.posicion === 2 ? '🥈' : r.posicion === 3 ? '🥉' : r.posicion;
    const clase = r.posicion <= 3 ? `rank-${r.posicion}` : '';
    const esMio = miCorreo && String(r.correo).toLowerCase() === String(miCorreo).toLowerCase();
    return `<tr class="${clase}" ${esMio ? 'style="background:#e8f0fe;font-weight:bold"' : ''}>
      <td style="text-align:center"><span class="medalla">${medalla}</span></td>
      <td>${r.nombre}${esMio ? ' ⭐' : ''}</td>
      <td>${r.grado}</td>
      <td style="text-align:center">${r.seccion}</td>
      <td><span class="rol-${r.rol}">${r.rol}</span></td>
      <td>${r.equipo_id}</td>
      <td style="text-align:center"><b>${r.puntos}</b></td>
      <td style="text-align:center">${r.porcentaje}%</td>
    </tr>`;
  }).join('');
}

/* ============ RENDER: MI EQUIPO ============ */
function renderMiEquipo() {
  const info = state.miInfo;
  if (!info) return;
  const eq = info.equipo;

  $('#infoMiEquipo').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="posicion-destacada">
        <div class="num">#${info.posicion_seccion}</div>
        <div class="lbl">de ${info.total_seccion} en sección ${eq.seccion || '—'}</div>
        <div class="lbl" style="margin-top:6px"><b>${info.puntos_seccion} pts · ${info.porcentaje_seccion}%</b></div>
      </div>
      <div class="posicion-destacada" style="background:linear-gradient(135deg,#e8f0fe,#fff);border-color:#1a73e8">
        <div class="num" style="color:#1a73e8">#${info.posicion_global}</div>
        <div class="lbl">de ${info.total_global} a nivel global</div>
        <div class="lbl" style="margin-top:6px"><b>${info.puntos_global} pts · ${info.porcentaje_global}%</b></div>
      </div>
    </div>

    <h3>${eq.nombre}</h3>
    <p class="hint">${eq.grado} · Sección ${eq.seccion || '—'} · ${eq.proyecto}</p>
    ${eq.trello_url ? `<p class="hint">📋 Trello: <a href="${eq.trello_url}" target="_blank" rel="noopener">${eq.trello_url}</a></p>` : ''}

    <h4 style="margin-top:16px;font-size:14px;color:#0b5394">Integrantes</h4>
    <ul style="padding-left:20px;margin-top:8px">
      ${eq.companeros.map(c => `
        <li><span class="rol-${c.rol}">${c.rol}</span> — ${c.nombre}</li>
      `).join('')}
    </ul>
  `;
}

/* ============ RENDER: MIS NOTAS (grupal) ============ */
function renderMisNotas() {
  const info = state.miInfo;
  if (!info) return;
  const cont = $('#listaMisNotas');

  if (!info.entregas?.length) {
    cont.innerHTML = '<p class="hint">Aún no hay entregas asignadas a tu equipo.</p>';
    return;
  }

  cont.innerHTML = info.entregas.map(e => {
    const estado = e.calificado ? 'calificada' : 'pendiente';
    const label = e.calificado ? `✅ ${e.puntaje}/${e.puntaje_max}` : '⏳ Pendiente';
    return `
      <div class="entrega-card ${estado}">
        <h4>Sem ${e.semana} · ${e.titulo} ${label}</h4>
        <p class="meta">${e.descripcion || ''}</p>
        ${e.calificado
          ? e.detalle.map(d => `
              <div class="criterio-mini">
                <b>${d.criterio}:</b> ${d.puntaje}/${d.max}
                ${d.comentario ? `<em style="color:#666"> — "${d.comentario}"</em>` : ''}
              </div>`).join('')
          : '<p class="hint">Aún no ha sido calificada por el docente.</p>'}
      </div>`;
  }).join('');
}

/* ============ RENDER: MIS NOTAS INDIVIDUALES ============ */
function renderMisNotasIndividuales(data) {
  const cont = $('#misNotasIndividuales');
  if (!data || !data.porEntrega?.length) {
    cont.innerHTML = '<p class="hint">Aún no tienes calificaciones individuales.</p>';
    return;
  }

  const header = `
    <div class="posicion-destacada" style="background:linear-gradient(135deg,#e8f0fe,#fff);border-color:#1a73e8">
      <div class="num" style="color:#1a73e8">${data.porcentaje}%</div>
      <div class="lbl">${data.totalGeneral} / ${data.maxGeneral} puntos acumulados</div>
    </div>`;

  const entregasHTML = data.porEntrega.map(e => {
    if (!e.calificado) {
      return `<div class="entrega-card pendiente">
        <h4>Sem ${e.semana} · ${e.titulo} ⏳</h4>
        <p class="meta">Aún no calificada</p>
      </div>`;
    }
    const criterios = e.detalle.map(d => `
      <div class="criterio-mini">
        <b>${d.criterio}:</b> ${d.puntaje}/${d.max}
        ${d.comentario ? `<em style="color:#666"> — "${d.comentario}"</em>` : ''}
      </div>`).join('');
    return `<div class="entrega-card calificada">
      <h4>Sem ${e.semana} · ${e.titulo} ✅ ${e.total}/${e.max}</h4>
      ${criterios}
    </div>`;
  }).join('');

  cont.innerHTML = header + entregasHTML;
}

/* ============ PANEL DOCENTE: CALIFICAR EQUIPO ============ */
async function inicializarPanelDocente() {
  try {
    const login = await apiGet('login', { correo: state.sesion.correo });
    state.equipos = login.equipos || [];
    state.alumnos = login.alumnos || [];
    state.entregas = login.entregas || [];
    state.rubricaGrupal = login.rubrica || [];

    const secs = [...new Set(state.equipos.map(e => e.seccion).filter(Boolean))].sort();
    $('#docenteSeccion').innerHTML = '<option value="">-- Sección --</option>' +
      secs.map(s => `<option>${s}</option>`).join('');

    $('#docenteSeccion').onchange = actualizarEquiposDocente;
    $('#docenteEquipo').onchange = actualizarEntregasDocente;
    $('#docenteEntrega').onchange = cargarRubricaPanel;

    $('#docenteEquipo').innerHTML = '<option value="">-- Primero sección --</option>';
    $('#docenteEntrega').innerHTML = '<option value="">-- Entrega --</option>';
    $('#rubricaPanel').style.display = 'none';
  } catch (e) {
    toast('❌ ' + e.message);
  }
}

function actualizarEquiposDocente() {
  const seccion = $('#docenteSeccion').value;
  const selEq = $('#docenteEquipo');
  if (!seccion) {
    selEq.innerHTML = '<option value="">-- Primero sección --</option>';
    $('#docenteEntrega').innerHTML = '<option value="">-- Entrega --</option>';
    return;
  }
  const eqs = state.equipos.filter(e => String(e.seccion) === String(seccion));
  selEq.innerHTML = '<option value="">-- Equipo --</option>' +
    eqs.map(e => `<option value="${e.equipo_id}">${e.nombre_equipo}</option>`).join('');
}

function actualizarEntregasDocente() {
  const eqId = $('#docenteEquipo').value;
  const selEnt = $('#docenteEntrega');
  if (!eqId) { selEnt.innerHTML = '<option value="">-- Entrega --</option>'; return; }
  const ents = state.entregas.filter(e => String(e.equipo_id) === String(eqId));
  selEnt.innerHTML = '<option value="">-- Entrega --</option>' +
    ents.map(e => `<option value="${e.entrega_id}">Sem ${e.semana} · ${e.titulo}</option>`).join('');
}

async function cargarRubricaPanel() {
  const eqId = $('#docenteEquipo').value;
  const entId = $('#docenteEntrega').value;
  if (!eqId || !entId) return;

  const rubrica = [...(state.rubricaGrupal || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  $('#tablaRubrica tbody').innerHTML = rubrica.map(r => `
    <tr data-criterio="${r.criterio_id}">
      <td><b>${r.nombre}</b></td>
      <td style="font-size:12px;color:#666">${r.descripcion}</td>
      <td style="text-align:center">
        <input type="number" min="0" max="${r.peso_max}" value="0" class="input-puntaje"
               style="width:60px;text-align:center;padding:6px">
      </td>
      <td style="text-align:center">${r.peso_max}</td>
      <td><input type="text" class="input-comentario" placeholder="..."
                 style="width:100%;padding:6px;font-size:12px"></td>
    </tr>`).join('');

  const eqNombre = state.equipos.find(e => e.equipo_id === eqId)?.nombre_equipo || eqId;
  $('#rubricaTitulo').textContent = `Rúbrica grupal · ${eqNombre} · Entrega ${entId}`;
  $('#rubricaPanel').style.display = 'block';
  $('#resultadoGuardar').textContent = '';

  try {
    const resumen = await apiPost('resumen-equipo', { equipo_id: eqId });
    renderResumenEquipo(resumen);
  } catch (e) {}
}

async function guardarCalificacion() {
  const eqId = $('#docenteEquipo').value;
  const entId = $('#docenteEntrega').value;
  if (!eqId || !entId) { toast('⚠️ Elige equipo y entrega'); return; }

  const filas = $$('#tablaRubrica tbody tr');
  const criterios = filas.map(tr => ({
    criterio_id: tr.dataset.criterio,
    puntaje: Number($('.input-puntaje', tr).value) || 0,
    comentario: $('.input-comentario', tr).value.trim()
  }));

  const observacionPc = $('#observacionPc').value.trim();
  const comentarioGeneral = $('#comentarioGeneral').value.trim();

  if (!observacionPc) {
    if (!confirm('¿No registraste qué observaste en la PC?\n¿Continuar de todas formas?')) return;
  }

  try {
    await apiPost('calificar', {
      entrega_id: entId,
      equipo_id: eqId,
      criterios,
      comentario: comentarioGeneral,
      observacion_pc: observacionPc
    });
    $('#resultadoGuardar').textContent = '✅ Guardado';
    toast('✅ Calificación guardada');
    const resumen = await apiPost('resumen-equipo', { equipo_id: eqId });
    renderResumenEquipo(resumen);
  } catch (e) {
    $('#resultadoGuardar').textContent = '❌ ' + e.message;
    toast('❌ ' + e.message);
  }
}

function renderResumenEquipo(r) {
  if (!r || !r.porEntrega) return;
  $('#resumenCalificaciones').innerHTML = `
    <table class="tabla">
      <thead><tr><th>Semana</th><th>Entrega</th><th>Puntaje</th><th>Máx</th><th>Estado</th></tr></thead>
      <tbody>
        ${r.porEntrega.map(e => `
          <tr>
            <td style="text-align:center">${e.semana}</td>
            <td>${e.titulo}</td>
            <td style="text-align:center"><b>${e.total}</b></td>
            <td style="text-align:center">${e.max}</td>
            <td style="text-align:center">${e.calificado ? '✅' : '⏳'}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#eef3fd;font-weight:bold">
          <td colspan="2" style="text-align:right">TOTAL</td>
          <td style="text-align:center">${r.totalGeneral}</td>
          <td style="text-align:center">${r.maxGeneral}</td>
          <td style="text-align:center">${r.porcentaje}%</td>
        </tr>
      </tfoot>
    </table>
  `;
}

/* ============ PANEL DOCENTE: CALIFICAR ALUMNOS ============ */
async function inicializarPanelIndividual() {
  try {
    const login = await apiGet('login', { correo: state.sesion.correo });
    state.equipos = login.equipos || [];
    state.alumnos = login.alumnos || [];
    state.entregas = login.entregas || [];

    let rubricaInd = login.rubrica_individual;
    if (!rubricaInd) {
      const r = await apiGet('rubrica-individual');
      rubricaInd = r.rubrica || [];
    }
    state.rubricaIndividual = rubricaInd;

    const secs = [...new Set(state.equipos.map(e => e.seccion).filter(Boolean))].sort();
    $('#indSeccion').innerHTML = '<option value="">-- Sección --</option>' +
      secs.map(s => `<option>${s}</option>`).join('');

    $('#indSeccion').onchange = actualizarEquiposIndividual;
    $('#indEquipo').onchange = actualizarEntregasIndividual;
    $('#indEntrega').onchange = cargarRubricaIndividual;

    $('#indEquipo').innerHTML = '<option value="">-- Primero sección --</option>';
    $('#indEntrega').innerHTML = '<option value="">-- Entrega --</option>';
    $('#indRubricaPanel').style.display = 'none';
  } catch (e) {
    toast('❌ ' + e.message);
  }
}

function actualizarEquiposIndividual() {
  const seccion = $('#indSeccion').value;
  const selEq = $('#indEquipo');
  if (!seccion) {
    selEq.innerHTML = '<option value="">-- Primero sección --</option>';
    $('#indEntrega').innerHTML = '<option value="">-- Entrega --</option>';
    return;
  }
  const eqs = state.equipos.filter(e => String(e.seccion) === String(seccion));
  selEq.innerHTML = '<option value="">-- Equipo --</option>' +
    eqs.map(e => `<option value="${e.equipo_id}">${e.nombre_equipo}</option>`).join('');
}

function actualizarEntregasIndividual() {
  const eqId = $('#indEquipo').value;
  const selEnt = $('#indEntrega');
  if (!eqId) { selEnt.innerHTML = '<option value="">-- Entrega --</option>'; return; }
  const ents = state.entregas.filter(e => String(e.equipo_id) === String(eqId));
  selEnt.innerHTML = '<option value="">-- Entrega --</option>' +
    ents.map(e => `<option value="${e.entrega_id}">Sem ${e.semana} · ${e.titulo}</option>`).join('');
}

async function cargarRubricaIndividual() {
  const eqId = $('#indEquipo').value;
  const entId = $('#indEntrega').value;
  if (!eqId || !entId) return;

  const rubrica = [...(state.rubricaIndividual || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const alumnos = state.alumnos.filter(a => String(a.equipo_id) === String(eqId));

  const cont = $('#indListaAlumnos');
  cont.innerHTML = alumnos.map(al => `
    <div class="alumno-card" data-correo="${al.correo}">
      <h4>${al.nombre}
        <span class="rol-tag rol-${al.rol}">${al.rol}</span>
      </h4>
      <table>
        <thead><tr>
          <th>Criterio</th>
          <th style="width:80px">Puntaje</th>
          <th style="width:50px">Máx</th>
          <th>Comentario</th>
        </tr></thead>
        <tbody>
          ${rubrica.map(r => `
            <tr data-criterio="${r.criterio_id}">
              <td>${r.nombre}</td>
              <td style="text-align:center">
                <input type="number" min="0" max="${r.peso_max}" value="0" class="puntaje-ind">
              </td>
              <td style="text-align:center">${r.peso_max}</td>
              <td><input type="text" placeholder="..." class="comentario-ind"></td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:8px">
        <input type="text" class="obs-pc-ind"
               placeholder="🔍 Observación PC: qué mostró este alumno"
               style="width:100%;padding:6px;font-size:12px">
      </div>
      <div class="toolbar" style="margin-top:8px">
        <button class="btn btn-guardar-ind" style="padding:6px 12px;font-size:12px">💾 Guardar</button>
        <span class="resultado-ind" style="font-size:12px;color:#666"></span>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.btn-guardar-ind').forEach(btn => {
    btn.onclick = () => guardarCalificacionIndividual(btn.closest('.alumno-card'), entId, eqId);
  });

  const eqNombre = state.equipos.find(e => e.equipo_id === eqId)?.nombre_equipo || eqId;
  $('#indRubricaTitulo').textContent = `Rúbrica individual · ${eqNombre} · Entrega ${entId}`;
  $('#indRubricaPanel').style.display = 'block';
}

async function guardarCalificacionIndividual(card, entId, eqId) {
  const correo = card.dataset.correo;
  const filas = card.querySelectorAll('tbody tr');
  const criterios = [...filas].map(tr => ({
    criterio_id: tr.dataset.criterio,
    puntaje: Number(tr.querySelector('.puntaje-ind').value) || 0,
    comentario: tr.querySelector('.comentario-ind').value.trim()
  }));
  const observacionPc = card.querySelector('.obs-pc-ind').value.trim();
  const resultado = card.querySelector('.resultado-ind');

  try {
    await apiPost('calificar-individual', {
      entrega_id: entId,
      equipo_id: eqId,
      correo_alumno: correo,
      criterios,
      observacion_pc: observacionPc
    });
    resultado.textContent = '✅ Guardado';
    resultado.style.color = '#34a853';
    toast('✅ ' + correo);
  } catch (e) {
    resultado.textContent = '❌ ' + e.message;
    resultado.style.color = '#ea4335';
  }
}

/* ============ GESTIÓN DE EQUIPOS Y MIEMBROS ============ */
async function cargarGestion() {
  try {
    const eq = await apiPost('listar-equipos');
    const al = await apiPost('listar-alumnos');
    state.equipos = eq.equipos || [];
    state.alumnos = al.alumnos || [];

    $('#tablaEquipos tbody').innerHTML = state.equipos.map(e => `
      <tr data-id="${e.equipo_id}">
        <td>${e.equipo_id}</td>
        <td>${e.nombre_equipo}</td>
        <td>${e.grado}</td>
        <td>${e.seccion}</td>
        <td>${e.proyecto || ''}</td>
        <td>${e.trello_url ? `<a href="${e.trello_url}" target="_blank" rel="noopener">🔗</a>` : '—'}</td>
        <td>
          <button class="btn btn-ghost" data-accion="editar-equipo" data-id="${e.equipo_id}"
                  style="padding:4px 8px;font-size:11px">✏️</button>
          <button class="btn btn-ghost" data-accion="eliminar-equipo" data-id="${e.equipo_id}"
                  style="padding:4px 8px;font-size:11px">🗑️</button>
        </td>
      </tr>`).join('');

    const selEq = $('#filtroEquipoAlumnos');
    selEq.innerHTML = '<option value="">-- Todos los equipos --</option>' +
      state.equipos.map(e => `<option value="${e.equipo_id}">${e.nombre_equipo}</option>`).join('');
    selEq.onchange = renderTablaAlumnos;

    renderTablaAlumnos();

    document.querySelectorAll('[data-accion="editar-equipo"]').forEach(b => {
      b.onclick = () => abrirModalEquipo(state.equipos.find(x => x.equipo_id === b.dataset.id));
    });
    document.querySelectorAll('[data-accion="eliminar-equipo"]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('¿Eliminar este equipo?')) return;
        try {
          await apiPost('eliminar-equipo', { equipo_id: b.dataset.id });
          toast('🗑️ Equipo eliminado');
          cargarGestion();
        } catch (e) { toast('❌ ' + e.message); }
      };
    });
  } catch (e) {
    toast('❌ ' + e.message);
  }
}

function renderTablaAlumnos() {
  const eqFiltro = $('#filtroEquipoAlumnos').value;
  const filtrados = eqFiltro
    ? state.alumnos.filter(a => String(a.equipo_id) === String(eqFiltro))
    : state.alumnos;

  $('#tablaAlumnos tbody').innerHTML = filtrados.map(a => `
    <tr>
      <td>${a.correo}</td>
      <td>${a.nombre}</td>
      <td>${a.grado}</td>
      <td>${a.seccion}</td>
      <td>${a.equipo_id}</td>
      <td><span class="rol-${a.rol}">${a.rol}</span></td>
      <td>
        <button class="btn btn-ghost" data-accion="editar-alumno" data-correo="${a.correo}"
                style="padding:4px 8px;font-size:11px">✏️</button>
        <button class="btn btn-ghost" data-accion="eliminar-alumno" data-correo="${a.correo}"
                style="padding:4px 8px;font-size:11px">🗑️</button>
      </td>
    </tr>`).join('');

  document.querySelectorAll('[data-accion="editar-alumno"]').forEach(b => {
    b.onclick = () => abrirModalAlumno(state.alumnos.find(x => x.correo === b.dataset.correo));
  });
  document.querySelectorAll('[data-accion="eliminar-alumno"]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('¿Eliminar este alumno?')) return;
      try {
        await apiPost('eliminar-alumno', { correo: b.dataset.correo });
        toast('🗑️ Alumno eliminado');
        cargarGestion();
      } catch (e) { toast('❌ ' + e.message); }
    };
  });
}

function abrirModalEquipo(eq = null) {
  const esNuevo = !eq;
  abrirModal({
    title: esNuevo ? '➕ Nuevo Equipo' : '✏️ Editar Equipo',
    campos: [
      { name: 'equipo_id', label: 'ID del equipo', value: eq?.equipo_id || '', disabled: !esNuevo },
      { name: 'nombre_equipo', label: 'Nombre', value: eq?.nombre_equipo || '' },
      { name: 'grado', label: 'Grado', value: eq?.grado || '1° Secundaria' },
      { name: 'seccion', label: 'Sección', value: eq?.seccion || '1A' },
      { name: 'proyecto', label: 'Proyecto', value: eq?.proyecto || '' },
      { name: 'trello_url', label: 'URL del Trello', type: 'url', value: eq?.trello_url || '' }
    ],
    onSave: async (v) => {
      try {
        if (esNuevo) await apiPost('crear-equipo', v);
        else await apiPost('actualizar-equipo', v);
        toast('✅ Guardado');
        cargarGestion();
      } catch (e) { toast('❌ ' + e.message); }
    }
  });
}

function abrirModalAlumno(al = null) {
  const esNuevo = !al;
  abrirModal({
    title: esNuevo ? '➕ Nuevo Alumno' : '✏️ Editar Alumno',
    campos: [
      { name: 'correo', label: 'Correo', type: 'email', value: al?.correo || '', disabled: !esNuevo },
      { name: 'nombre', label: 'Nombre', value: al?.nombre || '' },
      { name: 'grado', label: 'Grado', value: al?.grado || '1° Secundaria' },
      { name: 'seccion', label: 'Sección', value: al?.seccion || '1A' },
      { name: 'equipo_id', label: 'ID del Equipo', value: al?.equipo_id || '' },
      { name: 'rol', label: 'Rol (CEO/CTO/CMO/CFO)', value: al?.rol || 'CEO' }
    ],
    onSave: async (v) => {
      try {
        if (esNuevo) await apiPost('crear-alumno', v);
        else await apiPost('actualizar-alumno', v);
        toast('✅ Guardado');
        cargarGestion();
      } catch (e) { toast('❌ ' + e.message); }
    }
  });
}

/* ============ ADMIN ENTREGAS ============ */
async function cargarEntregasAdmin() {
  try {
    const login = await apiGet('login', { correo: state.sesion.correo });
    state.entregas = login.entregas || [];
    state.equipos = login.equipos || [];

    $('#tablaEntregasAdmin tbody').innerHTML = state.entregas.map(e => {
      const eq = state.equipos.find(x => x.equipo_id === e.equipo_id) || {};
      return `<tr>
        <td>${e.entrega_id}</td>
        <td>${eq.nombre_equipo || e.equipo_id}</td>
        <td style="text-align:center">${e.semana}</td>
        <td>${e.titulo}</td>
        <td>${e.descripcion || ''}</td>
        <td>
          <button class="btn btn-ghost" data-accion="eliminar-entrega" data-id="${e.entrega_id}"
                  style="padding:4px 8px;font-size:11px">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    document.querySelectorAll('[data-accion="eliminar-entrega"]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('¿Eliminar esta entrega?')) return;
        try {
          await apiPost('eliminar-entrega', { entrega_id: b.dataset.id });
          toast('🗑️ Entrega eliminada');
          cargarEntregasAdmin();
        } catch (e) { toast('❌ ' + e.message); }
      };
    });
  } catch (e) {
    toast('❌ ' + e.message);
  }
}

function abrirModalEntrega() {
  const opciones = state.equipos.map(e =>
    `<option value="${e.equipo_id}">${e.nombre_equipo}</option>`).join('');

  abrirModal({
    title: '➕ Nueva Entrega',
    campos: [
      { name: 'equipo_id', label: 'Equipo', type: 'select', options: opciones },
      { name: 'semana', label: 'Semana (1-6)', type: 'number', value: '1' },
      { name: 'titulo', label: 'Título' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' }
    ],
    onSave: async (v) => {
      try {
        await apiPost('crear-entrega', v);
        toast('✅ Entrega creada');
        cargarEntregasAdmin();
      } catch (e) { toast('❌ ' + e.message); }
    }
  });
}

/* ============ MODAL GENÉRICO ============ */
function abrirModal({ title, campos, onSave }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = campos.map(c => {
    const disabled = c.disabled ? 'disabled' : '';
    if (c.type === 'select') {
      return `<label>${c.label}</label><select id="modal-${c.name}" ${disabled}>${c.options || ''}</select>`;
    }
    if (c.type === 'textarea') {
      return `<label>${c.label}</label><textarea id="modal-${c.name}" rows="3" ${disabled}>${c.value || ''}</textarea>`;
    }
    return `<label>${c.label}</label>
      <input id="modal-${c.name}" type="${c.type || 'text'}" value="${c.value || ''}" ${disabled}>`;
  }).join('');

  $('#modal').classList.add('active');
  $('#modalSave').onclick = () => {
    const valores = {};
    campos.forEach(c => valores[c.name] = $('#modal-' + c.name).value.trim());
    onSave(valores);
    $('#modal').classList.remove('active');
  };
  $('#modalCancel').onclick = () => $('#modal').classList.remove('active');
}

/* ============ INIT ============ */
async function init() {
  $('#btnLogout').addEventListener('click', cerrarSesion);

  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal') $('#modal').classList.remove('active');
  });

  restaurarSesion();
  if (state.sesion) {
    mostrarApp();
    await arrancarApp();
  } else {
    mostrarLogin();
  }
}

async function arrancarApp() {
  await cargarPlan();

  // Poblar filtros
  const grados = [...new Set(state.plan.map(f => f.Grado))].sort();
  const semanas = [...new Set(state.plan.map(f => Number(f.Semana)))].sort((a, b) => a - b);

  $('#filtroGrado').innerHTML = '<option value="">Todos los grados</option>' +
    grados.map(g => `<option>${g}</option>`).join('');
  $('#filtroSemana').innerHTML = '<option value="">Todas las semanas</option>' +
    semanas.map(s => `<option>${s}</option>`).join('');

  // Secciones según rol
  if (state.sesion.tipo === 'docente') {
    try {
      const login = await apiGet('login', { correo: state.sesion.correo });
      const secs = login.secciones || [];
      $('#filtroSeccion').innerHTML = '<option value="">Todas las secciones</option>' +
        secs.map(s => `<option>${s}</option>`).join('');
    } catch (e) {}
  } else if (state.sesion.alumno?.seccion) {
    $('#filtroSeccion').innerHTML =
      `<option value="${state.sesion.alumno.seccion}">${state.sesion.alumno.seccion}</option>`;
    $('#filtroSeccion').value = state.sesion.alumno.seccion;
  }

  // Render inicial
  renderDashboard();
  renderPlan();

  // Listeners
  $$('.menu-item').forEach(b => b.addEventListener('click', () => navegar(b.dataset.view)));
  $('#toggleSidebar').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  $('#filtroSeccion').onchange = () => {
    renderDashboard();
    renderPlan();
    if ($('#view-ranking-individual').classList.contains('active')) cargarRankingIndividual();
    if ($('#view-ranking').classList.contains('active')) cargarRanking();
  };
  $('#filtroGrado').onchange = () => { renderDashboard(); renderPlan(); };
  $('#filtroSemana').onchange = () => { renderDashboard(); renderPlan(); };

  $('#btnRefresh').onclick = async () => {
    await cargarPlan();
    if ($('#view-ranking').classList.contains('active')) await cargarRanking();
    if ($('#view-ranking-individual').classList.contains('active')) await cargarRankingIndividual();
    toast('🔄 Datos recargados');
  };

  // Panel docente
  $('#btnGuardarCalificacion').onclick = guardarCalificacion;

  // Gestión
  $('#btnNuevoEquipo').onclick = () => abrirModalEquipo();
  $('#btnNuevoAlumno').onclick = () => abrirModalAlumno();
  $('#btnRecargarGestion').onclick = cargarGestion;

  // Entregas admin
  $('#btnNuevaEntrega').onclick = abrirModalEntrega;
  $('#btnRecargarEntregas').onclick = cargarEntregasAdmin;

  // Cargar datos iniciales según rol
  if (state.sesion.tipo === 'alumno') {
    await cargarMiInfo();
  }
}

document.addEventListener('DOMContentLoaded', init);