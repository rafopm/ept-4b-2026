/* =========================================================
   DASHBOARD ESTÁTICO - GitHub Pages
   Datos desde CSV + localStorage para datos editables
   ========================================================= */

const CSV_URL = 'data/plan.csv'; // Ruta relativa al repo
const STORAGE_KEY = 'dashboard_emprende_v1';

// ============ ESTADO GLOBAL ============
let state = {
  filas: [],          // datos del CSV
  ranking: [],        // ranking editable
  links: [],          // links de interés
  recursos: [],       // recursos
};

// ============ UTILIDADES ============
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms);
}

// Parser CSV simple con soporte de comillas
function parseCSV(texto) {
  const filas = [];
  let campo = '';
  let fila = [];
  let dentroComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const sig = texto[i + 1];

    if (dentroComillas) {
      if (c === '"' && sig === '"') { campo += '"'; i++; }
      else if (c === '"') { dentroComillas = false; }
      else { campo += c; }
    } else {
      if (c === '"') { dentroComillas = true; }
      else if (c === ',') { fila.push(campo); campo = ''; }
      else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else if (c === '\r') { /* ignorar */ }
      else { campo += c; }
    }
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

// Convierte CSV a objetos usando la primera fila como encabezado
function csvAObjetos(texto) {
  const filas = parseCSV(texto).filter(f => f.length > 1 && f.some(c => c.trim()));
  if (!filas.length) return [];
  const headers = filas[0].map(h => h.trim());
  return filas.slice(1).map(fila => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (fila[i] || '').trim());
    return obj;
  });
}

// ============ PERSISTENCIA ============
function cargarEstadoLocal() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      const data = JSON.parse(guardado);
      state.ranking = data.ranking || state.ranking;
      state.links = data.links || state.links;
      state.recursos = data.recursos || state.recursos;
    }
  } catch (e) { console.warn('Error cargando localStorage', e); }
}

function guardarEstadoLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ranking: state.ranking,
      links: state.links,
      recursos: state.recursos,
    }));
  } catch (e) { console.warn('Error guardando localStorage', e); }
}

// ============ CARGA DE CSV ============
async function cargarCSV() {
  try {
    const resp = await fetch(CSV_URL + '?v=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const texto = await resp.text();
    state.filas = csvAObjetos(texto);
  } catch (e) {
    console.warn('No se pudo cargar el CSV, usando datos embebidos.', e);
    state.filas = CSV_EMBEBIDO;
  }
}

// ============ NAVEGACIÓN ============
function navegar(view) {
  $$('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  const titulos = {
    dashboard: 'Dashboard',
    entregables: 'Entregables',
    ranking: 'Ranking de Grupos',
    links: 'Links de Interés',
    recursos: 'Recursos',
    acerca: 'Acerca de'
  };
  $('#viewTitle').textContent = titulos[view] || 'Dashboard';

  // Cerrar sidebar en móvil
  if (window.innerWidth < 900) $('#sidebar').classList.remove('open');
}

// ============ FILTROS ============
function obtenerFiltros() {
  return {
    grado: $('#filtroGrado').value,
    semana: $('#filtroSemana').value,
  };
}

function datosFiltrados() {
  const { grado, semana } = obtenerFiltros();
  return state.filas.filter(f =>
    (!grado || f.Grado === grado) &&
    (!semana || String(f.Semana) === String(semana))
  );
}

// ============ RENDER: KPIs ============
function renderKPIs() {
  const datos = datosFiltrados();
  const grados = new Set(datos.map(d => d.Grado));
  const semanas = new Set(datos.map(d => d.Semana));
  const entregables = new Set(datos.map(d => d.Entregable_Especifico));

  $('#kpis').innerHTML = `
    <div class="kpi"><div class="num">${datos.length}</div><div class="lbl">Tareas totales</div></div>
    <div class="kpi"><div class="num">${grados.size}</div><div class="lbl">Grados</div></div>
    <div class="kpi"><div class="num">${semanas.size}</div><div class="lbl">Semanas</div></div>
    <div class="kpi"><div class="num">${entregables.size}</div><div class="lbl">Entregables únicos</div></div>
    <div class="kpi"><div class="num">${new Set(datos.map(d => d.Proyecto)).size}</div><div class="lbl">Proyectos</div></div>
  `;
}

// ============ RENDER: Matriz Grado x Semana ============
function renderMatriz() {
  const datos = datosFiltrados();
  const grados = [...new Set(datos.map(d => d.Grado))].sort();
  const semanas = [...new Set(datos.map(d => d.Semana))].sort((a, b) => a - b);

  const matriz = {};
  grados.forEach(g => {
    matriz[g] = {};
    semanas.forEach(s => matriz[g][s] = 0);
  });
  datos.forEach(d => {
    if (matriz[d.Grado] && matriz[d.Grado][d.Semana] !== undefined) matriz[d.Grado][d.Semana]++;
  });

  let html = '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Grado</th>';
  semanas.forEach(s => html += `<th>Sem ${s}</th>`);
  html += '<th>Total</th></tr></thead><tbody>';

  grados.forEach(g => {
    let total = 0;
    html += `<tr><td><b>${g}</b></td>`;
    semanas.forEach(s => {
      const v = matriz[g][s] || 0;
      total += v;
      html += `<td style="text-align:center">${v}</td>`;
    });
    html += `<td style="text-align:center"><b>${total}</b></td></tr>`;
  });

  html += '</tbody></table></div>';
  $('#matrizGradoSemana').innerHTML = html;
}

// ============ RENDER: Gráfico de Roles (barras CSS) ============
function renderChartRoles() {
  const datos = datosFiltrados();
  const roles = ['CEO', 'CTO', 'CMO', 'CFO'];
  const conteo = {};
  roles.forEach(r => conteo[r] = datos.filter(d => d.Rol === r).length);
  const max = Math.max(...Object.values(conteo), 1);

  let html = '';
  roles.forEach(r => {
    const n = conteo[r];
    const pct = (n / max * 100).toFixed(0);
    html += `
      <div class="rol-barra">
        <div class="fila"><span class="rol-${r}">${r}</span><span>${n} tareas</span></div>
        <div class="barra"><div style="width:${pct}%"></div></div>
      </div>`;
  });
  $('#chartRoles').innerHTML = html;
}

// ============ RENDER: Tipo de Rol ============
function renderChartTipo() {
  const datos = datosFiltrados();
  const tipos = {};
  datos.forEach(d => {
    tipos[d.Tipo_Rol] = (tipos[d.Tipo_Rol] || 0) + 1;
  });
  const max = Math.max(...Object.values(tipos), 1);
  let html = '';
  Object.entries(tipos).forEach(([t, n]) => {
    const pct = (n / max * 100).toFixed(0);
    html += `
      <div class="rol-barra">
        <div class="fila"><span>${t}</span><span>${n}</span></div>
        <div class="barra"><div style="width:${pct}%; background:#34a853"></div></div>
      </div>`;
  });
  $('#chartTipo').innerHTML = html || '<p class="hint">Sin datos</p>';
}

// ============ RENDER: Tareas por Grado ============
function renderChartGrado() {
  const datos = datosFiltrados();
  const conteo = {};
  datos.forEach(d => conteo[d.Grado] = (conteo[d.Grado] || 0) + 1);
  const max = Math.max(...Object.values(conteo), 1);
  let html = '';
  Object.entries(conteo).sort().forEach(([g, n]) => {
    const pct = (n / max * 100).toFixed(0);
    html += `
      <div class="rol-barra">
        <div class="fila"><span>${g}</span><span>${n} tareas</span></div>
        <div class="barra"><div style="width:${pct}%; background:#ea4335"></div></div>
      </div>`;
  });
  $('#chartGrado').innerHTML = html;
}

// ============ RENDER: Tabla de Entregables ============
function renderEntregables() {
  const datos = datosFiltrados();
  const busq = $('#buscarEntregable').value.toLowerCase().trim();
  const rolFiltro = $('#filtroRolEntregable').value;

  const filtrados = datos.filter(d => {
    const coincideBusq = !busq ||
      (d.Tarea_Detallada || '').toLowerCase().includes(busq) ||
      (d.Entregable_Especifico || '').toLowerCase().includes(busq);
    const coincideRol = !rolFiltro || d.Rol === rolFiltro;
    return coincideBusq && coincideRol;
  });

  const tbody = $('#tablaEntregables tbody');
  tbody.innerHTML = filtrados.map(d => `
    <tr>
      <td>${d.Grado}</td>
      <td style="text-align:center">${d.Semana}</td>
      <td class="rol-${d.Rol}">${d.Rol}</td>
      <td>${d.Tarea_Detallada}</td>
      <td>${d.Entregable_Especifico}</td>
      <td>${d.Rol_Backup || ''}</td>
    </tr>
  `).join('');

  $('#contadorEntregables').textContent = `${filtrados.length} de ${datos.length} tareas`;
}

// ============ RENDER: Ranking ============
function renderRanking() {
  const tbody = $('#tablaRanking tbody');
  const ordenado = [...state.ranking].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

  tbody.innerHTML = ordenado.map((r, i) => {
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
    const clase = i < 3 ? `rank-${i + 1}` : '';
    return `
      <tr class="${clase}" data-id="${r.id}">
        <td style="text-align:center"><span class="medalla">${medalla}</span></td>
        <td contenteditable="true" data-campo="grupo">${r.grupo}</td>
        <td contenteditable="true" data-campo="grado">${r.grado}</td>
        <td contenteditable="true" data-campo="proyecto">${r.proyecto}</td>
        <td contenteditable="true" data-campo="puntos" style="text-align:center">${r.puntos}</td>
        <td style="text-align:center">
          <button class="btn btn-ghost" data-accion="eliminar" data-id="${r.id}" style="padding:4px 8px;font-size:12px">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  // Guardar cambios al editar celdas
  $$('#tablaRanking [contenteditable="true"]').forEach(td => {
    td.addEventListener('blur', () => {
      const tr = td.closest('tr');
      const id = tr.dataset.id;
      const campo = td.dataset.campo;
      const item = state.ranking.find(x => String(x.id) === String(id));
      if (!item) return;
      let valor = td.textContent.trim();
      if (campo === 'puntos') valor = Number(valor) || 0;
      item[campo] = valor;
      guardarEstadoLocal();
      toast('✅ Guardado');
    });
  });

  // Botones eliminar
  $$('#tablaRanking [data-accion="eliminar"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (!confirm('¿Eliminar este grupo?')) return;
      state.ranking = state.ranking.filter(x => String(x.id) !== String(id));
      guardarEstadoLocal();
      renderRanking();
      toast('🗑️ Grupo eliminado');
    });
  });
}

// ============ RENDER: Links ============
function renderLinks() {
  const grid = $('#linksGrid');
  if (!state.links.length) {
    grid.innerHTML = '<p class="hint">No hay links. Haz clic en "Agregar Link" para crear uno.</p>';
    return;
  }
  grid.innerHTML = state.links.map(l => `
    <div class="link-card" data-id="${l.id}">
      <a href="${l.url}" target="_blank" rel="noopener">${l.titulo}</a>
      <p>${l.descripcion || ''}</p>
      <div class="acciones">
        <button data-accion="editar" title="Editar">✏️</button>
        <button data-accion="eliminar" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');

  $$('#linksGrid [data-accion]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const id = btn.closest('.link-card').dataset.id;
      if (btn.dataset.accion === 'eliminar') {
        if (!confirm('¿Eliminar este link?')) return;
        state.links = state.links.filter(x => String(x.id) !== String(id));
        guardarEstadoLocal(); renderLinks(); toast('🗑️ Link eliminado');
      } else {
        const link = state.links.find(x => String(x.id) === String(id));
        abrirModalLink(link);
      }
    });
  });
}

// ============ RENDER: Recursos ============
function renderRecursos() {
  const grid = $('#recursosGrid');
  if (!state.recursos.length) {
    grid.innerHTML = '<p class="hint">No hay recursos. Haz clic en "Agregar Recurso".</p>';
    return;
  }
  grid.innerHTML = state.recursos.map(l => `
    <div class="link-card" data-id="${l.id}">
      <a href="${l.url}" target="_blank" rel="noopener">${l.titulo}</a>
      <p>${l.descripcion || ''}</p>
      <div class="acciones">
        <button data-accion="editar" title="Editar">✏️</button>
        <button data-accion="eliminar" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');

  $$('#recursosGrid [data-accion]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const id = btn.closest('.link-card').dataset.id;
      if (btn.dataset.accion === 'eliminar') {
        if (!confirm('¿Eliminar este recurso?')) return;
        state.recursos = state.recursos.filter(x => String(x.id) !== String(id));
        guardarEstadoLocal(); renderRecursos(); toast('🗑️ Recurso eliminado');
      } else {
        const r = state.recursos.find(x => String(x.id) === String(id));
        abrirModalRecurso(r);
      }
    });
  });
}

// ============ MODALES ============
function abrirModal({ title, campos, onSave }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = campos.map(c => `
    <label>${c.label}</label>
    ${c.type === 'textarea'
      ? `<textarea id="modal-${c.name}" rows="3">${c.value || ''}</textarea>`
      : `<input id="modal-${c.name}" type="${c.type || 'text'}" value="${c.value || ''}">`}
  `).join('');

  $('#modal').classList.add('active');

  $('#modalSave').onclick = () => {
    const valores = {};
    campos.forEach(c => valores[c.name] = $('#modal-' + c.name).value.trim());
    onSave(valores);
    $('#modal').classList.remove('active');
  };
  $('#modalCancel').onclick = () => $('#modal').classList.remove('active');
}

function abrirModalLink(link = null) {
  abrirModal({
    title: link ? '✏️ Editar Link' : '➕ Nuevo Link',
    campos: [
      { name: 'titulo', label: 'Título', value: link?.titulo },
      { name: 'url', label: 'URL', type: 'url', value: link?.url },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', value: link?.descripcion },
    ],
    onSave: (v) => {
      if (!v.titulo || !v.url) { toast('⚠️ Título y URL obligatorios'); return; }
      if (link) Object.assign(link, v);
      else state.links.push({ id: Date.now(), ...v });
      guardarEstadoLocal(); renderLinks(); toast('✅ Guardado');
    }
  });
}

function abrirModalRecurso(r = null) {
  abrirModal({
    title: r ? '✏️ Editar Recurso' : '➕ Nuevo Recurso',
    campos: [
      { name: 'titulo', label: 'Título', value: r?.titulo },
      { name: 'url', label: 'URL', type: 'url', value: r?.url },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', value: r?.descripcion },
    ],
    onSave: (v) => {
      if (!v.titulo || !v.url) { toast('⚠️ Título y URL obligatorios'); return; }
      if (r) Object.assign(r, v);
      else state.recursos.push({ id: Date.now(), ...v });
      guardarEstadoLocal(); renderRecursos(); toast('✅ Guardado');
    }
  });
}

function abrirModalGrupo() {
  abrirModal({
    title: '➕ Nuevo Grupo',
    campos: [
      { name: 'grupo', label: 'Nombre del grupo' },
      { name: 'grado', label: 'Grado', value: '1° Secundaria' },
      { name: 'proyecto', label: 'Proyecto' },
      { name: 'puntos', label: 'Puntos', type: 'number', value: '0' },
    ],
    onSave: (v) => {
      if (!v.grupo) { toast('⚠️ Nombre obligatorio'); return; }
      state.ranking.push({ id: Date.now(), ...v, puntos: Number(v.puntos) || 0 });
      guardarEstadoLocal(); renderRanking(); toast('✅ Grupo agregado');
    }
  });
}

// ============ EXPORTAR RANKING ============
function exportarRankingCSV() {
  const ordenado = [...state.ranking].sort((a, b) => b.puntos - a.puntos);
  const headers = ['Grupo', 'Grado', 'Proyecto', 'Puntos'];
  const filas = [headers, ...ordenado.map(r => [r.grupo, r.grado, r.proyecto, r.puntos])];
  const csv = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ranking.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('⬇️ CSV exportado');
}

// ============ POBLAR FILTROS ============
function poblarFiltros() {
  const grados = [...new Set(state.filas.map(d => d.Grado))].sort();
  const semanas = [...new Set(state.filas.map(d => d.Semana))].sort((a, b) => a - b);

  const selG = $('#filtroGrado');
  selG.innerHTML = '<option value="">Todos los grados</option>' +
    grados.map(g => `<option>${g}</option>`).join('');

  const selS = $('#filtroSemana');
  selS.innerHTML = '<option value="">Todas las semanas</option>' +
    semanas.map(s => `<option>${s}</option>`).join('');
}

// ============ DATOS POR DEFECTO (fallback) ============
const RANKING_DEFAULT = [
  { id: 1, grupo: 'Los Innovadores', grado: '1° Secundaria', proyecto: 'Bodega La Esquina', puntos: 95 },
  { id: 2, grupo: 'Tech Girls', grado: '3° Secundaria', proyecto: 'App de Tutorías', puntos: 92 },
  { id: 3, grupo: 'Emprende 4B', grado: '4° Secundaria', proyecto: 'Marketplace Escolar', puntos: 88 },
  { id: 4, grupo: 'Digitales 2A', grado: '2° Secundaria', proyecto: 'Servicio de Reparación', puntos: 85 },
  { id: 5, grupo: 'Code Team', grado: '3° Secundaria', proyecto: 'Delivery Vecinal', puntos: 80 },
];

const LINKS_DEFAULT = [
  { id: 1, titulo: 'Canva', url: 'https://www.canva.com', descripcion: 'Diseño gráfico online' },
  { id: 2, titulo: 'Glide Apps', url: 'https://www.glideapps.com', descripcion: 'Crear apps sin código' },
  { id: 3, titulo: 'Google Sheets', url: 'https://sheets.google.com', descripcion: 'Hojas de cálculo' },
  { id: 4, titulo: 'Trello', url: 'https://trello.com', descripcion: 'Gestión de proyectos' },
];

const RECURSOS_DEFAULT = [
  { id: 1, titulo: 'Ley 32172 (texto)', url: 'https://www.gob.pe', descripcion: 'Norma sobre uso de computadoras en IE' },
  { id: 2, titulo: 'Lean Canvas (plantilla)', url: 'https://www.canva.com', descripcion: 'Plantilla editable en Canva' },
  { id: 3, titulo: 'Guía de Pitch 60s', url: '#', descripcion: 'Estructura: Gancho, Problema, Solución, CTA' },
];

// ============ DATOS EMBEBIDOS (si falla el fetch del CSV) ============
// Solo unos pocos registros para que el dashboard no quede vacío.
const CSV_EMBEBIDO = [
  { Grado:'1° Secundaria', Proyecto:'Digitalización de Negocio Familiar', Tecnologia:'Canva Web / Carrd.co + WhatsApp', Semana:'1', Tema_Semanal:'Equipo y Problema', Rol:'CEO', Tipo_Rol:'Responsable Principal', Tarea_Detallada:'Entrevistar al dueño con 3 preguntas', Entregable_Especifico:'Foto + respuestas escritas', Rol_Backup:'CTO', Responsabilidad_Backup:'Si CEO no tiene entrevista, CTO llama.', Notas_Ley32172:'Ley 32172: uso computadoras IE. Sin celulares.' },
  { Grado:'1° Secundaria', Proyecto:'Digitalización de Negocio Familiar', Tecnologia:'Canva Web / Carrd.co + WhatsApp', Semana:'1', Tema_Semanal:'Equipo y Problema', Rol:'CTO', Tipo_Rol:'Responsable Principal', Tarea_Detallada:'Crear tablero en Trello con 4 columnas', Entregable_Especifico:'Link del tablero Trello', Rol_Backup:'CFO', Responsabilidad_Backup:'Si CTO falla, CFO crea el tablero.', Notas_Ley32172:'Ley 32172: uso computadoras IE. Sin celulares.' },
  { Grado:'2° Secundaria', Proyecto:'Digitalización de Servicios Locales', Tecnologia:'Canva Web / Carrd.co + Google Forms', Semana:'1', Tema_Semanal:'Equipo y Problema', Rol:'CEO', Tipo_Rol:'Responsable Principal', Tarea_Detallada:'Entrevistar a 3 personas sobre un servicio', Entregable_Especifico:'Doc con 3 respuestas resumidas', Rol_Backup:'CMO', Responsabilidad_Backup:'Si CEO no entrevista, CMO envía mensaje.', Notas_Ley32172:'Ley 32172: uso computadoras IE. Sin celulares.' },
  { Grado:'3° Secundaria', Proyecto:'App Web No-Code con Base de Datos', Tecnologia:'Glide Apps + Google Sheets + Canva', Semana:'1', Tema_Semanal:'Equipo y Problema', Rol:'CTO', Tipo_Rol:'Responsable Principal', Tarea_Detallada:'Crear tablero Trello con 5 columnas + etiquetas', Entregable_Especifico:'Link Trello con 5 columnas', Rol_Backup:'CFO', Responsabilidad_Backup:'Si CTO no crea Trello, CFO lo crea.', Notas_Ley32172:'Ley 32172: uso computadoras IE. Sin celulares.' },
  { Grado:'4° Secundaria', Proyecto:'Tech Startup Escalable', Tecnologia:'Softr.io / Glide + Google Sheets + Canva', Semana:'1', Tema_Semanal:'Equipo y Problema', Rol:'CEO', Tipo_Rol:'Responsable Principal', Tarea_Detallada:'Entrevistar a 3 personas + encuesta Forms', Entregable_Especifico:'Ficha 3 entrevistas + Form 20 respuestas', Rol_Backup:'CMO', Responsabilidad_Backup:'Si CEO no entrega, CMO realiza encuestas.', Notas_Ley32172:'Ley 32172: uso computadoras IE. Sin celulares.' },
];

// ============ INICIALIZACIÓN ============
async function init() {
  // Cargar estado editable
  cargarEstadoLocal();

  // Cargar CSV
  await cargarCSV();

  // Aplicar defaults si no hay nada guardado
  if (!state.ranking.length) state.ranking = RANKING_DEFAULT;
  if (!state.links.length) state.links = LINKS_DEFAULT;
  if (!state.recursos.length) state.recursos = RECURSOS_DEFAULT;

  // Poblar filtros y renderizar
  poblarFiltros();
  renderTodo();

  // ============ EVENTOS ============
  $$('.menu-item').forEach(b => b.addEventListener('click', () => navegar(b.dataset.view)));
  $('#toggleSidebar').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  $('#filtroGrado').addEventListener('change', renderTodo);
  $('#filtroSemana').addEventListener('change', renderTodo);
  $('#btnRefresh').addEventListener('click', async () => {
    await cargarCSV();
    poblarFiltros();
    renderTodo();
    toast('🔄 Datos recargados');
  });

  $('#buscarEntregable').addEventListener('input', renderEntregables);
  $('#filtroRolEntregable').addEventListener('change', renderEntregables);

  $('#btnAgregarGrupo').addEventListener('click', abrirModalGrupo);
  $('#btnExportarRanking').addEventListener('click', exportarRankingCSV);
  $('#btnEditarRanking').addEventListener('click', () => {
    toast('💡 Haz doble clic en las celdas para editar');
  });

  $('#btnAgregarLink').addEventListener('click', () => abrirModalLink());
  $('#btnAgregarRecurso').addEventListener('click', () => abrirModalRecurso());

  // Cerrar modal con clic fuera
  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal') $('#modal').classList.remove('active');
  });
}

function renderTodo() {
  renderKPIs();
  renderMatriz();
  renderChartRoles();
  renderChartTipo();
  renderChartGrado();
  renderEntregables();
  renderRanking();
  renderLinks();
  renderRecursos();
}

document.addEventListener('DOMContentLoaded', init);