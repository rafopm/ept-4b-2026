/* =========================================================
   EMPRENDE DIGITAL 2026 - FRONTEND COMPLETO
   Automatización por Roles, Calificación Ágil, Gamificación y Reportes
   ========================================================= */

const API_URL = window.APP_CONFIG.API_URL;
const STORAGE_SESION = 'emprende_sesion_v2';
const STORAGE_TOKEN = 'google_id_token';
const STORAGE_OFFLINE_PUNTOS = 'emprende_offline_puntos_extra';

let frasesMotivacionales = [];

let state = {
  sesion: null,
  plan: [],
  filas: [],
  ranking: [],
  rankingIndividual: [],
  planMostrarTodasTareas: false,
  miInfo: null,
  equipos: [],
  alumnos: [],
  solicitudesCambioEquipo: [],
  solicitudCambioEquipo: null,
  reporteCalificaciones: null,
  tipoReporteCalificaciones: 'entregas',
  pomodoro: {
    fase: 'enfoque',
    duracionEnfoque: 25,
    duracionDescanso: 5,
    segundosRestantes: 25 * 60,
    finalizaEn: null,
    ciclosCompletados: 0,
    intervalo: null
  },
  entregas: [],
  evidencias: [],
  puntosExtra: [],
  rubricaGrupal: [],
  rubricaIndividual: [],
  recursos: [],
  filtroCategoriaRecurso: '',
  semanaSeleccionadaAlumno: 1,
  sorteo: {
    resultados: [],
    indiceActual: 0,
    segundosRestantes: 300,
    intervalo: null,
    corriendo: false,
    tiempoPorTurnoMin: 5
  }
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

function toast(msg, ms = 2800) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms);
}

function invalidarSesionPorToken(error) {
  if (!/token/i.test(String(error || ''))) return false;

  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_SESION);
  state.sesion = null;
  mostrarLogin();

  const errEl = $('#loginError');
  if (errEl) {
    errEl.textContent = /expir/i.test(String(error))
      ? '⚠️ La sesión de Google expiró. Inicia sesión nuevamente.'
      : '⚠️ ' + error;
  }
  return true;
}

/* ============ API ============ */
async function apiGet(accion, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('accion', accion);

  const idToken = localStorage.getItem(STORAGE_TOKEN);
  if (idToken) url.searchParams.set('id_token', idToken);

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
  if (data.error) {
    invalidarSesionPorToken(data.error);
    throw new Error(data.error);
  }
  return data;
}

async function apiPost(accion, payload = {}) {
  if (!state.sesion) throw new Error('Sin sesión activa');
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
  if (data.error) {
    invalidarSesionPorToken(data.error);
    throw new Error(data.error);
  }
  return data;
}

/* ============ LOGIN GOOGLE ============ */
function handleGoogleCredential(response) {
  const errEl = $('#loginError');
  try {
    if (!response || !response.credential) {
      throw new Error('No se recibió credencial de Google');
    }
    const idToken = response.credential;
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const correo = (payload.email || '').toLowerCase().trim();
    if (!correo) throw new Error('El token no contiene correo');

    localStorage.setItem(STORAGE_TOKEN, idToken);
    hacerLoginConToken(correo);
  } catch (e) {
    if (errEl) errEl.textContent = '⚠️ ' + e.message;
    console.error('Error en credencial de Google:', e);
  }
}

async function hacerLoginConToken(correo) {
  const errEl = $('#loginError');
  try {
    const data = await apiGet('login', { correo });

    if (data.tipo === 'docente') {
      state.sesion = {
        tipo: 'docente',
        correo,
        nombre: data.nombre || correo.split('@')[0]
      };
      // Precargar tablas si vienen en login
      if (data.equipos) state.equipos = data.equipos;
      if (data.alumnos) state.alumnos = data.alumnos;
      if (data.rubrica) state.rubricaGrupal = data.rubrica;
      if (data.rubrica_individual) state.rubricaIndividual = data.rubrica_individual;
      if (data.plan) state.plan = data.plan;
      if (data.evidencias) state.evidencias = data.evidencias;
    } else if (data.tipo === 'alumno') {
      state.sesion = {
        tipo: 'alumno',
        correo,
        alumno: data.alumno,
        equipo: data.equipo,
        nombre: data.alumno.nombre || correo.split('@')[0]
      };
      if (data.evidencias) state.evidencias = data.evidencias;
      if (data.puntos_extra) state.puntosExtra = data.puntos_extra;
    } else {
      throw new Error('Tipo de usuario desconocido');
    }

    localStorage.setItem(STORAGE_SESION, JSON.stringify(state.sesion));
    await arrancarApp();
    mostrarApp();
  } catch (e) {
    if (errEl) errEl.textContent = '⚠️ ' + e.message;
    console.error('Error en login:', e);
    invalidarSesionPorToken(e.message);
  }
}

function cerrarSesion() {
  localStorage.removeItem(STORAGE_SESION);
  localStorage.removeItem(STORAGE_TOKEN);
  location.reload();
}

function tokenVencido(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(b64)).exp;
    return !exp || exp * 1000 < Date.now() + 30000;
  } catch (e) { return true; }
}

function restaurarSesion() {
  try {
    const raw = localStorage.getItem(STORAGE_SESION);
    const token = localStorage.getItem(STORAGE_TOKEN);
    if (raw && token && !tokenVencido(token)) {
      state.sesion = JSON.parse(raw);
    } else {
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

  const contextoAlumno = $('#contextoAlumno');
  if (contextoAlumno && state.sesion.tipo === 'alumno') {
    const alumno = state.sesion.alumno || {};
    const equipo = state.sesion.equipo || {};
    const grado = alumno.grado || equipo.grado;
    const seccion = alumno.seccion || equipo.seccion;
    contextoAlumno.textContent = [grado, seccion ? `Sección ${seccion}` : '']
      .filter(Boolean)
      .join(' · ');
  }

  $('#sidebarNombre').textContent = state.sesion.nombre || state.sesion.correo;
  $('#sidebarRol').textContent = state.sesion.tipo === 'docente'
    ? '👩‍🏫 Docente'
    : `${state.sesion.alumno?.rol || 'Rol'} · ${state.sesion.equipo?.nombre || state.sesion.alumno?.equipo_id || 'Equipo'}`;
}

function mostrarLogin() {
  $('#pantalla-login').style.display = 'flex';
  $('#app').style.display = 'none';
  inicializarGoogleSignIn();
}

let googleSignInInitialized = false;
function inicializarGoogleSignIn() {
  const contenedor = $('#btnGoogleLogin');
  const errEl = $('#loginError');
  if (googleSignInInitialized || !contenedor) return;

  if (!window.google?.accounts?.id) {
    if (window.googleIdentityLoadFailed && errEl) {
      errEl.textContent = '⚠️ No se pudo cargar el servicio de Google. Revisa tu conexión a internet.';
    }
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: window.APP_CONFIG.CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: true,
      cancel_on_tap_outside: false
    });

    google.accounts.id.renderButton(
      contenedor,
      { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular' }
    );
    googleSignInInitialized = true;
    if (errEl && !errEl.textContent.includes('expir')) errEl.textContent = '';
    google.accounts.id.prompt();
  } catch (error) {
    if (errEl) errEl.textContent = '⚠️ Error inicializando Google Identity Services.';
    console.error('Error Google Identity:', error);
  }
}

window.addEventListener('google-identity-loaded', inicializarGoogleSignIn);
window.addEventListener('google-identity-failed', () => {
  window.googleIdentityLoadFailed = true;
  inicializarGoogleSignIn();
});

/* ============ NAVEGACIÓN ============ */
const TITULOS = {
  dashboard: 'Panel de Control',
  'calificacion-agil': 'Calificación Ágil y Automatizada',
  'gestion-equipos': 'Grupos y Roles',
  gamificacion: 'Motor de Gamificación e Incentivos',
  reportes: 'Reportes y Listas Imprimibles',
  sorteo: 'Sorteo y Turnos de Exposición',
  'mi-equipo': 'Mi Equipo',
  'mis-notas': 'Mis Calificaciones',
  ranking: 'Ranking de Equipos',
  'ranking-individual': 'Ranking Individual XP',
  plan: 'Matriz Curricular (Plan Data)',
  recursos: 'Centro de Recursos y Herramientas',
  'tecnicas-estudio': 'Técnicas de Estudio',
  acerca: 'Acerca de'
};

function navegar(view) {
  if (state.sesion.tipo === 'alumno' &&
      (view === 'calificacion-agil' || view === 'gestion-equipos' || view === 'gamificacion' || view === 'reportes' || view === 'sorteo')) return;
  if (state.sesion.tipo === 'docente' &&
      (view === 'mi-equipo' || view === 'mis-notas')) return;

  $$('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $('#viewTitle').textContent = TITULOS[view] || '';

  if (view === 'dashboard') {
    if (state.sesion.tipo === 'alumno') renderDashboardAlumno();
    else renderDashboardDocente();
  }
  if (view === 'calificacion-agil') inicializarCalificacionAgil();
  if (view === 'gestion-equipos') cargarGestion();
  if (view === 'gamificacion') cargarGamificacion();
  if (view === 'reportes') {
    inicializarReportes();
    cargarReporteCalificaciones();
  }
  if (view === 'sorteo') inicializarSorteo();
  if (view === 'ranking') cargarRanking();
  if (view === 'ranking-individual') cargarRankingIndividual();
  if (view === 'mi-equipo') cargarMiEquipo();
  if (view === 'mis-notas') cargarMisNotasAlumno();
  if (view === 'plan') renderPlan();
  if (view === 'recursos') inicializarRecursos();
  if (view === 'tecnicas-estudio') renderPomodoro();

  if (window.innerWidth < 900) $('#sidebar').classList.remove('open');
}

/* ============ MOTOR MOTIVACIONAL ============ */
function ponerFraseMotivadoraAleatoria() {
  const tarjeta = $('#cardMotivacional');
  if (!frasesMotivacionales.length) {
    if (tarjeta) tarjeta.style.display = 'none';
    return;
  }
  const item = frasesMotivacionales[Math.floor(Math.random() * frasesMotivacionales.length)];
  const txt = $('#textoFraseMotivadora');
  const aut = $('#autorFraseMotivadora');
  if (tarjeta && txt && aut) {
    tarjeta.style.display = '';
    txt.textContent = `"${item.frase}"`;
    aut.textContent = `— ${item.autor}`;
  }
}

async function cargarFrasesMotivacionales() {
  try {
    const data = await apiGet('frases');
    const frases = Array.isArray(data.frases)
      ? data.frases.filter(item => item && typeof item.frase === 'string' && item.frase.trim())
      : [];
    frasesMotivacionales = frases;
  } catch (error) {
    frasesMotivacionales = [];
    console.warn('No se pudieron cargar las frases de la hoja Frases.', error);
  }
  ponerFraseMotivadoraAleatoria();
}

function normalizarSemana(valor, defecto = 1) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return defecto;
  const semana = Number(valor);
  return Number.isFinite(semana) ? semana : defecto;
}

function mensajeErrorEntrega(error, semana) {
  const mensaje = error instanceof Error ? error.message : String(error || 'Error desconocido');
  if (semana === 0 && /semana/i.test(mensaje) && /(falta|obligatori|inv[aá]lid|rango|permitid)/i.test(mensaje)) {
    return 'El endpoint de Apps Script configurado rechazó la semana 0. Verifica que la URL configurada corresponda a la implementación actualizada.';
  }
  if (/entrega ya fue enviada/i.test(mensaje)) {
    return 'Esta entrega ya está registrada y bloqueada. Si el envío anterior fue un error, solicita al docente que lo revise.';
  }
  return mensaje;
}

function normalizarGrado(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/\s*secundaria\s*/g, '')
    .replace(/\s+/g, ' ');
}

function rolCoincide(rolesPlan, rolAlumno) {
  const rolNormalizado = String(rolAlumno || '').trim().toUpperCase();
  if (!rolNormalizado) return false;
  return String(rolesPlan || '')
    .split(/[,;|/]+/)
    .some(rol => rol.trim().toUpperCase() === rolNormalizado);
}

function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter]);
}

function enlacePlanHtml(url, texto) {
  const valor = String(url || '').trim();
  if (!valor) return '';
  try {
    const destino = new URL(valor);
    if (!['http:', 'https:'].includes(destino.protocol)) return '';
    return `<a href="${escaparHtml(destino.href)}" target="_blank" rel="noopener noreferrer">${escaparHtml(texto)} ↗</a>`;
  } catch (error) {
    return '';
  }
}

function semanasDisponiblesPlan() {
  const semanas = new Set();
  state.plan.forEach(fila => {
    const valor = fila.Semana;
    if (valor === null || valor === undefined || String(valor).trim() === '') return;
    const semana = Number(valor);
    if (Number.isFinite(semana)) semanas.add(semana);
  });
  return [...semanas].sort((a, b) => a - b);
}

function actualizarSelectoresSemana() {
  const semanas = semanasDisponiblesPlan();
  ['#dashAlumnoSemanaSelect', '#agilSemana'].forEach(selector => {
    const select = $(selector);
    if (!select) return;

    const semanaActual = select.value === '' ? null : normalizarSemana(select.value);
    select.replaceChildren(...(semanas.length ? semanas.map(semana => {
      const opcion = document.createElement('option');
      const fila = state.plan.find(item => normalizarSemana(item.Semana, NaN) === semana);
      const tema = fila?.Tema_Semanal ? ` · ${fila.Tema_Semanal}` : '';
      opcion.value = String(semana);
      opcion.textContent = `Semana ${semana}${tema}`;
      return opcion;
    }) : [new Option('No hay semanas cargadas', '')]));
    const semanaPredeterminada = semanas.includes(1) ? 1 : semanas[0];
    select.value = semanas.includes(semanaActual)
      ? String(semanaActual)
      : String(semanaPredeterminada ?? '');
  });
}

/* ============ CARGAS DE DATOS ============ */
async function cargarPlan() {
  try {
    const data = await apiGet('plan');
    state.plan = data.data || [];
    state.filas = state.plan;
  } catch (e) {
    state.plan = [];
    console.error('Error cargando plan desde el backend:', e);
    toast('⚠️ No se pudo cargar el plan desde el servidor.');
  }
}

async function cargarRanking() {
  try {
    const seccion = state.sesion?.tipo === 'alumno'
      ? state.sesion.alumno?.seccion || state.sesion.equipo?.seccion || ''
      : '';
    const data = await apiGet('ranking', seccion ? { seccion } : {});
    state.ranking = data.ranking || [];
    renderRanking();
  } catch (e) {
    toast('❌ Ranking: ' + e.message);
  }
}

async function cargarRankingIndividual() {
  try {
    const seccion = state.sesion?.tipo === 'alumno'
      ? state.sesion.alumno?.seccion || state.sesion.equipo?.seccion || ''
      : '';
    const data = await apiGet('ranking-individual', seccion ? { seccion } : {});
    state.rankingIndividual = data.ranking || [];
    renderRankingIndividual();
  } catch (e) {
    toast('❌ Ranking individual: ' + e.message);
  }
}

/* =========================================================
   1. DASHBOARD DEL ALUMNO (AUTOMATIZADO POR ROL)
   ========================================================= */
function renderDashboardAlumno() {
  $('#dashboardAlumnoContainer').style.display = 'block';
  $('#dashboardDocenteContainer').style.display = 'none';

  const alumno = state.sesion.alumno;
  const equipo = state.sesion.equipo;
  const semana = normalizarSemana(state.semanaSeleccionadaAlumno);
  const rol = alumno.rol || 'Rol no asignado';

  // Header del alumno
  $('#dashAlumnoBadgeRol').textContent = rol;
  $('#dashAlumnoBadgeRol').className = 'badge-rol' + (alumno.rol ? ' rol-' + alumno.rol : '');
  $('#dashAlumnoTituloProyecto').textContent = equipo.proyecto || 'Proyecto no registrado';
  $('#dashAlumnoSubtitulo').textContent = `${equipo.nombre} · ${alumno.grado || equipo.grado} · Sección ${alumno.seccion || equipo.seccion || '—'}`;

  // Buscar tarea en el Plan Semanal
  const gradoNormalizado = String(alumno.grado || equipo.grado || '').trim();
  const planFila = state.plan.find(p =>
    normalizarGrado(p.Grado) === normalizarGrado(gradoNormalizado) &&
    Number(p.Semana) === semana &&
    rolCoincide(p.Rol, alumno.rol)
  );

  if (planFila) {
    $('#dashAlumnoTemaSemanal').textContent = `Semana ${semana} · ${planFila.Tema_Semanal}`;
    $('#dashAlumnoTareaDetallada').textContent = planFila.Tarea_Detallada;
    $('#dashAlumnoEntregableEspecifico').textContent = planFila.Entregable_Especifico;
    $('#dashAlumnoLey').textContent = planFila.Notas_Ley32172 || 'Uso computadoras IE. Sin celulares.';
    $('#dashAlumnoProyectoNombre').textContent = planFila.Proyecto || equipo.proyecto;
    $('#dashAlumnoTecnologia').textContent = 'Tecnología: ' + (planFila.Tecnologia || 'Herramientas Digitales');
    $('#dashAlumnoGuiaAprendizaje').innerHTML = enlacePlanHtml(
      planFila.Link_Guia_Aprendizaje,
      'Abrir guía de aprendizaje'
    );

    // Red de Seguridad / Backup
    const backupResponsabilidad = planFila.Responsabilidad_Backup || 'Si tu compañero falla, debes cubrir su tarea.';
    $('#dashAlumnoBackupResponsabilidad').innerHTML = `
      <b>Tu Respaldo Asignado:</b> ${planFila.Rol_Backup || 'Compañero'}<br>
      <b>Instrucción de Rescate:</b> "${backupResponsabilidad}"
    `;
  } else {
    $('#dashAlumnoTemaSemanal').textContent = `Semana ${semana}`;
    $('#dashAlumnoTareaDetallada').textContent = 'No hay una tarea configurada para esta semana y rol.';
    $('#dashAlumnoEntregableEspecifico').textContent = 'No hay un entregable configurado para esta semana.';
    $('#dashAlumnoGuiaAprendizaje').innerHTML = '';
    $('#dashAlumnoBackupResponsabilidad').textContent = 'Mantener coordinación activa en el tablero Trello.';
  }

  // Trello URL
  const btnTrello = $('#btnDashTrello');
  if (equipo.trello_url) {
    btnTrello.href = equipo.trello_url;
    btnTrello.style.display = 'inline-flex';
  } else {
    btnTrello.href = '#';
    btnTrello.onclick = (e) => { e.preventDefault(); toast('⚠️ Tu equipo aún no tiene URL de Trello registrada.'); };
  }

  // Verificar evidencia ya cargada para esta semana
  verificarEvidenciaCargadaAlumno(semana);
}

function verificarEvidenciaCargadaAlumno(semana) {
  const correo = state.sesion.correo.toLowerCase().trim();
  const eqId = state.sesion.alumno?.equipo_id;
  const ev = state.evidencias.find(e =>
    String(e.equipo_id).trim() === String(eqId).trim() &&
    Number(e.semana) === Number(semana) &&
    String(e.correo_alumno).toLowerCase().trim() === correo
  );

  const contenedor = $('#estadoEvidenciaCargada');
  const linkEl = $('#linkEvidenciaActual');
  const fechaEl = $('#fechaEvidenciaActual');
  const inputLink = $('#inputLinkEvidencia');
  const inputCom = $('#inputComentarioEvidencia');
  const inputFile = $('#inputFileEvidencia');
  const inputComentarioArchivo = $('#inputComentarioArchivo');
  const bloqueada = Boolean(ev && ev.link_evidencia);

  if (bloqueada) {
    contenedor.style.display = 'flex';
    linkEl.href = ev.link_evidencia;
    linkEl.textContent = ev.link_evidencia;
    fechaEl.textContent = ev.fecha ? `Registrado: ${new Date(ev.fecha).toLocaleString('es-PE')}` : 'Registrado';
    $('#mensajeEntregaBloqueada').style.display = 'block';
    inputLink.value = ev.link_evidencia;
    inputCom.value = ev.comentario_alumno || '';
  } else {
    contenedor.style.display = 'none';
    $('#mensajeEntregaBloqueada').style.display = 'none';
    inputLink.value = '';
    inputCom.value = '';
  }

  inputLink.disabled = bloqueada;
  inputCom.disabled = bloqueada;
  inputFile.disabled = bloqueada;
  inputComentarioArchivo.disabled = bloqueada;
  $('#btnGuardarEvidencia').disabled = bloqueada;
  $('#btnSubirArchivoDrive').disabled = bloqueada;
  $('#btnTabModoLink').disabled = bloqueada;
  $('#btnTabModoArchivo').disabled = bloqueada;
}

async function guardarEvidenciaAlumno(e) {
  e.preventDefault();
  const link = $('#inputLinkEvidencia').value.trim();
  const comentario = $('#inputComentarioEvidencia').value.trim();
  const semana = normalizarSemana(state.semanaSeleccionadaAlumno);
  const alumno = state.sesion.alumno;

  if (state.evidencias.some(ev =>
    String(ev.equipo_id).trim() === String(alumno.equipo_id).trim() &&
    Number(ev.semana) === semana &&
    String(ev.correo_alumno).toLowerCase().trim() === state.sesion.correo.toLowerCase().trim()
  )) {
    toast('⚠️ Ya enviaste esta entrega. No puedes modificarla ni volver a enviarla.');
    verificarEvidenciaCargadaAlumno(semana);
    return;
  }

  if (!link) { toast('⚠️ Ingresa el enlace de tu evidencia'); return; }

  const payload = {
    equipo_id: alumno.equipo_id,
    semana: String(semana),
    correo_alumno: state.sesion.correo,
    rol: alumno.rol || 'CEO',
    link_evidencia: link,
    comentario_alumno: comentario,
    fecha: new Date().toISOString()
  };

  try {
    $('#btnGuardarEvidencia').disabled = true;
    $('#btnGuardarEvidencia').textContent = '⏳ Guardando...';

    const respuesta = await apiPost('guardar-evidencia', payload);
    state.evidencias = state.evidencias.filter(x =>
      !(String(x.equipo_id) === String(payload.equipo_id) &&
        Number(x.semana) === Number(payload.semana) &&
        String(x.correo_alumno).toLowerCase() === payload.correo_alumno.toLowerCase())
    );
    state.evidencias.push({ ...payload, fecha: respuesta.fecha || payload.fecha });
    toast('✅ Evidencia guardada exitosamente');
    verificarEvidenciaCargadaAlumno(semana);
  } catch (err) {
    toast('❌ No se pudo guardar: ' + mensajeErrorEntrega(err, semana));
  } finally {
    $('#btnGuardarEvidencia').disabled = false;
    $('#btnGuardarEvidencia').textContent = '📤 Guardar Enlace';
    verificarEvidenciaCargadaAlumno(semana);
  }
}

async function subirArchivoDriveAlumno(e) {
  e.preventDefault();
  const fileInput = $('#inputFileEvidencia');
  const comentario = $('#inputComentarioArchivo').value.trim();
  const semana = normalizarSemana(state.semanaSeleccionadaAlumno);
  const alumno = state.sesion.alumno;
  const equipoId = alumno.equipo_id || state.sesion.equipo?.id || state.sesion.equipo?.equipo_id || '';
  const correoAlumno = state.sesion.correo || alumno.correo || '';

  if (state.evidencias.some(ev =>
    String(ev.equipo_id).trim() === String(equipoId).trim() &&
    Number(ev.semana) === semana &&
    String(ev.correo_alumno).toLowerCase().trim() === correoAlumno.toLowerCase().trim()
  )) {
    toast('⚠️ Ya enviaste esta entrega. No puedes modificarla ni volver a enviarla.');
    verificarEvidenciaCargadaAlumno(semana);
    return;
  }

  if (!fileInput.files || !fileInput.files.length) {
    toast('⚠️ Selecciona un archivo de tu computadora');
    return;
  }

  const file = fileInput.files[0];

  // Límite de tamaño (Apps Script maneja cómodamente hasta ~15MB en POST)
  if (file.size > 15 * 1024 * 1024) {
    toast('⚠️ El archivo no debe superar los 15MB');
    return;
  }

  const progress = $('#uploadProgress');
  const btnSubir = $('#btnSubirArchivoDrive');

  try {
    btnSubir.disabled = true;
    progress.style.display = 'block';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target.result;
        const base64Data = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '';
        const mimeType = file.type || 'application/octet-stream';

        const payload = {
          equipo_id: equipoId,
          semana: String(semana),
          correo_alumno: correoAlumno,
          rol: alumno.rol || 'CEO',
          nombre_archivo: file.name,
          mime_type: mimeType,
          base64_data: base64Data,
          comentario_alumno: comentario,
          fecha: new Date().toISOString()
        };

        const datosFaltantes = [
          !payload.equipo_id && 'equipo_id',
          !Number.isInteger(payload.semana) && 'semana',
          !payload.correo_alumno && 'correo_alumno',
          !payload.nombre_archivo && 'nombre_archivo',
          !payload.base64_data && 'base64_data'
        ].filter(Boolean);
        if (datosFaltantes.length) {
          throw new Error(`No se pudo preparar el archivo. Faltan datos: ${datosFaltantes.join(', ')}`);
        }

        const resp = await apiPost('subir-archivo', payload);
        const driveUrl = resp.url || ('https://drive.google.com/drive/u/0/search?q=' + encodeURIComponent(file.name));

        // Registrar en state local
        const evItem = {
          equipo_id: equipoId,
          semana: semana,
          correo_alumno: correoAlumno,
          rol: alumno.rol || 'CEO',
          link_evidencia: driveUrl,
          comentario_alumno: comentario || `Archivo subido a Drive: ${file.name}`,
          fecha: new Date().toISOString()
        };

        state.evidencias = state.evidencias.filter(x =>
          !(String(x.equipo_id) === String(evItem.equipo_id) &&
            Number(x.semana) === Number(evItem.semana) &&
            String(x.correo_alumno).toLowerCase() === evItem.correo_alumno.toLowerCase())
        );
        state.evidencias.push(evItem);

        toast(`☁️ Archivo guardado en Drive en: ${resp.carpeta_principal || 'Entregas EPT - San Martín'}`);
        verificarEvidenciaCargadaAlumno(semana);
        fileInput.value = '';
        $('#inputComentarioArchivo').value = '';

      } catch (errApi) {
        const mensaje = mensajeErrorEntrega(errApi, semana);
        toast('❌ Error subiendo a Drive: ' + mensaje);
      } finally {
        verificarEvidenciaCargadaAlumno(semana);
        progress.style.display = 'none';
      }
    };

    reader.onerror = () => {
      toast('❌ Error leyendo el archivo local');
      progress.style.display = 'none';
      verificarEvidenciaCargadaAlumno(semana);
    };

    reader.readAsDataURL(file);

  } catch (err) {
    progress.style.display = 'none';
    verificarEvidenciaCargadaAlumno(semana);
    toast('❌ ' + err.message);
  }
}

/* =========================================================
   2. DASHBOARD DEL DOCENTE (KPIs Y RESUMEN)
   ========================================================= */
function renderDashboardDocente() {
  $('#dashboardAlumnoContainer').style.display = 'none';
  $('#dashboardDocenteContainer').style.display = 'block';

  renderKPIs();
  renderMatriz();
  const d = datosFiltrados();
  renderBarras('#chartRoles', d.reduce((a, x) => { a[x.Rol] = (a[x.Rol] || 0) + 1; return a; }, {}), '#1a73e8');
  renderBarras('#chartGrado', d.reduce((a, x) => { a[x.Grado] = (a[x.Grado] || 0) + 1; return a; }, {}), '#ea4335');
}

function datosFiltrados() {
  const esAlumno = state.sesion?.tipo === 'alumno';
  const seccion = esAlumno ? state.sesion.alumno?.seccion || state.sesion.equipo?.seccion || '' : '';
  const grado = esAlumno ? state.sesion.alumno?.grado || state.sesion.equipo?.grado || '' : '';
  const rol = esAlumno ? state.sesion.alumno?.rol : '';
  return state.plan.filter(f =>
    (!grado || normalizarGrado(f.Grado) === normalizarGrado(grado)) &&
    (!seccion || !f.Seccion || String(f.Seccion).trim() === String(seccion).trim()) &&
    (!rol || rolCoincide(f.Rol, rol))
  );
}

function renderKPIs() {
  const totalEquipos = state.equipos.length;
  const totalAlumnos = state.alumnos.length;
  const totalTareas = state.plan.length;
  const totalXP = state.puntosExtra.reduce((s, p) => s + (Number(p.puntos) || 0), 0);

  $('#kpis').innerHTML = `
    <div class="kpi"><div class="num">${totalEquipos}</div><div class="lbl">Equipos Registrados</div></div>
    <div class="kpi"><div class="num">${totalAlumnos}</div><div class="lbl">Alumnos Asignados</div></div>
    <div class="kpi"><div class="num">${totalTareas}</div><div class="lbl">Consignas Planificadas</div></div>
    <div class="kpi"><div class="num">${totalXP}</div><div class="lbl">XP Extra Otorgados</div></div>
  `;
}

function renderMatriz() {
  const d = state.plan;
  const grados = [...new Set(d.map(x => x.Grado))].sort();
  const semanas = semanasDisponiblesPlan();
  const m = {};
  grados.forEach(g => { m[g] = {}; semanas.forEach(s => m[g][s] = 0); });
  d.forEach(x => {
    const s = Number(x.Semana);
    if (m[x.Grado] && m[x.Grado][s] !== undefined) m[x.Grado][s]++;
  });

  let html = '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Grado</th>';
  semanas.forEach(s => html += `<th style="text-align:center">Sem ${s}</th>`);
  html += '<th style="text-align:center">Total</th></tr></thead><tbody>';
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

/* =========================================================
   3. CALIFICACIÓN ÁGIL Y AUTOMATIZADA (DOCENTE CORE)
   ========================================================= */
let datosCalificacionAgilActual = null;

async function inicializarCalificacionAgil() {
  try {
    // Cargar listas actualizadas
    if (!state.equipos.length || !state.alumnos.length) {
      const login = await apiGet('login', { correo: state.sesion.correo });
      state.equipos = login.equipos || [];
      state.alumnos = login.alumnos || [];
      state.rubricaGrupal = login.rubrica || [];
      state.rubricaIndividual = login.rubrica_individual || [];
      state.evidencias = login.evidencias || [];
    }

    const grados = [...new Set([
      ...state.equipos.map(e => String(e.grado || '').trim()),
      ...state.alumnos.map(a => String(a.grado || '').trim())
    ].filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    $('#agilGrado').innerHTML = '<option value="">-- Seleccionar Grado --</option>' +
      grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
    $('#agilSeccion').innerHTML = '<option value="">-- Primero elija Grado --</option>';
    $('#agilEquipo').innerHTML = '<option value="">-- Primero elija Grado y Sección --</option>';
    $('#agilModalidad').value = 'equipo';
    $('#agilModalidad').disabled = true;
    $('#agilSeccion').disabled = true;
    $('#agilEquipo').disabled = true;
    $('#agilSemana').disabled = true;
    actualizarSemanasCalificacionAgil('');

    $('#agilGrado').onchange = () => {
      const grado = $('#agilGrado').value;
      const equiposGrado = state.equipos.filter(e => normalizarGrado(e.grado) === normalizarGrado(grado));
      const idsEquipos = new Set(equiposGrado.map(e => String(e.equipo_id)));
      const secciones = [...new Set([
        ...equiposGrado.map(e => String(e.seccion || '').trim()),
        ...state.alumnos
          .filter(a => normalizarGrado(a.grado) === normalizarGrado(grado) ||
            (!a.grado && idsEquipos.has(String(a.equipo_id))))
          .map(a => String(a.seccion || '').trim())
      ].filter(Boolean))].sort();
      $('#agilSeccion').innerHTML = '<option value="">-- Seleccionar Sección --</option>' +
        secciones.map(seccion => `<option value="${escaparHtml(seccion)}">${escaparHtml(seccion)}</option>`).join('');
      $('#agilModalidad').value = 'equipo';
      $('#agilModalidad').disabled = true;
      $('#agilEquipo').innerHTML = '<option value="">-- Primero elija Sección --</option>';
      $('#agilSeccion').disabled = !grado || !secciones.length;
      $('#agilEquipo').disabled = true;
      $('#agilSemana').disabled = true;
      actualizarSemanasCalificacionAgil(grado);
      actualizarModoCalificacionAgil();
      ocultarPanelCalificacionAgil();
    };

    $('#agilSeccion').onchange = () => {
      const grado = $('#agilGrado').value;
      const seccion = $('#agilSeccion').value;
      const eqs = state.equipos.filter(e =>
        normalizarGrado(e.grado) === normalizarGrado(grado) &&
        String(e.seccion).trim() === String(seccion).trim()
      );
      $('#agilEquipo').innerHTML = '<option value="">-- Seleccionar Equipo --</option>' +
        eqs.map(e => `<option value="${escaparHtml(e.equipo_id)}">${escaparHtml(e.nombre_equipo)} (${escaparHtml(e.grado)})</option>`).join('');
      $('#agilModalidad').disabled = !seccion;
      $('#agilModalidad').value = 'equipo';
      $('#agilEquipo').disabled = true;
      $('#agilSemana').disabled = true;
      actualizarSemanasCalificacionAgil(grado);
      actualizarModoCalificacionAgil();
      ocultarPanelCalificacionAgil();
    };

    $('#agilModalidad').onchange = () => {
      actualizarModoCalificacionAgil();
      ocultarPanelCalificacionAgil();
    };
    $('#agilEquipo').onchange = () => {
      $('#agilSemana').disabled = !$('#agilEquipo').value;
      ocultarPanelCalificacionAgil();
    };
    $('#agilSemana').onchange = ocultarPanelCalificacionAgil;

    $('#btnCargarCalificacionAgil').onclick = cargarCalificacionAgil;
    $('#btnGuardarTodoAgil').onclick = guardarCalificacionAgilCompleta;
    $('#btnAutoLlenar5').onclick = autoLlenarMaximos;

  } catch (e) {
    toast('❌ Error inicializando calificación: ' + e.message);
  }
}

function actualizarModoCalificacionAgil() {
  const modo = $('#agilModalidad').value;
  const haySeccion = Boolean($('#agilSeccion').value);
  const soloSeccion = modo === 'seccion';
  $('#agilCampoEquipo').style.display = soloSeccion ? 'none' : '';
  $('#agilEquipo').disabled = !haySeccion || soloSeccion;
  $('#agilSemana').disabled = !haySeccion || (!soloSeccion && !$('#agilEquipo').value);
  $('#btnCargarCalificacionAgil').textContent = soloSeccion
    ? '🔄 Cargar alumnos de la sección'
    : '🔄 Cargar Evaluación';
}

function actualizarSemanasCalificacionAgil(grado) {
  const select = $('#agilSemana');
  const semanaActual = select.value;
  const semanas = new Set();
  state.plan.forEach(fila => {
    if (grado && normalizarGrado(fila.Grado) !== normalizarGrado(grado)) return;
    if (fila.Semana === null || fila.Semana === undefined || String(fila.Semana).trim() === '') return;
    const semana = Number(fila.Semana);
    if (Number.isInteger(semana)) semanas.add(semana);
  });
  const semanasOrdenadas = [...semanas].sort((a, b) => a - b);
  select.innerHTML = semanasOrdenadas.length
    ? '<option value="">-- Seleccionar Semana --</option>' +
      semanasOrdenadas.map(semana => `<option value="${semana}">Semana ${semana}</option>`).join('')
    : '<option value="">No hay semanas cargadas</option>';
  select.value = semanasOrdenadas.some(semana => String(semana) === semanaActual) ? semanaActual : '';
}

function semanaSoloIndividual(planSemana, semana) {
  if (Number(semana) === 0) return true;
  return planSemana.some(fila => {
    const tipo = String(fila.Tipo_Calificacion || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return tipo === 'individual' || tipo === 'solo individual';
  });
}

function ocultarPanelCalificacionAgil() {
  $('#agilPanelCalificacion').style.display = 'none';
  $('#agilBannerSemana').style.display = 'none';
  $('#agilAvisoSeccion').style.display = 'none';
}

async function cargarCalificacionAgil() {
  const grado = $('#agilGrado').value;
  const seccion = $('#agilSeccion').value;
  const eqId = $('#agilEquipo').value;
  const modo = $('#agilModalidad').value;
  const individualOnly = modo === 'seccion';
  const semanaSeleccionada = $('#agilSemana').value;
  if (!grado) { toast('⚠️ Por favor selecciona un grado'); return; }
  if (!seccion) { toast('⚠️ Por favor selecciona una sección'); return; }
  if (!individualOnly && !eqId) { toast('⚠️ Por favor selecciona un equipo'); return; }
  if (semanaSeleccionada === '') { toast('⚠️ Por favor selecciona una semana'); return; }
  const semana = normalizarSemana(semanaSeleccionada);

  try {
    $('#btnCargarCalificacionAgil').disabled = true;
    ocultarPanelCalificacionAgil();
    $('#agilLoaderTexto').textContent = individualOnly
      ? 'Cargando estudiantes y calificaciones de la sección…'
      : 'Cargando consignas, evidencias y calificaciones…';
    $('#agilLoader').style.display = 'flex';

    const equiposSeccion = state.equipos.filter(e =>
      normalizarGrado(e.grado) === normalizarGrado(grado) &&
      String(e.seccion).trim() === String(seccion).trim()
    );
    const equiposObjetivo = individualOnly
      ? equiposSeccion
      : equiposSeccion.filter(e => String(e.equipo_id) === String(eqId));
    const idsEquipos = new Set(equiposObjetivo.map(e => String(e.equipo_id)));

    const equipo = individualOnly ? null : equiposObjetivo[0];
    const planSemana = state.plan.filter(p =>
      normalizarGrado(p.Grado) === normalizarGrado(grado) &&
      Number(p.Semana) === semana
    );
    const evaluacionSoloIndividual = semanaSoloIndividual(planSemana, semana);

    const datosPorEquipo = {};
    await Promise.all(equiposObjetivo.map(async equipoObjetivo => {
      datosPorEquipo[String(equipoObjetivo.equipo_id)] = await apiGet('calificacion-semana', {
        equipo_id: equipoObjetivo.equipo_id,
        semana
      });
    }));

    const miembros = state.alumnos.filter(a => idsEquipos.has(String(a.equipo_id)) ||
      (individualOnly &&
        normalizarGrado(a.grado) === normalizarGrado(grado) &&
        String(a.seccion).trim() === String(seccion).trim()));
    if (!miembros.length) throw new Error('No hay alumnos asignados a esta selección.');

    const evidenciasSemana = [
      ...state.evidencias.filter(ev => idsEquipos.has(String(ev.equipo_id)) && Number(ev.semana) === semana),
      ...Object.values(datosPorEquipo).flatMap(datos => datos.evidencias || [])
    ].filter((evidencia, index, lista) =>
      lista.findIndex(otra => String(otra.correo_alumno).toLowerCase() === String(evidencia.correo_alumno).toLowerCase() &&
        String(otra.equipo_id) === String(evidencia.equipo_id)) === index
    );

    datosCalificacionAgilActual = {
      equipo_id: individualOnly ? '' : eqId,
      equipo,
      grado,
      seccion,
      modo: individualOnly ? 'seccion' : 'equipo',
      semana,
      evaluacionSoloIndividual,
      planSemana,
      miembros,
      evidencias: evidenciasSemana,
      datosApi: datosPorEquipo[String(eqId)] || null,
      datosApiPorEquipo: datosPorEquipo
    };

    renderPanelCalificacionAgil();

  } catch (e) {
    toast('❌ ' + e.message);
  } finally {
    $('#agilLoader').style.display = 'none';
    $('#btnCargarCalificacionAgil').disabled = false;
    actualizarModoCalificacionAgil();
  }
}

function renderPanelCalificacionAgil() {
  const { equipo, grado, seccion, modo, semana, evaluacionSoloIndividual, planSemana, miembros, evidencias, datosApi, datosApiPorEquipo = {} } = datosCalificacionAgilActual;
  const esSemanaInicial = semana === 0;
  const evaluacionIndividual = evaluacionSoloIndividual || modo === 'seccion';
  $('#agilBloqueGrupal').style.display = evaluacionIndividual ? 'none' : 'block';
  $('#agilAvisoSemanaInicial').style.display = esSemanaInicial ? 'block' : 'none';
  $('#agilAvisoSeccion').style.display = modo === 'seccion' ? 'block' : 'none';
  $('#agilEstadoCalificacion').textContent = evaluacionIndividual
    ? '🧍 Evaluación individual'
    : datosApi?.calificacion_grupal_existente?.calificado ? '✅ Ya Calificado (Modo Edición)' : '⏳ Pendiente de Calificar';

  // Banner
  $('#agilProyectoNombre').textContent = modo === 'seccion'
    ? `${grado} · Sección ${seccion}`
    : equipo?.proyecto || 'Proyecto Emprendedor';
  $('#agilTecnologia').textContent = planSemana[0]?.Tecnologia || 'Herramientas Digitales';
  $('#agilTrelloLink').innerHTML = equipo?.trello_url
    ? `<a href="${escaparHtml(equipo.trello_url)}" target="_blank" rel="noopener" class="btn-trello" style="padding:2px 8px;font-size:11px">🔗 Abrir Trello ↗</a>`
    : modo === 'seccion' ? '<em>No aplica a toda la sección</em>' : '<em>Sin enlace</em>';

  const yaCalificado = datosApi?.calificacion_grupal_existente?.calificado;
  if (!evaluacionIndividual) {
    $('#agilEstadoCalificacion').textContent = modo === 'seccion'
      ? '🧍 Evaluación individual de sección'
      : yaCalificado ? '✅ Ya Calificado (Modo Edición)' : '⏳ Pendiente de Calificar';
  }
  $('#agilEstadoCalificacion').className = 'badge-estado ' + (yaCalificado && modo !== 'seccion' ? 'calificado' : 'pendiente');
  $('#agilBannerSemana').style.display = 'flex';

  // Consigna grupal de la semana
  $('#agilConsignaGrupalTexto').textContent = evaluacionIndividual
    ? `${planSemana[0]?.Tema_Semanal || `Semana ${semana}`} — Evaluación individual; no se registra nota grupal.`
    : planSemana[0]?.Tema_Semanal
      ? `${planSemana[0].Tema_Semanal} — Todos los miembros deben colaborar en la entrega conjunta.`
      : `Semana ${semana} de trabajo.`;

  // Rúbrica grupal
  const rubricaG = [...(state.rubricaGrupal || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const prevG = datosApi?.calificacion_grupal_existente?.criterios || [];

  $('#tablaRubricaGrupalAgil tbody').innerHTML = evaluacionIndividual ? '' : rubricaG.map(r => {
    const valPrev = prevG.find(p => p.criterio_id === r.criterio_id)?.puntaje ?? (yaCalificado ? 0 : r.peso_max || 5);
    return `
      <tr data-criterio="${r.criterio_id}">
        <td><b>${r.nombre}</b></td>
        <td style="font-size:12px;color:#555">${r.descripcion}</td>
        <td style="text-align:center">
          <input type="number" min="0" max="${r.peso_max || 5}" value="${valPrev}" class="input-puntaje-g" style="padding:6px;width:65px;text-align:center">
        </td>
        <td style="text-align:center;font-weight:bold">${r.peso_max || 5}</td>
        <td>
          <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('tr').querySelector('.input-puntaje-g').value = ${r.peso_max || 5}">Max</button>
        </td>
      </tr>`;
  }).join('');

  $('#agilObsPcG处').value = evaluacionIndividual ? '' : datosApi?.calificacion_grupal_existente?.observacion_pc || '';
  $('#agilComentarioGrupal').value = evaluacionIndividual ? '' : datosApi?.calificacion_grupal_existente?.comentario || '';
  $('#btnGuardarTodoAgil').textContent = evaluacionIndividual
    ? '💾 Guardar calificaciones individuales'
    : '💾 Guardar / Sobrescribir Calificación Semanal';
  $('#btnAutoLlenar5').textContent = evaluacionIndividual
    ? '⭐ Todo 5 (evaluación individual)'
    : '⭐ Todo 5 (Excelente desempeño)';

  // Rúbrica Individual por Alumno
  const rubricaI = [...(state.rubricaIndividual || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const contAlumnos = $('#agilContenedorAlumnos');

  if (!miembros.length) {
    contAlumnos.innerHTML = '<p class="hint" style="grid-column:1/-1">⚠️ Este equipo no tiene alumnos asignados actualmente.</p>';
  } else {
    contAlumnos.innerHTML = miembros.map(al => {
      const rolUpper = String(al.rol || 'CEO').toUpperCase();
      const planRol = planSemana.find(p => rolCoincide(p.Rol, rolUpper)) || {};
      const evAl = evidencias.find(e =>
        String(e.correo_alumno).toLowerCase() === String(al.correo).toLowerCase() &&
        (!al.equipo_id || String(e.equipo_id) === String(al.equipo_id))
      );
      const datosApiAlumno = datosApiPorEquipo[String(al.equipo_id)] || datosApi;

      const prevInd = datosApiAlumno?.calificaciones_individuales_existentes?.find(x =>
        String(x.correo_alumno).toLowerCase() === String(al.correo).toLowerCase()
      );

      const evHTML = evAl?.link_evidencia
        ? `<div class="evidencia-tag-card con-link">
             📦 <b>Evidencia Alumno:</b> <a href="${evAl.link_evidencia}" target="_blank" rel="noopener" class="btn-link-evidencia">Ver trabajo entregado ↗</a>
             ${evAl.comentario_alumno ? `<br><small style="color:#047857">"${evAl.comentario_alumno}"</small>` : ''}
           </div>`
        : `<div class="evidencia-tag-card sin-link">
             ⚠️ Sin evidencia digital registrada por el alumno. Revisar directamente en su PC.
           </div>`;

      const comentarioPrevio = escaparHtml(prevInd?.comentario || '');

      return `
        <div class="alumno-eval-card" data-correo="${escaparHtml(al.correo)}" data-equipo-id="${escaparHtml(al.equipo_id || '')}">
          <div>
            <div class="alumno-eval-header">
              <div>
                <span class="alumno-nombre-tit">${al.nombre || al.correo}</span>
                <span class="badge-rol rol-${al.rol || 'CEO'}">${al.rol || 'CEO'}</span>
              </div>
              <small style="color:#666">${al.dni ? `DNI: ${al.dni}` : al.correo}</small>
            </div>

            <div class="consigna-mini-box">
              <strong>🎯 Tarea según Plan:</strong>
              ${planRol.Tarea_Detallada || 'Realizar actividad asignada al rol.'}
              <div style="margin-top:4px;color:#0b5394">
                <b>Entregable:</b> ${planRol.Entregable_Especifico || 'Evidencia en computadora.'}
              </div>
            </div>

            ${evHTML}

            <div class="acciones-incumplimiento">
              <button type="button" class="btn btn-ghost btn-sm" onclick="aplicarNotaCeroIndividual(this)">
                ⛔ No cumplió: asignar 0
              </button>
              <small>Aplica 0 a todos los criterios individuales. Verifica el trabajo antes de marcarlo.</small>
            </div>

            <div class="retroalimentacion-rapida">
              <label class="lbl-campo" for="mensajeFeedback_${al.correo.replace(/[^a-zA-Z0-9]/g, '_')}">💬 Mensaje breve para el estudiante</label>
              <select id="mensajeFeedback_${al.correo.replace(/[^a-zA-Z0-9]/g, '_')}" class="select select-feedback-ind" onchange="aplicarMensajeRetroalimentacion(this)">
                <option value="">Elegir una sugerencia (puedes editarla)</option>
                <optgroup label="Para mejorar">
                  <option value="No se registró la entrega de esta tarea. Para la próxima, organiza tu tiempo y pide apoyo si algo te impide avanzar.">No presentó la tarea</option>
                  <option value="El trabajo presentado está incompleto y requiere más dedicación. Puedes mejorar siguiendo los pasos y revisando los criterios de la actividad.">Trabajo incompleto o con poco desarrollo</option>
                  <option value="Durante la actividad fue necesario retomar la atención en la tarea. Sé que puedes enfocarte y aportar más en la siguiente sesión.">Se distrajo durante la actividad</option>
                  <option value="Necesitas participar y aportar de manera más constante al trabajo. Puedes hacerlo; empieza proponiéndote una tarea concreta para la próxima sesión.">Participación o esfuerzo insuficiente</option>
                  <option value="La evidencia no permite verificar todo lo solicitado. Completa los pasos pendientes y muestra tu proceso para que podamos reconocer tu avance.">Evidencia insuficiente</option>
                  <option value="Aún necesitas entregar dentro del plazo acordado. Organizar las etapas del trabajo te ayudará a terminar a tiempo.">Entrega fuera del plazo</option>
                </optgroup>
                <optgroup label="Ánimo y reconocimiento">
                  <option value="Vas progresando. Mantén el esfuerzo y sigue practicando: eres capaz de alcanzar el objetivo.">Ánimo para seguir avanzando</option>
                  <option value="Se nota tu esfuerzo y perseverancia. Sigue así; cada paso que das fortalece tu aprendizaje.">Reconocer esfuerzo y perseverancia</option>
                  <option value="Tu participación aportó al equipo. Confía en tus ideas y continúa compartiéndolas.">Reconocer participación</option>
                  <option value="Se observa una mejora respecto al trabajo anterior. Sigue practicando; estás avanzando y puedes lograrlo.">Reconocer progreso</option>
                  <option value="Buen trabajo: cumpliste con lo esperado y puedes seguir creciendo. El siguiente paso es profundizar y probar nuevas ideas.">Reconocer cumplimiento</option>
                </optgroup>
              </select>
              <textarea class="input-full input-feedback-ind" rows="2" maxlength="500" placeholder="Elige una sugerencia o escribe un mensaje breve, respetuoso y específico.">${comentarioPrevio}</textarea>
              <small>Personaliza el mensaje según lo observado. La calificación debe describir el trabajo, no etiquetar a la persona.</small>
            </div>

            <!-- Tabla Criterios Individuales -->
            <table class="tabla" style="font-size:12px;margin:8px 0">
              <thead>
                <tr>
                  <th>Criterio Individual</th>
                  <th style="width:70px;text-align:center">Nota</th>
                  <th style="width:40px;text-align:center">Máx</th>
                </tr>
              </thead>
              <tbody>
                ${rubricaI.map(ri => {
                  const criterioPrevio = prevInd?.criterios?.find(c => c.criterio_id === ri.criterio_id);
                  const puntajePredeterminado = evAl?.link_evidencia
                    ? (prevInd?.calificado ? 0 : Number(ri.peso_max) || 5)
                    : 0;
                  const valPrevI = criterioPrevio?.puntaje ?? puntajePredeterminado;
                  return `
                    <tr data-criterio="${ri.criterio_id}">
                      <td>${ri.nombre}</td>
                      <td style="text-align:center">
                        <input type="number" min="0" max="${ri.peso_max || 5}" value="${valPrevI}" class="input-puntaje-ind" style="padding:4px;width:55px;text-align:center">
                      </td>
                      <td style="text-align:center">${ri.peso_max || 5}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>

            <!-- Responsabilidad Backup & Bonus -->
            <div class="backup-toggle-wrap">
              <input type="checkbox" class="check-backup-bonus" id="chkBackup_${al.correo.replace(/[^a-zA-Z0-9]/g, '_')}">
              <label for="chkBackup_${al.correo.replace(/[^a-zA-Z0-9]/g, '_')}">
                🛡️ <b>Asumió Responsabilidad Backup (+10 XP)</b><br>
                <small style="display:block;margin-top:2px">Cubrió a un compañero inactivo para salvar al equipo.</small>
              </label>
            </div>
          </div>

          <div style="margin-top:10px">
            <input type="text" class="input-obs-ind input-full" placeholder="🔍 Observación PC: evidencia mostrada por el alumno" value="${prevInd?.observacion_pc || ''}" style="font-size:12px;padding:6px">
          </div>
        </div>`;
    }).join('');
  }

  $('#agilPanelCalificacion').style.display = 'block';
  $('#agilStatusGuardado').textContent = '';
}

function autoLlenarMaximos() {
  $$('.input-puntaje-g').forEach(inp => inp.value = inp.max || 5);
  $$('.input-puntaje-ind').forEach(inp => inp.value = inp.max || 5);
  toast('⭐ Todas las notas se establecieron en su valor máximo');
}

function aplicarMensajeRetroalimentacion(select) {
  const campo = select.closest('.retroalimentacion-rapida')?.querySelector('.input-feedback-ind');
  if (campo && select.value) campo.value = select.value;
}

function aplicarNotaCeroIndividual(button) {
  const card = button.closest('.alumno-eval-card');
  if (!card) return;

  const nombre = card.querySelector('.alumno-nombre-tit')?.textContent || 'este alumno';
  if (!confirm(`¿Confirmas asignar 0 en todos los criterios individuales a ${nombre} por no cumplir la tarea?`)) return;

  const puntajes = card.querySelectorAll('.input-puntaje-ind');
  puntajes.forEach(input => { input.value = '0'; });
  toast(`✅ Nota 0 aplicada a ${nombre}. Guarda las calificaciones para registrarla.`);
}

async function guardarCalificacionAgilCompleta() {
  if (!datosCalificacionAgilActual) return;
  const { equipo_id, semana } = datosCalificacionAgilActual;
  const soloIndividual = datosCalificacionAgilActual.evaluacionSoloIndividual ||
    datosCalificacionAgilActual.modo === 'seccion';

  // 1. Recolectar Grupal
  const filasG = soloIndividual ? [] : $$('#tablaRubricaGrupalAgil tbody tr');
  const criteriosGrupales = filasG.map(tr => ({
    criterio_id: tr.dataset.criterio,
    puntaje: Number(tr.querySelector('.input-puntaje-g').value) || 0
  }));
  const obsPcGrupal = $('#agilObsPcG处').value.trim();
  const comGrupal = $('#agilComentarioGrupal').value.trim();

  // 2. Recolectar Individuales
  const cardsAlumnos = $$('.alumno-eval-card');
  const evaluacionesIndividuales = cardsAlumnos.map(card => {
    const correo = card.dataset.correo;
    const filasI = card.querySelectorAll('tbody tr');
    const criterios = [...filasI].map(tr => ({
      criterio_id: tr.dataset.criterio,
      puntaje: Number(tr.querySelector('.input-puntaje-ind').value) || 0
    }));
    const obsInd = card.querySelector('.input-obs-ind').value.trim();
    const comentario = card.querySelector('.input-feedback-ind').value.trim();
    const asumioBackup = card.querySelector('.check-backup-bonus').checked;

    return {
      correo_alumno: correo,
      equipo_id: card.dataset.equipoId,
      criterios,
      comentario,
      observacion_pc: obsInd,
      bonus_backup: asumioBackup ? { puntos: 10, motivo: `Asumió Rol Backup en Semana ${semana}` } : null
    };
  });
  if (evaluacionesIndividuales.some(ind => !ind.correo_alumno || !ind.equipo_id)) {
    toast('❌ No se puede guardar: cada alumno debe tener correo y equipo asignados.');
    return;
  }

  try {
    $('#btnGuardarTodoAgil').disabled = true;
    $('#agilLoaderTexto').textContent = 'Guardando calificaciones…';
    $('#agilLoader').style.display = 'flex';
    $('#agilStatusGuardado').textContent = '⏳ Guardando en la nube...';
    $('#agilStatusGuardado').style.color = 'var(--azul)';

    if (datosCalificacionAgilActual.modo === 'seccion') {
      for (const ind of evaluacionesIndividuales) {
        const entregaIndividual = `${ind.equipo_id}_SEM_${semana}`;
        await apiPost('calificar-individual', {
          entrega_id: entregaIndividual,
          equipo_id: ind.equipo_id,
          correo_alumno: ind.correo_alumno,
          criterios: ind.criterios,
          comentario: ind.comentario,
          observacion_pc: ind.observacion_pc
        });
        if (ind.bonus_backup) {
          await apiPost('otorgar-puntos-extra', {
            tipo_destinatario: 'alumno',
            destinatario_id: ind.correo_alumno,
            puntos: ind.bonus_backup.puntos,
            motivo: ind.bonus_backup.motivo,
            categoria: 'backup'
          });
        }
      }
    } else {
      const entregaId = `${equipo_id}_SEM_${semana}`;
      try {
        await apiPost('guardar-calificacion-semana', {
          equipo_id,
          semana,
          entrega_id: entregaId,
          calificacion_grupal: soloIndividual ? null : {
            criterios: criteriosGrupales,
            comentario: comGrupal,
            observacion_pc: obsPcGrupal
          },
          calificaciones_individuales: evaluacionesIndividuales
        });
      } catch (e) {
        if (!soloIndividual) {
          await apiPost('calificar', {
            entrega_id: entregaId,
            equipo_id,
            criterios: criteriosGrupales,
            comentario: comGrupal,
            observacion_pc: obsPcGrupal
          });
        }
        for (const ind of evaluacionesIndividuales) {
          await apiPost('calificar-individual', {
            entrega_id: `${ind.equipo_id}_SEM_${semana}`,
            equipo_id: ind.equipo_id,
            correo_alumno: ind.correo_alumno,
            criterios: ind.criterios,
            comentario: ind.comentario,
            observacion_pc: ind.observacion_pc
          });

          if (ind.bonus_backup) {
            await apiPost('otorgar-puntos-extra', {
              tipo_destinatario: 'alumno',
              destinatario_id: ind.correo_alumno,
              puntos: 10,
              motivo: ind.bonus_backup.motivo,
              categoria: 'backup'
            });
          }
        }
      }
    }

    $('#agilStatusGuardado').textContent = '✅ Calificación guardada y actualizada exitosamente';
    $('#agilStatusGuardado').style.color = 'var(--verde)';
    toast('✅ Notas guardadas correctamente');

    // Recargar ranking en background
    cargarRanking();
    cargarRankingIndividual();

  } catch (err) {
    $('#agilStatusGuardado').textContent = '❌ Error al guardar: ' + err.message;
    $('#agilStatusGuardado').style.color = 'var(--rojo)';
    toast('❌ Error: ' + err.message);
  } finally {
    $('#agilLoader').style.display = 'none';
    $('#btnGuardarTodoAgil').disabled = false;
  }
}

/* =========================================================
   4. GESTIÓN DE GRUPOS Y ROLES (DOCENTE)
   ========================================================= */
function normalizarBusquedaGestion(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

let equipoEnEdicionActual = '';

async function cargarGestion() {
  try {
    const [eqData, alData] = await Promise.all([
      apiGet('equipos'),
      apiGet('alumnos')
    ]);
    state.equipos = eqData.equipos || [];
    state.alumnos = alData.alumnos || [];

    const grados = [...new Set([
      ...state.equipos.map(e => String(e.grado || '').trim()),
      ...state.alumnos.map(a => String(a.grado || '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    $('#filtroGestionGrado').innerHTML = '<option value="">Todos los grados</option>' +
      grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
    $('#filtroGestionSeccion').innerHTML = '<option value="">Primero elija grado</option>';
    $('#filtroGestionSeccion').disabled = true;

    $('#filtroGestionGrado').onchange = () => {
      poblarSeccionesGestion($('#filtroGestionGrado').value, '#filtroGestionSeccion', true);
      renderEquiposVisuales();
      renderTablaAlumnosGestion();
    };
    $('#filtroGestionSeccion').onchange = () => {
      renderEquiposVisuales();
      renderTablaAlumnosGestion();
    };
    $('#busquedaAlumnoInput').oninput = renderTablaAlumnosGestion;

    renderEquiposVisuales();
    renderTablaAlumnosGestion();

  } catch (e) {
    toast('❌ Error en gestión: ' + e.message);
    return;
  }

  try {
    const boton = $('#btnRecargarSolicitudesEquipo');
    if (boton && !boton._iniciado) {
      boton._iniciado = true;
      boton.onclick = cargarSolicitudesCambioEquipo;
    }
    await cargarSolicitudesCambioEquipo();
  } catch (e) {
    toast('❌ No se pudo cargar la gestión: ' + e.message);
  }
}

async function cargarSolicitudesCambioEquipo() {
  const contador = $('#solicitudesEquipoContador');
  const lista = $('#solicitudesEquipoLista');
  const boton = $('#btnRecargarSolicitudesEquipo');
  contador.textContent = 'Cargando...';
  lista.innerHTML = '<p class="hint">Consultando solicitudes registradas...</p>';
  if (boton) boton.disabled = true;

  try {
    const data = await apiGet('solicitudes-equipo');
    state.solicitudesCambioEquipo = data.solicitudes || [];
    renderSolicitudesCambioEquipo();
  } catch (e) {
    state.solicitudesCambioEquipo = [];
    contador.textContent = 'No disponible';
    const mensaje = /acción inválida/i.test(e.message)
      ? 'El Apps Script conectado todavía no reconoce las solicitudes de cambio. No se pueden listar solicitudes hasta actualizar y volver a implementar code.gs. Como los alumnos tampoco pueden consultar el estado, no deben enviar ni volver a intentar cambios hasta que el docente confirme la actualización.'
      : `No se pudieron consultar las solicitudes. Verifica la conexión y vuelve a intentarlo. Detalle: ${e.message}`;
    lista.innerHTML = `<p class="estado-solicitud-no-disponible">${escaparHtml(mensaje)}</p>`;
  } finally {
    if (boton) boton.disabled = false;
  }
}

function renderSolicitudesCambioEquipo() {
  const lista = $('#solicitudesEquipoLista');
  const solicitudes = state.solicitudesCambioEquipo || [];
  $('#solicitudesEquipoContador').textContent =
    `${solicitudes.length} ${solicitudes.length === 1 ? 'pendiente' : 'pendientes'}`;

  if (!solicitudes.length) {
    lista.innerHTML = '<p class="hint">No hay solicitudes pendientes de aprobación.</p>';
    return;
  }

  lista.innerHTML = solicitudes.map(solicitud => {
    const equipo = state.equipos.find(e => String(e.equipo_id) === String(solicitud.equipo_id));
    const nombreEquipo = equipo?.nombre_equipo || solicitud.nombre_actual || solicitud.equipo_id;
    const solicitado = solicitud.fecha_solicitud
      ? new Date(solicitud.fecha_solicitud).toLocaleString('es-PE')
      : '';
    return `
      <article class="solicitud-equipo-card">
        <div class="solicitud-equipo-cabecera">
          <div>
            <h4>${escaparHtml(nombreEquipo)}</h4>
            <p class="hint">${escaparHtml(equipo?.grado || '')} · Sección ${escaparHtml(equipo?.seccion || '')} · ID ${escaparHtml(solicitud.equipo_id)}</p>
          </div>
          <span class="solicitud-estado pendiente">Pendiente</span>
        </div>
        <p><b>Solicitado por:</b> ${escaparHtml(solicitud.autor_nombre || 'Alumno')} · ${escaparHtml(solicitud.autor_correo || '')}</p>
        ${solicitado ? `<p class="hint">Fecha: ${escaparHtml(solicitado)}</p>` : ''}
        <div class="solicitud-cambios-grid">
          <div><small>Nombre actual</small><p>${escaparHtml(solicitud.nombre_actual || '—')}</p></div>
          <div><small>Nombre propuesto</small><p><b>${escaparHtml(solicitud.nombre_solicitado || '—')}</b></p></div>
          <div><small>Trello actual</small><p>${escaparHtml(solicitud.trello_actual || '—')}</p></div>
          <div><small>Trello propuesto</small><p>${escaparHtml(solicitud.trello_solicitado || '—')}</p></div>
        </div>
        <div class="toolbar solicitud-acciones">
          <button type="button" class="btn btn-ghost btn-rechazar-solicitud" data-solicitud-id="${escaparHtml(solicitud.solicitud_id)}">Rechazar</button>
          <button type="button" class="btn btn-primary btn-aprobar-solicitud" data-solicitud-id="${escaparHtml(solicitud.solicitud_id)}">✅ Aprobar cambio</button>
        </div>
      </article>`;
  }).join('');

  $$('.btn-aprobar-solicitud', lista).forEach(btn => {
    btn.onclick = () => resolverSolicitudCambioEquipo(btn.dataset.solicitudId, 'aprobar');
  });
  $$('.btn-rechazar-solicitud', lista).forEach(btn => {
    btn.onclick = () => resolverSolicitudCambioEquipo(btn.dataset.solicitudId, 'rechazar');
  });
}

async function resolverSolicitudCambioEquipo(solicitudId, decision) {
  const mensaje = decision === 'aprobar'
    ? '¿Aprobar el cambio y actualizar el nombre y Trello de este equipo?'
    : '¿Rechazar esta solicitud? El nombre y Trello actuales se conservarán.';
  if (!window.confirm(mensaje)) return;

  try {
    await apiPost('resolver-solicitud-cambio-equipo', {
      solicitud_id: solicitudId,
      decision
    });
    toast(decision === 'aprobar' ? '✅ Cambio aprobado y aplicado' : 'Solicitud rechazada');
    await cargarGestion();
  } catch (e) {
    toast('❌ No se pudo resolver la solicitud: ' + e.message);
  }
}

function seccionesDisponiblesPorGrado(grado) {
  const equiposGrado = state.equipos.filter(e =>
    !grado || normalizarGrado(e.grado) === normalizarGrado(grado)
  );
  const idsEquipos = new Set(equiposGrado.map(e => String(e.equipo_id)));
  return [...new Set([
    ...equiposGrado.map(e => String(e.seccion || '').trim()),
    ...state.alumnos
      .filter(a => (!grado || normalizarGrado(a.grado) === normalizarGrado(grado)) ||
        (!a.grado && idsEquipos.has(String(a.equipo_id))))
      .map(a => String(a.seccion || '').trim())
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

function poblarSeccionesGestion(grado, selector, incluirTodas = false, seccionSeleccionada = '') {
  const select = $(selector);
  const secciones = seccionesDisponiblesPorGrado(grado);
  const placeholder = incluirTodas ? 'Todas las secciones' : '-- Selecciona sección --';
  select.innerHTML = `<option value="">${placeholder}</option>` +
    secciones.map(seccion => `<option value="${escaparHtml(seccion)}">${escaparHtml(seccion)}</option>`).join('');
  select.disabled = !grado || !secciones.length;
  if (secciones.includes(seccionSeleccionada)) select.value = seccionSeleccionada;
}

function renderEquiposVisuales() {
  const cont = $('#contenedorEquiposVisual');
  const filtroGrado = $('#filtroGestionGrado').value;
  const filtroSec = $('#filtroGestionSeccion').value;

  const equiposFiltrados = state.equipos.filter(e =>
    (!filtroGrado || normalizarGrado(e.grado) === normalizarGrado(filtroGrado)) &&
    (!filtroSec || String(e.seccion).trim() === String(filtroSec).trim())
  );

  if (!equiposFiltrados.length) {
    cont.innerHTML = '<p class="hint" style="grid-column:1/-1">No hay equipos registrados para los filtros seleccionados.</p>';
    return;
  }

  const rolesDefinidos = ['CEO', 'CTO', 'CMO', 'CFO'];

  cont.innerHTML = equiposFiltrados.map(eq => {
    const miembros = state.alumnos.filter(a => String(a.equipo_id) === String(eq.equipo_id));

    const slotsHTML = rolesDefinidos.map(r => {
      const al = miembros.find(m => String(m.rol).toUpperCase() === r);
      return `
        <div class="slot-rol">
          <div class="slot-rol-info">
            <span class="badge-rol rol-${r}" style="font-size:10px;padding:2px 6px">${r}</span>
            ${al ? `<b>${escaparHtml(al.nombre || al.correo)}</b>` : `<span class="slot-vacio">Sin asignar</span>`}
          </div>
          ${al ? `<small style="color:#666">${al.dni || ''}</small>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="equipo-visual-card">
        <div class="eq-card-header">
          <div>
            <h3>${escaparHtml(eq.nombre_equipo)}</h3>
            <small style="color:#666">${escaparHtml(eq.grado)} · ${escaparHtml(eq.proyecto || 'Proyecto')}</small>
          </div>
          <span class="sec-badge">${escaparHtml(eq.seccion || '1A')}</span>
        </div>

        ${eq.trello_url ? `<p style="font-size:12px;margin-bottom:8px">📋 <a href="${escaparHtml(eq.trello_url)}" target="_blank" rel="noopener">Trello oficial ↗</a></p>` : ''}

        <div class="roles-slots">
          ${slotsHTML}
        </div>

        <div class="toolbar" style="margin-top:14px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="editarEquipoModal('${eq.equipo_id}')">✏️ Configurar Roles</button>
          <button class="btn btn-ghost btn-sm" onclick="eliminarEquipoClick('${eq.equipo_id}')" style="color:var(--rojo)">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function renderTablaAlumnosGestion() {
  const tbody = $('#tablaAlumnosGestion tbody');
  const q = normalizarBusquedaGestion($('#busquedaAlumnoInput').value);
  const filtroGrado = $('#filtroGestionGrado').value;
  const filtroSec = $('#filtroGestionSeccion').value;

  const filtrados = state.alumnos.filter(a => {
    const equipo = state.equipos.find(e => String(e.equipo_id) === String(a.equipo_id));
    const gradoAlumno = normalizarGrado(a.grado || equipo?.grado);
    const seccionAlumno = String(a.seccion || equipo?.seccion || '').trim();
    if (filtroGrado && gradoAlumno !== normalizarGrado(filtroGrado)) return false;
    if (filtroSec && seccionAlumno !== filtroSec) return false;
    if (!q) return true;
    const texto = normalizarBusquedaGestion([
      a.nombre, a.nombres, a.apellidos, a.correo, a.dni
    ].filter(Boolean).join(' '));
    return texto.includes(q);
  });

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">No se encontraron estudiantes</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map(a => {
    const equipoAsignado = state.equipos.find(e => String(e.equipo_id) === String(a.equipo_id));
    const eq = equipoAsignado?.nombre_equipo || a.equipo_id || '—';
    return `
      <tr class="${a.equipo_id ? 'alumno-con-equipo' : 'alumno-sin-equipo'}">
        <td><b>${a.nombre || [a.nombres, a.apellidos].filter(Boolean).join(' ') || '—'}</b></td>
        <td>${a.dni || '—'}</td>
        <td>${a.correo}</td>
        <td>${a.grado || '—'}</td>
        <td style="text-align:center">${a.seccion || '—'}</td>
        <td>${a.equipo_id
          ? `<span class="estado-asignacion asignado">● ${escaparHtml(eq)}</span>`
          : '<span class="estado-asignacion disponible">● Sin equipo</span>'}</td>
        <td><span class="badge-rol rol-${a.rol || 'CEO'}" style="font-size:10px;padding:2px 6px">${a.rol || 'CEO'}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="abrirModalAlumnoEdicion('${a.correo}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="eliminarAlumnoClick('${a.correo}')" style="color:var(--rojo)">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

function editarEquipoModal(equipoId) {
  const eq = state.equipos.find(e => String(e.equipo_id) === String(equipoId));
  if (!eq) return;

  const miembros = state.alumnos.filter(a => String(a.equipo_id) === String(equipoId));
  const roles = ['CEO', 'CTO', 'CMO', 'CFO'];

  const slotsSelects = roles.map(r => {
    const actual = miembros.find(m => String(m.rol).toUpperCase() === r);
    return `
      <div class="form-group">
        <label><span class="badge-rol rol-${r}" style="font-size:10px;padding:2px 6px">${r}</span> Asignar Estudiante:</label>
        <input type="search" id="asigBuscar_${r}" class="input-full" placeholder="🔍 Filtrar por nombre o apellido..." autocomplete="off">
        <select id="asigRol_${r}" class="select select-full" style="margin-top:6px">
          <option value="${escaparHtml(actual?.correo || '')}">${escaparHtml(actual?.nombre || actual?.correo || '-- Sin asignar --')}</option>
        </select>
      </div>`;
  }).join('');

  equipoEnEdicionActual = String(eq.equipo_id);
  $('#modalAsignarTitulo').textContent = `Configurar Equipo: ${eq.nombre_equipo}`;
  $('#modalAsignarBody').innerHTML = `
    <div class="form-group">
      <label>Nombre del Equipo:</label>
      <input type="text" id="asigNombreEq" value="${escaparHtml(eq.nombre_equipo || '')}" class="input-full">
    </div>
    <div class="grid-2" style="margin-bottom:12px">
      <div class="form-group">
        <label>Grado:</label>
        <select id="asigGradoEq" class="select select-full">
          <option ${eq.grado === '1° Secundaria' ? 'selected' : ''}>1° Secundaria</option>
          <option ${eq.grado === '2° Secundaria' ? 'selected' : ''}>2° Secundaria</option>
          <option ${eq.grado === '3° Secundaria' ? 'selected' : ''}>3° Secundaria</option>
          <option ${eq.grado === '4° Secundaria' ? 'selected' : ''}>4° Secundaria</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sección:</label>
        <select id="asigSeccionEq" class="select select-full"><option value="">-- Selecciona sección --</option></select>
      </div>
    </div>
    <div class="form-group">
      <label>Proyecto de Emprendimiento:</label>
      <input type="text" id="asigProyectoEq" value="${eq.proyecto || ''}" class="input-full">
    </div>
    <div class="form-group">
      <label>URL Oficial del Tablero Trello:</label>
      <input type="url" id="asigTrelloEq" value="${escaparHtml(eq.trello_url || '')}" placeholder="https://trello.com/b/..." class="input-full">
    </div>
    <h4 style="margin:16px 0 4px;color:var(--azul-oscuro)">Asignación de Roles Obligatorios:</h4>
    <p class="hint">Filtra por nombre o apellido. Los alumnos asignados a otro equipo aparecen en naranja y no se pueden seleccionar.</p>
    ${slotsSelects}
  `;
  poblarSeccionesGestion($('#asigGradoEq').value, '#asigSeccionEq', false, eq.seccion || '');
  roles.forEach(rol => {
    $(`#asigBuscar_${rol}`).oninput = () => actualizarOpcionesAlumnoNuevoEquipo(rol);
    $(`#asigRol_${rol}`).onchange = () => {
      roles.filter(otroRol => otroRol !== rol).forEach(actualizarOpcionesAlumnoNuevoEquipo);
    };
  });
  $('#asigGradoEq').onchange = () => {
    poblarSeccionesGestion($('#asigGradoEq').value, '#asigSeccionEq');
    roles.forEach(actualizarOpcionesAlumnoNuevoEquipo);
  };
  $('#asigSeccionEq').onchange = () => roles.forEach(actualizarOpcionesAlumnoNuevoEquipo);
  roles.forEach(actualizarOpcionesAlumnoNuevoEquipo);

  $('#btnGuardarAsignarEq').onclick = async () => {
    const payload = {
      equipo_id: eq.equipo_id,
      nombre_equipo: $('#asigNombreEq').value.trim(),
      grado: $('#asigGradoEq').value,
      seccion: $('#asigSeccionEq').value,
      proyecto: $('#asigProyectoEq').value.trim(),
      trello_url: $('#asigTrelloEq').value.trim(),
      miembros: roles.map(r => ({
        rol: r,
        correo: $(`#asigRol_${r}`).value
      })).filter(m => Boolean(m.correo))
    };

    try {
      await apiPost('asignar-equipo-completo', payload);
      toast('✅ Equipo y roles actualizados');
      $('#modalAsignarEquipo').classList.remove('active');
      cargarGestion();
    } catch (e) {
      toast('❌ ' + e.message);
    }
  };

  $('#modalAsignarEquipo').classList.add('active');
}

function abrirModalCrearEquipo() {
  const roles = ['CEO', 'CTO', 'CMO', 'CFO'];
  equipoEnEdicionActual = '';
  const slotsSelects = roles.map(r => {
    return `
      <div class="form-group">
        <label><span class="badge-rol rol-${r}" style="font-size:10px;padding:2px 6px">${r}</span> Estudiante Asignado:</label>
        <input type="search" id="asigBuscar_${r}" class="input-full" placeholder="🔍 Escribe nombre o apellido para filtrar alumnos..." autocomplete="off">
        <select id="asigRol_${r}" class="select select-full" style="margin-top:6px">
          <option value="">Escribe un nombre o apellido para buscar</option>
        </select>
      </div>`;
  }).join('');

  $('#modalAsignarTitulo').textContent = '➕ Crear Nuevo Equipo de Emprendimiento';
  $('#modalAsignarBody').innerHTML = `
    <div class="form-group">
      <label>ID del Equipo (opcional o automático):</label>
      <input type="text" id="asigIdEq" placeholder="EQ-1A-01" class="input-full">
    </div>
    <div class="form-group">
      <label>Nombre del Equipo:</label>
      <input type="text" id="asigNombreEq" placeholder="Ej: Los Innovadores" class="input-full" required>
    </div>
    <div class="grid-2" style="margin-bottom:12px">
      <div class="form-group">
        <label>Grado:</label>
        <select id="asigGradoEq" class="select select-full">
          <option value="">-- Seleccionar grado --</option>
          <option>1° Secundaria</option>
          <option>2° Secundaria</option>
          <option>3° Secundaria</option>
          <option>4° Secundaria</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sección:</label>
        <select id="asigSeccionEq" class="select select-full" disabled><option value="">-- Primero elige grado --</option></select>
      </div>
    </div>
    <div class="form-group">
      <label>Proyecto de Emprendimiento:</label>
      <input type="text" id="asigProyectoEq" value="Digitalización de Negocio Familiar" class="input-full">
    </div>
    <div class="form-group">
      <label>URL Oficial del Tablero Trello:</label>
      <input type="url" id="asigTrelloEq" placeholder="https://trello.com/b/..." class="input-full">
    </div>
    <h4 style="margin:16px 0 4px;color:var(--azul-oscuro)">Asignación Inicial de Roles:</h4>
    <p class="hint">Primero elige el grado y la sección. Los alumnos con equipo aparecen en naranja y no se pueden volver a asignar.</p>
    ${slotsSelects}
  `;

  // Auto-sugerir proyecto al cambiar de grado
  $('#asigGradoEq').onchange = () => {
    const g = $('#asigGradoEq').value;
    const mapaProyectos = {
      '1° Secundaria': 'Digitalización de Negocio Familiar',
      '2° Secundaria': 'Digitalización de Servicios Locales',
      '3° Secundaria': 'App Web No-Code con Base de Datos',
      '4° Secundaria': 'Tech Startup Escalable'
    };
    $('#asigProyectoEq').value = mapaProyectos[g] || 'Proyecto Digital';
    poblarSeccionesGestion(g, '#asigSeccionEq');
    roles.forEach(actualizarOpcionesAlumnoNuevoEquipo);
  };
  $('#asigSeccionEq').onchange = () => roles.forEach(actualizarOpcionesAlumnoNuevoEquipo);
  roles.forEach(rol => {
    $(`#asigBuscar_${rol}`).oninput = () => actualizarOpcionesAlumnoNuevoEquipo(rol);
    $(`#asigRol_${rol}`).onchange = () => {
      roles.filter(otroRol => otroRol !== rol).forEach(otroRol => {
        const otroSelect = $(`#asigRol_${otroRol}`);
        if (otroSelect.value && otroSelect.value === $(`#asigRol_${rol}`).value) otroSelect.value = '';
      });
      roles.filter(otroRol => otroRol !== rol).forEach(actualizarOpcionesAlumnoNuevoEquipo);
    };
  });
  roles.forEach(actualizarOpcionesAlumnoNuevoEquipo);

  $('#btnGuardarAsignarEq').onclick = async () => {
    const idGenerado = $('#asigIdEq').value.trim() || ('EQ-' + Date.now().toString().slice(-6));
    const payload = {
      equipo_id: idGenerado,
      nombre_equipo: $('#asigNombreEq').value.trim() || 'Nuevo Equipo',
      grado: $('#asigGradoEq').value,
      seccion: $('#asigSeccionEq').value.trim(),
      proyecto: $('#asigProyectoEq').value.trim(),
      trello_url: $('#asigTrelloEq').value.trim(),
      miembros: roles.map(r => ({
        rol: r,
        correo: $(`#asigRol_${r}`).value
      })).filter(m => Boolean(m.correo))
    };

    try {
      await apiPost('asignar-equipo-completo', payload);
      toast('✅ Equipo creado exitosamente');
      $('#modalAsignarEquipo').classList.remove('active');
      cargarGestion();
    } catch (e) {
      toast('❌ ' + e.message);
    }
  };

  $('#modalAsignarEquipo').classList.add('active');
}

function abrirModalAlumnoEdicion(correo = null) {
  const al = correo ? state.alumnos.find(a => a.correo === correo) : null;
  const esNuevo = !al;

  const eqOpciones = '<option value="">-- Sin equipo --</option>' + state.equipos.map(e => {
    const sel = al && al.equipo_id === e.equipo_id ? 'selected' : '';
    return `<option value="${escaparHtml(e.equipo_id)}" ${sel}>${escaparHtml(e.nombre_equipo)} (${escaparHtml(e.seccion || '')})</option>`;
  }).join('');

  abrirModalGenerico({
    title: esNuevo ? '➕ Registrar Nuevo Alumno' : `✏️ Editar Alumno: ${al.nombre || al.correo}`,
    campos: [
      { name: 'correo', label: 'Correo Google Institucional', type: 'email', value: al?.correo || '', disabled: !esNuevo },
      { name: 'nombres', label: 'Nombres', value: al?.nombres || al?.nombre || '' },
      { name: 'apellidos', label: 'Apellidos', value: al?.apellidos || '' },
      { name: 'dni', label: 'DNI (8 dígitos)', value: al?.dni || '' },
      { name: 'grado', label: 'Grado', value: al?.grado || '1° Secundaria' },
      { name: 'seccion', label: 'Sección', value: al?.seccion || '1A' },
      { name: 'equipo_id', label: 'Equipo Asignado', type: 'select', options: eqOpciones },
      { name: 'rol', label: 'Rol (CEO, CTO, CMO, CFO)', value: al?.rol || 'CEO' }
    ],
    onSave: async (v) => {
      try {
        if (esNuevo) await apiPost('crear-alumno', v);
        else await apiPost('actualizar-alumno', v);
        toast('✅ Alumno guardado');
        cargarGestion();
      } catch (e) {
        toast('❌ ' + e.message);
      }
    }
  });
}

async function eliminarEquipoClick(id) {
  if (!confirm(`¿Eliminar el equipo ${id}? Esta acción no se puede deshacer.`)) return;
  try {
    await apiPost('eliminar-equipo', { equipo_id: id });
    toast('🗑️ Equipo eliminado');
    cargarGestion();
  } catch (e) { toast('❌ ' + e.message); }
}

async function eliminarAlumnoClick(correo) {
  if (!confirm(`¿Eliminar al estudiante ${correo}?`)) return;
  try {
    await apiPost('eliminar-alumno', { correo });
    toast('🗑️ Alumno eliminado');
    cargarGestion();
  } catch (e) { toast('❌ ' + e.message); }
}

/* =========================================================
   5. MOTOR DE GAMIFICACIÓN E INCENTIVOS (XP)
   ========================================================= */
async function cargarGamificacion() {
  try {
    const data = await apiGet('puntos-extra');
    state.puntosExtra = data.puntos_extra || [];
  } catch (e) {
    try {
      state.puntosExtra = JSON.parse(localStorage.getItem(STORAGE_OFFLINE_PUNTOS) || '[]');
    } catch (err) {}
  }
  renderAuditoriaPuntosExtra();
}

function renderAuditoriaPuntosExtra() {
  const tbody = $('#tablaAuditoriaPuntos tbody');
  if (!state.puntosExtra.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px">No hay registros de puntos extra en el sistema</td></tr>';
    return;
  }

  const iconosCat = {
    backup: '🛡️ Backup Rescate',
    companerismo: '🤝 Compañerismo',
    desempeno: '🚀 Calidad MVP',
    innovacion: '💡 Innovación',
    otro: '🎯 Reconocimiento'
  };

  tbody.innerHTML = state.puntosExtra.map(p => `
    <tr>
      <td style="font-size:12px;color:#666">${p.fecha ? new Date(p.fecha).toLocaleDateString('es-PE') : '—'}</td>
      <td><b>${p.destinatario_id}</b></td>
      <td><span class="badge-rol" style="background:#5f6368;font-size:10px">${p.tipo_destinatario}</span></td>
      <td>${iconosCat[p.categoria] || p.categoria || '—'}</td>
      <td style="text-align:center;font-weight:bold;color:#174ea6">+${p.puntos} XP</td>
      <td>${p.motivo}</td>
      <td style="font-size:12px;color:#666">${p.docente || 'Docente'}</td>
    </tr>`).join('');
}

function abrirModalOtorgarXP() {
  // Poblar alumnos y equipos
  $('#xpSelectAlumno').innerHTML = state.alumnos.map(a =>
    `<option value="${a.correo}">${a.nombre || a.correo} (${a.rol} - ${a.seccion || ''})</option>`
  ).join('');

  $('#xpSelectEquipo').innerHTML = state.equipos.map(e =>
    `<option value="${escaparHtml(e.equipo_id)}">${escaparHtml(e.nombre_equipo)} (${escaparHtml(e.seccion || '')})</option>`
  ).join('');

  $('#xpTipoDestinatario').onchange = () => {
    const t = $('#xpTipoDestinatario').value;
    $('#xpGrupoAlumno').style.display = t === 'alumno' ? 'block' : 'none';
    $('#xpGrupoEquipo').style.display = t === 'equipo' ? 'block' : 'none';
  };

  // Chips de puntos
  $$('.btn-chip').forEach(btn => {
    btn.onclick = () => {
      $$('.btn-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('#xpCantidadPuntos').value = btn.dataset.val;
    };
  });

  $('#modalOtorgarXP').classList.add('active');
}

async function confirmarOtorgarXP() {
  const tipo = $('#xpTipoDestinatario').value;
  const dest = tipo === 'alumno' ? $('#xpSelectAlumno').value : $('#xpSelectEquipo').value;
  const pts = Number($('#xpCantidadPuntos').value) || 10;
  const cat = $('#xpCategoria').value;
  const motivo = $('#xpMotivoTexto').value.trim();

  if (!motivo) {
    toast('⚠️ El motivo es obligatorio para la auditoría de puntos');
    $('#xpMotivoTexto').focus();
    return;
  }

  const payload = {
    tipo_destinatario: tipo,
    destinatario_id: dest,
    puntos: pts,
    categoria: cat,
    motivo: motivo,
    fecha: new Date().toISOString()
  };

  try {
    $('#btnConfirmarXP').disabled = true;
    await apiPost('otorgar-puntos-extra', payload);
    toast(`⚡ Se otorgaron +${pts} XP exitosamente`);

    // Guardar offline y en state
    state.puntosExtra.unshift(payload);
    try {
      localStorage.setItem(STORAGE_OFFLINE_PUNTOS, JSON.stringify(state.puntosExtra));
    } catch (e) {}

    $('#modalOtorgarXP').classList.remove('active');
    renderAuditoriaPuntosExtra();
    cargarRanking();
    cargarRankingIndividual();
  } catch (e) {
    // Si falla el backend, registrar en state localmente
    state.puntosExtra.unshift(payload);
    try {
      localStorage.setItem(STORAGE_OFFLINE_PUNTOS, JSON.stringify(state.puntosExtra));
    } catch (err) {}
    toast(`⚡ Registrado localmente: +${pts} XP`);
    $('#modalOtorgarXP').classList.remove('active');
    renderAuditoriaPuntosExtra();
  } finally {
    $('#btnConfirmarXP').disabled = false;
  }
}

/* =========================================================
   6. REPORTES Y EXPORTACIÓN IMPRIMIBLE (DOCENTE)
   ========================================================= */
function inicializarReportes() {
  const grados = [...new Set([
    ...state.equipos.map(e => String(e.grado || '').trim()),
    ...state.alumnos.map(a => String(a.grado || '').trim())
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  $('#reporteFiltroGrado').innerHTML = '<option value="">-- Selecciona un grado --</option>' +
    grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
  $('#reporteFiltroSeccion').innerHTML = '<option value="">-- Primero elige grado --</option>';
  $('#reporteFiltroEquipo').innerHTML = '<option value="">-- Primero elige sección --</option>';
  $('#reporteFiltroSeccion').disabled = true;
  $('#reporteFiltroEquipo').disabled = true;

  $('#reporteFiltroGrado').onchange = () => {
    const grado = $('#reporteFiltroGrado').value;
    const secciones = [...new Set(state.equipos
      .filter(e => normalizarGrado(e.grado) === normalizarGrado(grado))
      .map(e => String(e.seccion || '').trim())
      .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    $('#reporteFiltroSeccion').innerHTML = '<option value="">-- Selecciona una sección --</option>' +
      secciones.map(seccion => `<option value="${escaparHtml(seccion)}">${escaparHtml(seccion)}</option>`).join('');
    $('#reporteFiltroSeccion').disabled = !grado || !secciones.length;
    $('#reporteFiltroEquipo').innerHTML = '<option value="">-- Primero elige sección --</option>';
    $('#reporteFiltroEquipo').disabled = true;
    renderReporteImprimible();
  };

  $('#reporteFiltroSeccion').onchange = () => {
    const grado = $('#reporteFiltroGrado').value;
    const seccion = $('#reporteFiltroSeccion').value;
    const equipos = state.equipos.filter(e =>
      normalizarGrado(e.grado) === normalizarGrado(grado) &&
      String(e.seccion || '').trim() === seccion
    );
    $('#reporteFiltroEquipo').innerHTML = '<option value="">-- Todos los equipos --</option>' +
      equipos.map(e => `<option value="${escaparHtml(e.equipo_id)}">${escaparHtml(e.nombre_equipo)}</option>`).join('');
    $('#reporteFiltroEquipo').disabled = !seccion;
    renderReporteImprimible();
  };

  $('#reporteFiltroEquipo').onchange = renderReporteImprimible;
  $('#checkOcultarDatosSensibles').onchange = renderReporteImprimible;
  $('#btnImprimirReporte').onclick = imprimirReporteListas;

  renderReporteImprimible();
}

function renderReporteImprimible() {
  const gradoFiltro = $('#reporteFiltroGrado').value;
  const secFiltro = $('#reporteFiltroSeccion').value;
  const eqFiltro = $('#reporteFiltroEquipo').value;
  const ocultarSensibles = $('#checkOcultarDatosSensibles').checked;

  $('#reporteFechaEmision').textContent = 'Fecha: ' + new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  let equipos = state.equipos;
  if (gradoFiltro) equipos = equipos.filter(e => normalizarGrado(e.grado) === normalizarGrado(gradoFiltro));
  if (secFiltro) equipos = equipos.filter(e => String(e.seccion).trim() === String(secFiltro).trim());
  if (eqFiltro) equipos = equipos.filter(e => String(e.equipo_id) === String(eqFiltro));

  const cont = $('#reporteContenido');
  if (!equipos.length) {
    cont.innerHTML = '<p class="hint">No hay información para los filtros seleccionados.</p>';
    return;
  }

  // Agrupar por sección
  const secciones = [...new Set(equipos.map(e => e.seccion || 'Sin Sección'))].sort();

  cont.innerHTML = secciones.map(sec => {
    const eqsSec = equipos.filter(e => (e.seccion || 'Sin Sección') === sec);

    const tablasEq = eqsSec.map(eq => {
      const miembros = state.alumnos.filter(a => String(a.equipo_id) === String(eq.equipo_id));

      const filasMiembros = miembros.map((m, idx) => {
        const correoMostrar = ocultarSensibles ? '••••••••@colegiosanmartin.edu.pe' : m.correo;
        const dniMostrar = ocultarSensibles ? '••••••••' : (m.dni || '—');

        return `
          <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td><b>${escaparHtml(m.nombre || [m.nombres, m.apellidos].filter(Boolean).join(' ') || m.correo)}</b></td>
            ${!ocultarSensibles ? `<td>${escaparHtml(dniMostrar)}</td>` : ''}
            <td><span class="badge-rol rol-${m.rol || 'CEO'}" style="font-size:10px;padding:2px 6px">${m.rol || 'CEO'}</span></td>
            <td>${escaparHtml(correoMostrar)}</td>
          </tr>`;
      }).join('');

      return `
        <div style="margin-bottom:20px;border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:#fff">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
            <div>
              <strong style="color:var(--azul-oscuro);font-size:14px">Equipo: ${escaparHtml(eq.nombre_equipo)}</strong>
              <span style="color:#555;margin-left:10px">Grado: ${escaparHtml(eq.grado)} · Proyecto: ${escaparHtml(eq.proyecto || '—')}</span>
            </div>
            <div><b>Trello:</b> ${escaparHtml(eq.trello_url || '—')}</div>
          </div>
          <table class="tabla" style="font-size:11.5px">
            <thead>
              <tr>
                <th style="width:5%;text-align:center">N°</th>
                <th>Estudiante</th>
                ${!ocultarSensibles ? '<th style="width:15%">DNI</th>' : ''}
                <th style="width:15%">Rol Asignado</th>
                <th style="width:30%">Correo Institucional</th>
              </tr>
            </thead>
            <tbody>
              ${filasMiembros || '<tr><td colspan="5" style="text-align:center">Sin miembros registrados</td></tr>'}
            </tbody>
          </table>
        </div>`;
    }).join('');

    return `
      <div class="reporte-seccion-bloque">
        <h3>📍 Sección: ${sec} (${eqsSec.length} Equipos)</h3>
        ${tablasEq}
      </div>`;
  }).join('');
}

async function cargarReporteCalificaciones() {
  const estado = $('#reporteCalificacionesEstado');
  const botonImprimir = $('#btnImprimirCalificaciones');
  estado.textContent = 'Cargando calificaciones y puntos adicionales...';
  botonImprimir.disabled = true;
  try {
    const data = await apiGet('reporte-calificaciones');
    state.reporteCalificaciones = {
      calificaciones: Array.isArray(data.calificaciones) ? data.calificaciones : [],
      puntosExtra: Array.isArray(data.puntos_extra) ? data.puntos_extra : [],
      actualizado: data.actualizado || ''
    };
    inicializarFiltrosReporteCalificaciones();
    estado.textContent = 'Datos actualizados. Selecciona un grado y una sección para consultar o imprimir el reporte.';
    renderReporteCalificaciones();
  } catch (e) {
    state.reporteCalificaciones = null;
    $('#reporteCalificacionesImprimible').style.display = 'none';
    estado.textContent = /reporte-calificaciones/i.test(e.message) && /acción inválida/i.test(e.message)
      ? 'El Apps Script conectado aún no tiene el endpoint de reportes. Actualiza y vuelve a implementar code.gs para consultar las calificaciones detalladas.'
      : `No se pudo cargar el reporte: ${e.message}`;
  }
}

function inicializarFiltrosReporteCalificaciones() {
  const datos = state.reporteCalificaciones;
  const equipos = state.equipos;
  const alumnos = state.alumnos;
  const calificaciones = datos?.calificaciones || [];
  const extras = datos?.puntosExtra || [];
  const grados = [...new Set([
    ...equipos.map(e => String(e.grado || '').trim()),
    ...alumnos.map(a => String(a.grado || '').trim()),
    ...calificaciones.map(c => String(c.grado || '').trim()),
    ...extras.map(x => String(x.grado || '').trim())
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  $('#calificacionesFiltroGrado').innerHTML = '<option value="">-- Selecciona un grado --</option>' +
    grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
  $('#calificacionesFiltroSeccion').innerHTML = '<option value="">-- Primero elige grado --</option>';
  $('#calificacionesFiltroSeccion').disabled = true;
  $('#calificacionesFiltroGrado').onchange = () => {
    const grado = $('#calificacionesFiltroGrado').value;
    const gradoNormalizado = normalizarGrado(grado);
    const secciones = [...new Set([
      ...equipos.filter(e => normalizarGrado(e.grado) === gradoNormalizado).map(e => String(e.seccion || '').trim()),
      ...alumnos.filter(a => normalizarGrado(a.grado) === gradoNormalizado).map(a => String(a.seccion || '').trim()),
      ...calificaciones.filter(c => normalizarGrado(c.grado) === gradoNormalizado).map(c => String(c.seccion || '').trim()),
      ...extras.filter(x => normalizarGrado(x.grado) === gradoNormalizado).map(x => String(x.seccion || '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    $('#calificacionesFiltroSeccion').innerHTML = '<option value="">-- Selecciona una sección --</option>' +
      secciones.map(seccion => `<option value="${escaparHtml(seccion)}">${escaparHtml(seccion)}</option>`).join('');
    $('#calificacionesFiltroSeccion').disabled = !grado || !secciones.length;
    renderReporteCalificaciones();
  };
  $('#calificacionesFiltroSeccion').onchange = renderReporteCalificaciones;

  $('#btnReporteEntregas').onclick = () => {
    state.tipoReporteCalificaciones = 'entregas';
    actualizarTabsReporteCalificaciones();
    renderReporteCalificaciones();
  };
  $('#btnReportePuntosExtra').onclick = () => {
    state.tipoReporteCalificaciones = 'extras';
    actualizarTabsReporteCalificaciones();
    renderReporteCalificaciones();
  };
  $('#btnImprimirCalificaciones').onclick = imprimirReporteCalificaciones;
  actualizarTabsReporteCalificaciones();
}

function actualizarTabsReporteCalificaciones() {
  const entregasActivas = state.tipoReporteCalificaciones === 'entregas';
  $('#btnReporteEntregas').classList.toggle('active', entregasActivas);
  $('#btnReporteEntregas').classList.toggle('btn-ghost', !entregasActivas);
  $('#btnReporteEntregas').setAttribute('aria-pressed', String(entregasActivas));
  $('#btnReportePuntosExtra').classList.toggle('active', !entregasActivas);
  $('#btnReportePuntosExtra').classList.toggle('btn-ghost', entregasActivas);
  $('#btnReportePuntosExtra').setAttribute('aria-pressed', String(!entregasActivas));
}

function renderReporteCalificaciones() {
  const salida = $('#reporteCalificacionesImprimible');
  const grado = $('#calificacionesFiltroGrado').value;
  const seccion = $('#calificacionesFiltroSeccion').value;
  const estado = $('#reporteCalificacionesEstado');
  if (!state.reporteCalificaciones || !grado || !seccion) {
    salida.style.display = 'none';
    $('#btnImprimirCalificaciones').disabled = true;
    if (state.reporteCalificaciones && !grado) estado.textContent = 'Selecciona un grado y una sección para consultar o imprimir el reporte.';
    else if (state.reporteCalificaciones && grado && !seccion) estado.textContent = 'Selecciona una sección para ver el detalle.';
    return;
  }

  const gradoNormalizado = normalizarGrado(grado);
  const calificaciones = state.reporteCalificaciones.calificaciones.filter(registro =>
    normalizarGrado(registro.grado) === gradoNormalizado &&
    String(registro.seccion || '').trim() === seccion
  );
  const extras = state.reporteCalificaciones.puntosExtra.filter(registro =>
    normalizarGrado(registro.grado) === gradoNormalizado &&
    String(registro.seccion || '').trim() === seccion
  );
  const mostrandoEntregas = state.tipoReporteCalificaciones === 'entregas';
  const cantidad = mostrandoEntregas ? calificaciones.length : extras.length;
  const puntos = mostrandoEntregas
    ? calificaciones.reduce((suma, registro) => suma + (Number(registro.puntaje) || 0), 0)
    : extras.reduce((suma, registro) => suma + (Number(registro.puntos) || 0), 0);

  salida.style.display = '';
  $('#btnImprimirCalificaciones').disabled = false;
  $('#reporteCalificacionesFecha').textContent = `Fecha: ${new Date().toLocaleDateString('es-PE')}`;
  $('#reporteCalificacionesSubtitulo').textContent =
    `${mostrandoEntregas ? 'Calificaciones por entrega' : 'Puntos adicionales'} · ${grado} · Sección ${seccion}`;
  $('#reporteCalificacionesResumen').innerHTML = `
    <div><b>${cantidad}</b><span>${mostrandoEntregas ? 'evaluaciones' : 'bonificaciones registradas'}</span></div>
    <div><b>${puntos}</b><span>${mostrandoEntregas ? 'puntos asignados' : 'puntos adicionales'}</span></div>
    <div><b>${grado}</b><span>Grado</span></div>
    <div><b>${escaparHtml(seccion)}</b><span>Sección</span></div>`;

  $('#reporteCalificacionesContenido').innerHTML = mostrandoEntregas
    ? renderTablaReporteEntregas(calificaciones)
    : renderTablaReporteExtras(extras);
  estado.textContent = `${cantidad} ${mostrandoEntregas ? 'evaluaciones' : 'registros de puntos extra'} para ${grado}, sección ${seccion}.`;
}

function renderTablaReporteEntregas(calificaciones) {
  if (!calificaciones.length) return '<p class="hint">No hay calificaciones por entrega para este grado y sección.</p>';
  return `<div class="tabla-wrap"><table class="tabla">
    <thead><tr>
      <th>Fecha</th><th>Semana</th><th>Tipo</th><th>Estudiante / Equipo</th><th>Rol</th>
      <th>Puntaje</th><th>Detalle por criterio</th><th>Observación docente</th><th>Evidencia</th>
    </tr></thead>
    <tbody>${calificaciones.map(registro => {
      const criterios = (registro.criterios || []).map(criterio =>
        `<div class="reporte-criterio"><b>${escaparHtml(criterio.nombre)}</b>: ${Number(criterio.puntaje) || 0}/${Number(criterio.maximo) || 0}${criterio.comentario ? `<br><small>${escaparHtml(criterio.comentario)}</small>` : ''}</div>`
      ).join('');
      const fecha = registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-PE') : '—';
      return `<tr>
        <td>${escaparHtml(fecha)}</td>
        <td>${registro.semana === null ? '—' : escaparHtml(registro.semana)}</td>
        <td>${registro.tipo === 'grupal' ? 'Grupal' : 'Individual'}</td>
        <td><b>${escaparHtml(registro.tipo === 'grupal' ? registro.nombre_equipo : registro.nombre_alumno)}</b><br><small>${escaparHtml(registro.tipo === 'grupal' ? registro.equipo_id : registro.correo_alumno)}</small></td>
        <td>${escaparHtml(registro.rol || '—')}</td>
        <td><b>${Number(registro.puntaje) || 0}/${Number(registro.maximo) || 0}</b></td>
        <td>${criterios || '—'}</td>
        <td>${escaparHtml(registro.observacion_docente || '—')}</td>
        <td>${enlacePlanHtml(registro.evidencia, 'Abrir evidencia') || '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function renderTablaReporteExtras(extras) {
  if (!extras.length) return '<p class="hint">No hay puntos adicionales registrados para este grado y sección.</p>';
  return `<div class="tabla-wrap"><table class="tabla">
    <thead><tr><th>Fecha</th><th>Tipo de destinatario</th><th>Alumno / Equipo</th><th>Equipo</th><th>Puntos</th><th>Categoría</th><th>Motivo</th><th>Docente</th></tr></thead>
    <tbody>${extras.map(registro => `
      <tr>
        <td>${escaparHtml(registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-PE') : '—')}</td>
        <td>${registro.tipo_destinatario === 'equipo' ? 'Equipo' : 'Alumno'}</td>
        <td><b>${escaparHtml(registro.nombre_destinatario || '—')}</b></td>
        <td>${escaparHtml(registro.nombre_equipo || '—')}</td>
        <td><b>+${Number(registro.puntos) || 0}</b></td>
        <td>${escaparHtml(registro.categoria || '—')}</td>
        <td>${escaparHtml(registro.motivo || '—')}</td>
        <td>${escaparHtml(registro.docente || '—')}</td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function imprimirReporteCalificaciones() {
  document.body.classList.add('imprimir-reporte-calificaciones');
  window.addEventListener('afterprint', () => document.body.classList.remove('imprimir-reporte-calificaciones'), { once: true });
  window.print();
}

function imprimirReporteListas() {
  document.body.classList.add('imprimir-reporte-listas');
  window.addEventListener('afterprint', () => document.body.classList.remove('imprimir-reporte-listas'), { once: true });
  window.print();
}

function inicializarPomodoro() {
  const guardado = localStorage.getItem('emprende_pomodoro_v1');
  if (guardado) {
    try {
      const datos = JSON.parse(guardado);
      state.pomodoro.duracionEnfoque = [25, 50].includes(Number(datos.duracionEnfoque)) ? Number(datos.duracionEnfoque) : 25;
      state.pomodoro.duracionDescanso = state.pomodoro.duracionEnfoque === 50 ? 10 : 5;
      state.pomodoro.ciclosCompletados = Math.max(0, Number(datos.ciclosCompletados) || 0);
      if (datos.enMarcha && Number(datos.finalizaEn) > Date.now()) {
        state.pomodoro.fase = datos.fase === 'descanso' ? 'descanso' : 'enfoque';
        state.pomodoro.finalizaEn = Number(datos.finalizaEn);
        state.pomodoro.segundosRestantes = Math.ceil((state.pomodoro.finalizaEn - Date.now()) / 1000);
        state.pomodoro.intervalo = setInterval(actualizarPomodoro, 1000);
      }
    } catch (e) {
      console.warn('No se pudo restaurar el temporizador Pomodoro guardado.', e);
      localStorage.removeItem('emprende_pomodoro_v1');
    }
  }

  $$('[data-focus-minutes]').forEach(boton => {
    boton.onclick = () => {
      if (state.pomodoro.finalizaEn) return;
      state.pomodoro.duracionEnfoque = Number(boton.dataset.focusMinutes);
      state.pomodoro.duracionDescanso = Number(boton.dataset.breakMinutes);
      state.pomodoro.fase = 'enfoque';
      state.pomodoro.segundosRestantes = state.pomodoro.duracionEnfoque * 60;
      guardarPomodoro();
      renderPomodoro();
    };
  });
  $('#btnPomodoroIniciar').onclick = () => {
    if (state.pomodoro.finalizaEn) {
      pausarPomodoro();
    } else {
      state.pomodoro.finalizaEn = Date.now() + state.pomodoro.segundosRestantes * 1000;
      state.pomodoro.intervalo = setInterval(actualizarPomodoro, 1000);
      guardarPomodoro();
      renderPomodoro();
    }
  };
  $('#btnPomodoroReiniciar').onclick = reiniciarPomodoro;
  $('#btnPomodoroSaltar').onclick = () => cambiarFasePomodoro(true);
  renderPomodoro();
}

function guardarPomodoro() {
  localStorage.setItem('emprende_pomodoro_v1', JSON.stringify({
    fase: state.pomodoro.fase,
    duracionEnfoque: state.pomodoro.duracionEnfoque,
    ciclosCompletados: state.pomodoro.ciclosCompletados,
    finalizaEn: state.pomodoro.finalizaEn,
    enMarcha: Boolean(state.pomodoro.finalizaEn)
  }));
}

function actualizarPomodoro() {
  const ahora = Date.now();
  if (state.pomodoro.finalizaEn && ahora >= state.pomodoro.finalizaEn) {
    cambiarFasePomodoro(false);
    return;
  }
  if (state.pomodoro.finalizaEn) {
    state.pomodoro.segundosRestantes = Math.ceil((state.pomodoro.finalizaEn - ahora) / 1000);
  }
  renderPomodoro();
}

function cambiarFasePomodoro(saltar) {
  if (state.pomodoro.fase === 'enfoque') {
    state.pomodoro.ciclosCompletados += 1;
    state.pomodoro.fase = 'descanso';
    state.pomodoro.segundosRestantes = state.pomodoro.duracionDescanso * 60;
    toast(saltar ? 'Bloque de enfoque finalizado; comienza tu descanso.' : '⏰ ¡Bloque completado! Es momento de descansar.');
  } else {
    state.pomodoro.fase = 'enfoque';
    state.pomodoro.segundosRestantes = state.pomodoro.duracionEnfoque * 60;
    toast(saltar ? 'Descanso terminado; ya puedes iniciar otro bloque.' : '⏰ Descanso terminado; prepara tu siguiente bloque.');
  }
  state.pomodoro.finalizaEn = Date.now() + state.pomodoro.segundosRestantes * 1000;
  if (!state.pomodoro.intervalo) state.pomodoro.intervalo = setInterval(actualizarPomodoro, 1000);
  guardarPomodoro();
  renderPomodoro();
}

function pausarPomodoro() {
  state.pomodoro.segundosRestantes = Math.max(0, Math.ceil((state.pomodoro.finalizaEn - Date.now()) / 1000));
  state.pomodoro.finalizaEn = null;
  if (state.pomodoro.intervalo) clearInterval(state.pomodoro.intervalo);
  state.pomodoro.intervalo = null;
  guardarPomodoro();
  renderPomodoro();
}

function reiniciarPomodoro() {
  if (state.pomodoro.intervalo) clearInterval(state.pomodoro.intervalo);
  state.pomodoro.intervalo = null;
  state.pomodoro.finalizaEn = null;
  state.pomodoro.fase = 'enfoque';
  state.pomodoro.segundosRestantes = state.pomodoro.duracionEnfoque * 60;
  guardarPomodoro();
  renderPomodoro();
}

function renderPomodoro() {
  const pomodoro = state.pomodoro;
  const minutos = Math.floor(pomodoro.segundosRestantes / 60);
  const segundos = pomodoro.segundosRestantes % 60;
  const corriendo = Boolean(pomodoro.finalizaEn);
  $('#pomodoroReloj').textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  $('#pomodoroEstado').textContent = corriendo
    ? pomodoro.fase === 'enfoque' ? 'Bloque de enfoque en curso' : 'Descanso en curso'
    : pomodoro.fase === 'enfoque' ? 'Listo para empezar' : 'Descanso listo';
  $('#pomodoroInstruccion').textContent = pomodoro.fase === 'enfoque'
    ? 'Elige una tarea concreta para este bloque de concentración.'
    : 'Aléjate un momento de la pantalla y descansa.';
  $('#pomodoroCiclos').textContent = String(pomodoro.ciclosCompletados);
  $('#btnPomodoroIniciar').textContent = corriendo ? '⏸ Pausar' : pomodoro.segundosRestantes < pomodoro.duracionEnfoque * 60 && pomodoro.fase === 'enfoque' ? '▶ Continuar' : '▶ Iniciar';
  $('#btnPomodoroSaltar').hidden = pomodoro.fase !== 'descanso';
  $$('[data-focus-minutes]').forEach(boton => {
    const seleccionado = Number(boton.dataset.focusMinutes) === pomodoro.duracionEnfoque;
    boton.classList.toggle('active', seleccionado);
    boton.disabled = corriendo;
  });
}

/* =========================================================
   6. SORTEO Y TURNOS DE EXPOSICIÓN / ENTREGAS
   ========================================================= */
async function inicializarSorteo() {
  const loader = $('#sorteoLoader');
  const selectGrado = $('#sorteoGrado');
  const selectSeccion = $('#sorteoSeccion');
  const botonSortear = $('#btnLanzarSorteo');
  if (loader) loader.style.display = 'flex';
  if (botonSortear) botonSortear.disabled = true;

  try {
    if (!state.equipos.length || !state.alumnos.length) {
      const login = await apiGet('login', { correo: state.sesion.correo });
      state.equipos = login.equipos || [];
      state.alumnos = login.alumnos || [];
    }

    const grados = [...new Set([
      ...state.equipos.map(e => String(e.grado || '').trim()),
      ...state.alumnos.map(a => String(a.grado || '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    selectGrado.innerHTML = '<option value="">-- Seleccionar Grado --</option>' +
      grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
    selectSeccion.innerHTML = '<option value="">-- Primero elija Grado --</option>';
    selectSeccion.disabled = true;

    selectGrado.onchange = () => {
      reiniciarSorteo(false);
      const grado = selectGrado.value;
      const equiposGrado = state.equipos.filter(e => normalizarGrado(e.grado) === normalizarGrado(grado));
      const idsEquipos = new Set(equiposGrado.map(e => String(e.equipo_id)));
      const secciones = [...new Set([
        ...equiposGrado.map(e => String(e.seccion || '').trim()),
        ...state.alumnos
          .filter(a => normalizarGrado(a.grado) === normalizarGrado(grado) ||
            (!a.grado && idsEquipos.has(String(a.equipo_id))))
          .map(a => String(a.seccion || '').trim())
      ].filter(Boolean))].sort();
      selectSeccion.innerHTML = '<option value="">-- Seleccionar Sección --</option>' +
        secciones.map(seccion => `<option value="${escaparHtml(seccion)}">Sección ${escaparHtml(seccion)}</option>`).join('');
      selectSeccion.disabled = !grado || !secciones.length;
      botonSortear.disabled = true;
    };

    selectSeccion.onchange = () => {
      reiniciarSorteo(false);
      botonSortear.disabled = !(selectGrado.value && selectSeccion.value);
    };
    botonSortear.onclick = ejecutarSorteo;
    $('#btnReiniciarSorteo').onclick = reiniciarSorteo;
    $('#btnImprimirSorteo').onclick = () => window.print();
    $('#btnCronoPlay').onclick = iniciarCronometroPitch;
    $('#btnCronoPause').onclick = pausarCronometroPitch;
    $('#btnCronoNext').onclick = siguienteTurnoPitch;
    $('#btnCronoReset').onclick = reiniciarRelojPitch;

    if (state.sorteo?.resultados?.length) renderResultadosSorteo();
  } catch (e) {
    toast('❌ No se pudieron cargar los datos para el sorteo: ' + e.message);
    selectGrado.innerHTML = '<option value="">Error al cargar grados</option>';
    selectGrado.disabled = true;
    selectSeccion.disabled = true;
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

async function ejecutarSorteo() {
  const tipo = $('#sorteoTipo').value;
  const grado = $('#sorteoGrado').value;
  const seccion = $('#sorteoSeccion').value;
  const tiempoMin = parseInt($('#sorteoTiempo').value, 10) || 5;

  if (!grado) { toast('⚠️ Selecciona un grado'); return; }
  if (!seccion) { toast('⚠️ Selecciona una sección'); return; }
  if (!state.equipos.length && !state.alumnos.length) {
    toast('⚠️ No hay equipos ni alumnos cargados aún');
    return;
  }

  const botonSortear = $('#btnLanzarSorteo');
  const loader = $('#sorteoLoader');
  const animBox = $('#cajaAnimacionSorteo');
  const txtAnim = $('#textoAnimacionSorteo');
  botonSortear.disabled = true;
  loader.style.display = 'flex';
  $('#sorteoLoaderTexto').textContent = 'Preparando el sorteo…';
  txtAnim.textContent = tipo === 'representante_seccion'
    ? '🎤 ¡Eligiendo al representante de la sección…!'
    : tipo === 'representantes_equipos'
      ? '🎤 ¡Eligiendo un representante por equipo…!'
      : tipo === 'grupos'
        ? '🎲 ¡Sorteando el orden de los equipos…!'
        : '👤 ¡Sorteando el orden de los alumnos…!';
  animBox.style.display = 'block';

  try {
    const esGradoSeccion = registro =>
      normalizarGrado(registro.grado) === normalizarGrado(grado) &&
      String(registro.seccion || '').trim() === String(seccion).trim();
    const equipos = state.equipos.filter(esGradoSeccion);
    const idsEquipos = new Set(equipos.map(e => String(e.equipo_id)));
    const alumnos = state.alumnos.filter(a =>
      esGradoSeccion(a) || idsEquipos.has(String(a.equipo_id))
    );
    const mapearAlumno = (alumno, tipoResultado = 'alumno') => {
      const equipo = state.equipos.find(e => String(e.equipo_id) === String(alumno.equipo_id));
      const nombre = alumno.nombre || [alumno.nombres, alumno.apellidos].filter(Boolean).join(' ') || alumno.correo;
      return {
        tipo: tipoResultado,
        id: alumno.alumno_id || alumno.id || alumno.correo,
        nombre,
        seccion: alumno.seccion || seccion,
        grado: alumno.grado || grado,
        proyecto: `Rol: ${alumno.rol || 'Miembro'} · Equipo: ${equipo?.nombre_equipo || alumno.equipo || 'Sin equipo'}`,
        rol: alumno.rol || '—',
        estado: 'Pendiente'
      };
    };

    let pool = [];
    if (tipo === 'representante_seccion') {
      if (alumnos.length) {
        const elegido = alumnos[Math.floor(Math.random() * alumnos.length)];
        pool = [mapearAlumno(elegido, 'representante')];
        pool[0].proyecto = `Representante elegido para ${grado} · Sección ${seccion}`;
      }
    } else if (tipo === 'alumnos') {
      pool = alumnos.map(a => mapearAlumno(a));
    } else if (tipo === 'representantes_equipos') {
      pool = equipos.flatMap(e => {
        const integrantes = alumnos.filter(a => String(a.equipo_id) === String(e.equipo_id));
        if (!integrantes.length) return [];
        const elegido = integrantes[Math.floor(Math.random() * integrantes.length)];
        const resultado = mapearAlumno(elegido, 'vocero');
        resultado.id = e.equipo_id;
        resultado.proyecto = `Representante de: ${e.nombre_equipo || 'Equipo'} · ${e.proyecto || ''}`;
        return [resultado];
      });
    } else if (tipo === 'grupos') {
      pool = equipos.map(e => ({
        tipo: 'equipo',
        id: e.equipo_id,
        nombre: e.nombre_equipo || e.nombre || `Equipo ${e.equipo_id}`,
        seccion: e.seccion || seccion,
        grado: e.grado || grado,
        proyecto: e.proyecto || 'Proyecto Digital',
        trello: e.trello_url || '',
        estado: 'Pendiente'
      }));
    }

    if (!pool.length) {
      toast('⚠️ No hay alumnos o equipos disponibles para el sorteo elegido.');
      return;
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const ahora = new Date();
    pool.forEach((item, idx) => {
      item.turno = idx + 1;
      const horaTurno = new Date(ahora.getTime() + idx * tiempoMin * 60000);
      item.horaEstimada = horaTurno.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    });

    state.sorteo = {
      tipo,
      grado,
      seccion,
      tiempoPorTurnoMin: tiempoMin,
      segundosRestantes: tiempoMin * 60,
      indiceActual: 0,
      intervalo: null,
      corriendo: false,
      resultados: pool
    };
    pool[0].estado = 'En Exposición';
    await new Promise(resolve => setTimeout(resolve, 900));
    renderResultadosSorteo();
    configurarCronometroParaTurno(0);
    toast(`🎉 Sorteo completado: ${pool.length} ${tipo === 'grupos' ? 'equipos' : 'participantes'}.`);
  } catch (e) {
    toast('❌ No se pudo completar el sorteo: ' + e.message);
  } finally {
    animBox.style.display = 'none';
    loader.style.display = 'none';
    botonSortear.disabled = false;
  }
}

function renderResultadosSorteo() {
  const sorteo = state.sorteo;
  if (!sorteo || !sorteo.resultados || !sorteo.resultados.length) {
    if ($('#sorteoVacio')) $('#sorteoVacio').style.display = 'block';
    if ($('#sorteoTablaWrap')) $('#sorteoTablaWrap').style.display = 'none';
    if ($('#sorteoStatsBar')) $('#sorteoStatsBar').style.display = 'none';
    if ($('#cronoPitchWrap')) $('#cronoPitchWrap').style.display = 'none';
    return;
  }

  if ($('#sorteoVacio')) $('#sorteoVacio').style.display = 'none';
  if ($('#sorteoTablaWrap')) $('#sorteoTablaWrap').style.display = 'block';
  if ($('#sorteoStatsBar')) $('#sorteoStatsBar').style.display = 'flex';
  if ($('#cronoPitchWrap')) $('#cronoPitchWrap').style.display = 'block';

  const total = sorteo.resultados.length;
  const duracionTotal = total * (sorteo.tiempoPorTurnoMin || 5);
  $('#sorteoStatsTotal').textContent = `📊 Total sorteados: ${total} ${sorteo.tipo === 'grupos' ? 'equipos' : 'participantes'}`;
  $('#sorteoStatsTiempoTotal').textContent = `⏱️ Duración estimada total: ${duracionTotal} min (${(duracionTotal / 60).toFixed(1)} h)`;

  const tbody = $('#tbodyResultadosSorteo');
  if (!tbody) return;

  tbody.innerHTML = sorteo.resultados.map((res, idx) => {
    let badgeClass = 'badge-turno';
    if (res.turno === 1) badgeClass += ' turno-1';
    else if (res.turno === 2) badgeClass += ' turno-2';
    else if (res.turno === 3) badgeClass += ' turno-3';

    const esActual = idx === sorteo.indiceActual;
    const filaEstilo = esActual ? 'background:#eff6ff;font-weight:600' : '';

    let estadoBadge = '<span class="badge" style="background:#f1f5f9;color:#475569">⏳ Pendiente</span>';
    if (res.estado === 'En Exposición') {
      estadoBadge = '<span class="badge" style="background:#dbeafe;color:#1e40af;animation:blink 1.5s infinite">🎤 En Exposición</span>';
    } else if (res.estado === 'Finalizado') {
      estadoBadge = '<span class="badge" style="background:#dcfce7;color:#166534">✅ Expuesto</span>';
    }

    const accionEvaluar = (state.sesion?.tipo === 'docente' && (res.tipo === 'equipo' || res.tipo === 'vocero'))
      ? `<button class="btn btn-ghost btn-sm" onclick="saltarAEvaluarEquipo('${res.id}')" title="Calificar este equipo">⚡ Calificar</button>`
      : '';

    return `
      <tr style="${filaEstilo}">
        <td style="text-align:center"><span class="${badgeClass}">${res.turno}</span></td>
        <td>
          <b>${res.nombre}</b>
          ${res.trello ? `<br><a href="${res.trello}" target="_blank" rel="noopener" style="font-size:11px;color:var(--azul)">📋 Trello ↗</a>` : ''}
        </td>
        <td style="text-align:center"><span class="badge badge-sec">${res.seccion}</span></td>
        <td><small>${escaparHtml(res.proyecto)}</small></td>
        <td style="text-align:center;font-weight:700;color:var(--azul-oscuro)">${res.horaEstimada}</td>
        <td style="text-align:center" class="no-print">
          ${estadoBadge}
          <div style="margin-top:4px">${accionEvaluar}</div>
        </td>
      </tr>`;
  }).join('');
}

/* ============ CRONÓMETRO DE PITCH INTEGRADO ============ */
function configurarCronometroParaTurno(indice) {
  const sorteo = state.sorteo;
  if (!sorteo || !sorteo.resultados || !sorteo.resultados[indice]) return;

  sorteo.indiceActual = indice;
  sorteo.segundosRestantes = (sorteo.tiempoPorTurnoMin || 5) * 60;
  pausarCronometroPitch();

  const actual = sorteo.resultados[indice];
  const lbl = $('#cronoTurnoActualLabel');
  if (lbl) lbl.textContent = `Turno ${actual.turno}: ${actual.nombre}`;
  actualizarDisplayCronometro();
}

function actualizarDisplayCronometro() {
  const segs = Math.max(0, state.sorteo?.segundosRestantes || 0);
  const m = Math.floor(segs / 60);
  const s = segs % 60;
  const display = $('#cronoDisplay');
  if (!display) return;

  display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  display.classList.remove('advertencia', 'tiempo-agotado');
  const sub = $('#cronoSubtitulo');
  if (segs <= 0) {
    display.classList.add('tiempo-agotado');
    if (sub) sub.textContent = '⚠️ ¡TIEMPO CONCLUIDO! Por favor concluyan la exposición.';
  } else if (segs <= 60) {
    display.classList.add('advertencia');
    if (sub) sub.textContent = '⏳ Último minuto de exposición';
  } else {
    if (sub) sub.textContent = 'Tiempo restante para exponer';
  }
}

function iniciarCronometroPitch() {
  if (state.sorteo.corriendo) return;
  state.sorteo.corriendo = true;
  const btnPlay = $('#btnCronoPlay');
  const btnPause = $('#btnCronoPause');
  if (btnPlay) btnPlay.style.display = 'none';
  if (btnPause) btnPause.style.display = 'inline-block';

  clearInterval(state.sorteo.intervalo);
  state.sorteo.intervalo = setInterval(() => {
    if (state.sorteo.segundosRestantes > 0) {
      state.sorteo.segundosRestantes--;
      actualizarDisplayCronometro();
      if (state.sorteo.segundosRestantes === 0) {
        sonarAlarmaPitch();
      }
    } else {
      pausarCronometroPitch();
    }
  }, 1000);
}

function pausarCronometroPitch() {
  state.sorteo.corriendo = false;
  clearInterval(state.sorteo.intervalo);
  state.sorteo.intervalo = null;
  const btnPlay = $('#btnCronoPlay');
  const btnPause = $('#btnCronoPause');
  if (btnPlay) btnPlay.style.display = 'inline-block';
  if (btnPause) btnPause.style.display = 'none';
}

function siguienteTurnoPitch() {
  pausarCronometroPitch();
  const sorteo = state.sorteo;
  if (!sorteo || !sorteo.resultados) return;

  if (sorteo.resultados[sorteo.indiceActual]) {
    sorteo.resultados[sorteo.indiceActual].estado = 'Finalizado';
  }

  if (sorteo.indiceActual + 1 < sorteo.resultados.length) {
    sorteo.indiceActual++;
    sorteo.resultados[sorteo.indiceActual].estado = 'En Exposición';
    configurarCronometroParaTurno(sorteo.indiceActual);
    renderResultadosSorteo();
    toast(`🎤 Iniciando Turno ${sorteo.indiceActual + 1}: ${sorteo.resultados[sorteo.indiceActual].nombre}`);
  } else {
    renderResultadosSorteo();
    toast('🎉 ¡Han finalizado todas las exposiciones del sorteo!');
  }
}

function reiniciarRelojPitch() {
  pausarCronometroPitch();
  state.sorteo.segundosRestantes = (state.sorteo.tiempoPorTurnoMin || 5) * 60;
  actualizarDisplayCronometro();
}

function reiniciarSorteo(mostrarAviso = true) {
  pausarCronometroPitch();
  state.sorteo.resultados = [];
  state.sorteo.indiceActual = 0;
  renderResultadosSorteo();
  if (mostrarAviso) toast('🔄 Sorteo reiniciado');
}

function sonarAlarmaPitch() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {}
}

function saltarAEvaluarEquipo(equipoId) {
  navegar('calificacion-agil');
  setTimeout(() => {
    const selEq = $('#agilEquipo');
    if (selEq) {
      selEq.value = equipoId;
      if ($('#btnCargarCalificacionAgil')) $('#btnCargarCalificacionAgil').click();
    }
  }, 300);
}
window.saltarAEvaluarEquipo = saltarAEvaluarEquipo;

/* =========================================================
   7. MI EQUIPO Y MIS CALIFICACIONES (ALUMNO)
   ========================================================= */
function renderMiEquipo() {
  const al = state.sesion?.alumno;
  const eq = state.sesion?.equipo;
  if (!al || !eq) return;

  const miembros = eq.companeros || [];

  const slots = ['CEO', 'CTO', 'CMO', 'CFO'].map(r => {
    const c = miembros.find(m => String(m.rol).toUpperCase() === r);
    return `
      <div class="slot-rol" style="padding:12px">
        <div class="slot-rol-info">
          <span class="badge-rol rol-${r}">${r}</span>
          <div>
            <b>${escaparHtml(c?.nombre || 'Vacante')}</b>
            <small style="display:block;color:#666">${escaparHtml(c?.correo || '')}</small>
          </div>
        </div>
      </div>`;
  }).join('');

  const solicitud = state.solicitudCambioEquipo;
  const estadoSolicitudNormalizado = normalizarBusquedaGestion(solicitud?.estado || '');
  const pendiente = estadoSolicitudNormalizado === 'pendiente';
  const tieneEquipo = Boolean(al.equipo_id || eq.id);
  const solicitudNoDisponible = state.solicitudCambioDisponible === false;
  const avisoSolicitud = pendiente
    ? 'Tu solicitud está pendiente de revisión. No envíes otra mientras el profesor la revisa; las bromas o propuestas inadecuadas serán rechazadas.'
    : estadoSolicitudNormalizado === 'aprobada'
      ? 'El último cambio fue aprobado y ya está aplicado. Si necesitas otro cambio, envía una nueva solicitud para que el profesor la revise.'
      : estadoSolicitudNormalizado === 'rechazada'
        ? 'La última solicitud fue rechazada y los datos actuales del equipo se mantienen. Puedes proponer un cambio apropiado; el profesor deberá aprobarlo.'
        : 'Los cambios se aplican solo después de la aprobación del profesor. Las solicitudes quedan registradas con el nombre de quien las envía; las bromas o propuestas inadecuadas serán rechazadas.';
  const nombreFormulario = pendiente ? solicitud.nombre_solicitado : eq.nombre;
  const trelloFormulario = pendiente ? solicitud.trello_solicitado : eq.trello_url;
  const estadoSolicitud = solicitud
    ? `<div class="solicitud-estado-alumno ${pendiente ? 'pendiente' : ''}">
        <b>${pendiente ? '⏳ Solicitud pendiente de aprobación docente' : `Estado de la última solicitud: ${escaparHtml(solicitud.estado)}`}</b>
        <p>Enviada por <b>${escaparHtml(solicitud.autor_nombre || 'Alumno')}</b>${solicitud.fecha_solicitud ? ` · ${escaparHtml(new Date(solicitud.fecha_solicitud).toLocaleString('es-PE'))}` : ''}.</p>
        <p>Nombre solicitado: <b>${escaparHtml(solicitud.nombre_solicitado || '—')}</b></p>
        ${solicitud.trello_solicitado ? `<p>Enlace solicitado: ${escaparHtml(solicitud.trello_solicitado)}</p>` : ''}
        ${solicitud.respuesta_por ? `<p>Revisado por docente: ${escaparHtml(solicitud.respuesta_por)}</p>` : ''}
      </div>`
    : '';

  $('#infoMiEquipo').innerHTML = `
    <div style="margin-bottom:20px">
      <h3>${escaparHtml(eq.nombre)}</h3>
      <p class="hint">${escaparHtml(eq.grado)} · Sección ${escaparHtml(eq.seccion || '—')} · Proyecto: <b>${escaparHtml(eq.proyecto)}</b></p>
      ${eq.trello_url ? `<p style="margin-top:8px">📋 Tablero Trello: <a href="${escaparHtml(eq.trello_url)}" target="_blank" rel="noopener" class="btn-trello">Abrir Trello ↗</a></p>` : ''}
    </div>

    <div class="solicitud-edicion-equipo">
      <h4>✏️ Proponer cambios al nombre o al enlace de Trello</h4>
      <p class="aviso-solicitud-equipo ${estadoSolicitudNormalizado === 'aprobada' ? 'aprobada' : ''}"><b>${estadoSolicitudNormalizado === 'aprobada' ? '✅ Cambio aprobado:' : pendiente ? '⏳ Solicitud en revisión:' : 'Importante:'}</b> ${escaparHtml(avisoSolicitud)}</p>
      ${!tieneEquipo ? '<p class="hint">Aún no tienes un equipo asignado; solicita ayuda al docente.</p>' : ''}
      ${solicitudErrorEquipo ? `<p class="estado-solicitud-no-disponible">${escaparHtml(solicitudErrorEquipo)}</p>` : ''}
      ${estadoSolicitud}
      <form id="formSolicitudCambioEquipo" class="form-solicitud-equipo">
        <label for="solicitudNombreEquipo">Nombre del equipo</label>
        <input type="text" id="solicitudNombreEquipo" maxlength="80" required value="${escaparHtml(nombreFormulario || '')}" ${pendiente || !tieneEquipo || solicitudNoDisponible ? 'disabled' : ''}>
        <label for="solicitudTrelloEquipo">Enlace del tablero Trello</label>
        <input type="url" id="solicitudTrelloEquipo" maxlength="300" placeholder="https://trello.com/b/..." value="${escaparHtml(trelloFormulario || '')}" ${pendiente || !tieneEquipo || solicitudNoDisponible ? 'disabled' : ''}>
        <button type="submit" class="btn btn-primary" ${pendiente || !tieneEquipo || solicitudNoDisponible ? 'disabled' : ''}>Enviar para aprobación</button>
      </form>
    </div>

    <h4 style="margin-bottom:12px;color:var(--azul-oscuro)">👥 Roles del Equipo y Matriz de Respaldo</h4>
    <div class="roles-slots" style="max-width:600px">
      ${slots}
    </div>

    <div class="backup-alert-box" style="margin-top:20px;max-width:600px">
      <div class="backup-header">
        <span class="backup-icon">🛡️</span>
        <strong>Regla de Oro de Emprendimiento:</strong>
      </div>
      <p>Todos los roles son complementarios. Si un compañero no asiste al laboratorio, su Rol Backup debe tomar la iniciativa para que el proyecto no se detenga.</p>
    </div>
  `;
  $('#formSolicitudCambioEquipo').onsubmit = enviarSolicitudCambioEquipo;
}

let solicitudErrorEquipo = '';

async function cargarMiEquipo() {
  solicitudErrorEquipo = '';
  state.solicitudCambioEquipo = null;
  state.solicitudCambioDisponible = true;
  try {
    const data = await apiGet('solicitudes-equipo');
    state.solicitudCambioEquipo = data.solicitud || null;
    if (data.equipo && state.sesion?.equipo) {
      state.sesion.equipo.nombre = data.equipo.nombre_equipo;
      state.sesion.equipo.trello_url = data.equipo.trello_url;
      localStorage.setItem(STORAGE_SESION, JSON.stringify(state.sesion));
    }
  } catch (e) {
    state.solicitudCambioDisponible = false;
    solicitudErrorEquipo = /acción inválida/i.test(e.message)
      ? 'La solicitud de cambios aún no está habilitada. El profesor debe actualizar y volver a implementar Apps Script; por ahora, coordina cualquier cambio directamente con él.'
      : 'No se pudo comprobar el estado de las solicitudes. Actualiza la página o consulta al docente antes de enviar cambios.';
  }
  renderMiEquipo();
}

async function enviarSolicitudCambioEquipo(event) {
  event.preventDefault();
  const boton = $('#formSolicitudCambioEquipo button[type="submit"]');
  boton.disabled = true;
  try {
    await apiPost('solicitar-cambio-equipo', {
      equipo_id: state.sesion.alumno.equipo_id,
      nombre_equipo: $('#solicitudNombreEquipo').value.trim(),
      trello_url: $('#solicitudTrelloEquipo').value.trim()
    });
    toast('✅ Solicitud enviada. El docente debe aprobarla antes de aplicar el cambio.');
    await cargarMiEquipo();
  } catch (e) {
    if (/acción inválida/i.test(e.message)) {
      toast('La solicitud aún no está habilitada. Consulta al docente.');
      await cargarMiEquipo();
    } else {
      toast('❌ No se pudo enviar la solicitud. Intenta más tarde o consulta al docente.');
      boton.disabled = false;
    }
  }
}

async function cargarMisNotasAlumno() {
  const correo = state.sesion.correo;
  const cont = $('#contenedorMisNotasCompleto');

  try {
    const data = await apiGet('mi-nota', { correo });
    const porSemana = data.porSemana || [];
    const semanasCalificadas = porSemana.filter(semana => semana.calificado).length;
    const semanasHTML = porSemana.length
      ? porSemana.map(s => {
        const detalle = Array.isArray(s.detalle) ? s.detalle : [];
        const total = Number(s.total) || 0;
        const max = Number(s.max) || 0;
        const porcentaje = max ? Math.min(100, Math.round(total / max * 100)) : 0;
        const comentarioGeneral = String(s.comentario_general || '').trim();
        const comentarios = detalle.filter(criterio => {
          const comentario = String(criterio.comentario || '').trim();
          return comentario && comentario !== comentarioGeneral;
        });
        const estado = s.calificado ? 'Calificada' : 'Pendiente';
        const detalleCriterios = detalle.length
          ? `<ul class="calificacion-criterios">${detalle.map(criterio => {
            const puntaje = Number(criterio.puntaje) || 0;
            const maximo = Number(criterio.max) || 0;
            const porcentajeCriterio = maximo ? Math.min(100, Math.round(puntaje / maximo * 100)) : 0;
            return `<li class="calificacion-criterio">
              <div class="criterio-calificacion-cabecera">
                <b>${escaparHtml(criterio.criterio || 'Criterio')}</b>
                <strong>${puntaje} <span>/ ${maximo} pts</span></strong>
              </div>
              <div class="barra-progreso-calificacion" role="progressbar" aria-valuenow="${porcentajeCriterio}" aria-valuemin="0" aria-valuemax="100">
                <span style="width:${porcentajeCriterio}%"></span>
              </div>
              ${criterio.comentario ? `<p class="comentario-criterio"><b>Comentario:</b> ${escaparHtml(criterio.comentario)}</p>` : ''}
            </li>`;
          }).join('')}</ul>`
          : '<p class="hint">No hay desglose por criterios disponible para esta semana.</p>';
        const retroalimentacion = s.observacion_pc || comentarioGeneral || comentarios.length
          ? `<aside class="retroalimentacion-calificacion">
              <h4>💬 Retroalimentación del docente</h4>
              ${comentarioGeneral ? `<p>${escaparHtml(comentarioGeneral)}</p>` : ''}
              ${s.observacion_pc ? `<p>${escaparHtml(s.observacion_pc)}</p>` : ''}
              ${comentarios.length ? `<p>También hay comentarios en ${comentarios.length === 1 ? 'un criterio' : `${comentarios.length} criterios`} del desglose.</p>` : ''}
            </aside>`
          : s.calificado
            ? '<p class="hint sin-retroalimentacion">El docente no dejó una observación general ni comentarios adicionales. El desglose muestra cómo se asignaron los puntos de cada criterio.</p>'
            : '<p class="hint sin-retroalimentacion">Aún no hay una calificación ni retroalimentación del docente para esta semana.</p>';

        return `<article class="calificacion-semana-card ${s.calificado ? 'calificada' : 'pendiente'}">
          <header class="calificacion-semana-header">
            <div>
              <span class="semana-etiqueta">Semana ${escaparHtml(s.semana)}</span>
              <span class="estado-calificacion ${s.calificado ? 'estado-calificacion-lista' : ''}">${s.calificado ? '✓ ' : '◷ '}${estado}</span>
            </div>
            <div class="puntaje-semana">
              <strong>${total}<span> / ${max} pts</span></strong>
              <small>${s.calificado ? `${porcentaje}% de los puntos` : 'Pendiente de evaluación'}</small>
            </div>
          </header>
          ${s.calificado ? `<div class="barra-progreso-calificacion resumen-progreso" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"><span style="width:${porcentaje}%"></span></div>` : ''}
          <section class="desglose-calificacion">
            <h4>¿Cómo se obtuvo esta calificación?</h4>
            <p class="hint">La nota se calcula sumando los puntos asignados en cada criterio de la rúbrica.</p>
            ${detalleCriterios}
          </section>
          ${retroalimentacion}
        </article>`;
      }).join('')
      : '<div class="estado-vacio-calificaciones"><span>📝</span><h3>Aún no hay semanas para mostrar</h3><p>Cuando se registren evaluaciones, aquí verás el puntaje por semana y la retroalimentación del docente.</p></div>';

    cont.innerHTML = `
      <div class="resumen-calificaciones">
        <div class="resumen-calificacion-card">
          <span class="resumen-calificacion-icon">🏅</span>
          <div><strong>${Number(data.totalBase) || 0}</strong><span>Puntos de calificaciones</span></div>
        </div>
        <div class="resumen-calificacion-card">
          <span class="resumen-calificacion-icon">⚡</span>
          <div><strong>${Number(data.xpExtraTotal) || 0}</strong><span>Puntos extra</span></div>
        </div>
        <div class="resumen-calificacion-card resumen-calificacion-principal">
          <span class="resumen-calificacion-icon">📊</span>
          <div><strong>${Number(data.porcentaje) || 0}%</strong><span>Rendimiento acumulado</span></div>
        </div>
        <div class="resumen-calificacion-card">
          <span class="resumen-calificacion-icon">📚</span>
          <div><strong>${semanasCalificadas}<small> / ${porSemana.length}</small></strong><span>Semanas calificadas</span></div>
        </div>
      </div>
      <div class="historial-calificaciones-heading">
        <div><h3>Historial de calificaciones</h3><p class="hint">Consulta el desglose de cada semana para entender tu puntaje y leer la retroalimentación.</p></div>
      </div>
      <div class="historial-calificaciones">${semanasHTML}</div>
    `;

  } catch (e) {
    cont.innerHTML = `<p class="hint">No se pudieron cargar tus calificaciones: ${e.message}</p>`;
  }
}

/* =========================================================
   8. RANKINGS (EQUIPOS E INDIVIDUAL)
   ========================================================= */
function actualizarFiltrosRanking(tipo, datos) {
  if (state.sesion?.tipo !== 'docente') return { grado: '', seccion: '', equipo: '' };

  const prefijo = tipo === 'equipos' ? 'rankingEquipos' : 'rankingIndividual';
  const contenedor = $(`#filtrosRanking${tipo === 'equipos' ? 'Equipos' : 'Individual'}`);
  const gradoSelect = $(`#${prefijo}Grado`);
  const seccionSelect = $(`#${prefijo}Seccion`);
  const equipoSelect = $(`#${prefijo}Equipo`);
  if (!contenedor || !gradoSelect || !seccionSelect || !equipoSelect) return { grado: '', seccion: '', equipo: '' };
  contenedor.style.display = 'flex';

  const gradoPrevio = gradoSelect.value;
  const seccionPrevia = seccionSelect.value;
  const equipoPrevio = equipoSelect.value;
  const grados = [...new Set(datos.map(d => String(d.grado || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  gradoSelect.innerHTML = '<option value="">Todos los grados</option>' +
    grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
  gradoSelect.value = grados.includes(gradoPrevio) ? gradoPrevio : '';

  const filasGrado = gradoSelect.value
    ? datos.filter(d => normalizarGrado(d.grado) === normalizarGrado(gradoSelect.value))
    : datos;
  const secciones = [...new Set(filasGrado.map(d => String(d.seccion || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  seccionSelect.innerHTML = '<option value="">Todas las secciones</option>' +
    secciones.map(seccion => `<option value="${escaparHtml(seccion)}">${escaparHtml(seccion)}</option>`).join('');
  seccionSelect.value = secciones.includes(seccionPrevia) ? seccionPrevia : '';

  const filasSeccion = seccionSelect.value
    ? filasGrado.filter(d => String(d.seccion || '').trim() === seccionSelect.value)
    : filasGrado;
  const equipos = tipo === 'equipos'
    ? filasSeccion.map(d => ({ id: d.equipo_id, nombre: d.nombre }))
    : [...new Map(filasSeccion
      .filter(d => d.equipo_id)
      .map(d => {
        const equipo = state.equipos.find(e => String(e.equipo_id) === String(d.equipo_id));
        return [String(d.equipo_id), {
          id: d.equipo_id,
          nombre: equipo?.nombre_equipo || d.equipo_id
        }];
      })).values()];
  equipoSelect.innerHTML = '<option value="">Todos los equipos</option>' +
    equipos.map(equipo => `<option value="${escaparHtml(equipo.id)}">${escaparHtml(equipo.nombre || equipo.id)}</option>`).join('');
  equipoSelect.value = equipos.some(equipo => String(equipo.id) === equipoPrevio) ? equipoPrevio : '';

  const filtrar = () => {
    actualizarFiltrosRanking(tipo, datos);
    if (tipo === 'equipos') renderRanking();
    else renderRankingIndividual();
  };
  gradoSelect.onchange = filtrar;
  seccionSelect.onchange = filtrar;
  equipoSelect.onchange = filtrar;

  return { grado: gradoSelect.value, seccion: seccionSelect.value, equipo: equipoSelect.value };
}

function filtrarDatosRanking(datos, filtros) {
  return datos.filter(d =>
    (!filtros.grado || normalizarGrado(d.grado) === normalizarGrado(filtros.grado)) &&
    (!filtros.seccion || String(d.seccion || '').trim() === filtros.seccion) &&
    (!filtros.equipo || String(d.equipo_id || '') === filtros.equipo)
  );
}

function renderRanking() {
  const tbody = $('#tablaRanking tbody');
  const filtros = actualizarFiltrosRanking('equipos', state.ranking);
  const ranking = state.sesion?.tipo === 'docente'
    ? filtrarDatosRanking(state.ranking, filtros)
    : state.ranking;
  const filtroSec = state.sesion?.tipo === 'alumno'
    ? state.sesion.alumno?.seccion || state.sesion.equipo?.seccion || ''
    : filtros.seccion;
  $('#badgeFiltroSeccion').textContent = filtros.grado
    ? `${filtros.grado}${filtroSec ? ` · Sección ${filtroSec}` : ''}`
    : filtroSec ? `Sección ${filtroSec}` : 'Todas las Secciones';

  if (!ranking.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px">No hay calificaciones registradas</td></tr>';
    return;
  }

  const miEquipoId = state.sesion?.tipo === 'alumno' ? state.sesion.alumno?.equipo_id : null;

  tbody.innerHTML = ranking.map((r, index) => {
    const posicion = index + 1;
    const medalla = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : posicion;
    const clase = posicion <= 3 ? `rank-${posicion}` : '';
    const esMio = miEquipoId && String(r.equipo_id) === String(miEquipoId);
    const trello = r.trello_url
      ? `<a href="${r.trello_url}" target="_blank" rel="noopener" class="btn-trello" style="padding:2px 8px;font-size:11px">🔗 Ver</a>`
      : '—';

    return `
      <tr class="${clase}" ${esMio ? 'style="background:#e8f0fe !important;font-weight:bold"' : ''}>
        <td style="text-align:center"><span class="medalla">${medalla}</span></td>
        <td>${r.nombre}${esMio ? ' ⭐ (Tu Equipo)' : ''}</td>
        <td>${r.grado}</td>
        <td style="text-align:center"><b>${r.seccion || '—'}</b></td>
        <td>${escaparHtml(r.proyecto || '—')}</td>
        <td style="text-align:center">${r.puntos_grupales ?? r.puntos}</td>
        <td style="text-align:center">${r.promedio_individual ?? '—'}</td>
        <td style="text-align:center;color:#174ea6"><b>${r.puntos}</b></td>
        <td style="text-align:center"><b>${r.porcentaje}%</b></td>
        <td style="text-align:center">${trello}</td>
      </tr>`;
  }).join('');
}

function renderRankingIndividual() {
  const tbody = $('#tablaRankingIndividual tbody');
  const filtros = actualizarFiltrosRanking('individual', state.rankingIndividual);
  const ranking = state.sesion?.tipo === 'docente'
    ? filtrarDatosRanking(state.rankingIndividual, filtros)
    : state.rankingIndividual;
  if (!ranking.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px">Sin evaluaciones individuales registradas</td></tr>';
    return;
  }

  const miCorreo = state.sesion?.tipo === 'alumno' ? state.sesion.correo : null;

  tbody.innerHTML = ranking.map((r, index) => {
    const posicion = index + 1;
    const medalla = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : posicion;
    const clase = posicion <= 3 ? `rank-${posicion}` : '';
    const esMio = miCorreo && String(r.correo).toLowerCase() === String(miCorreo).toLowerCase();

    return `
      <tr class="${clase}" ${esMio ? 'style="background:#e8f0fe !important;font-weight:bold"' : ''}>
        <td style="text-align:center"><span class="medalla">${medalla}</span></td>
        <td>${r.nombre}${esMio ? ' ⭐ (Tú)' : ''}</td>
        <td>${r.grado}</td>
        <td style="text-align:center">${r.seccion || '—'}</td>
        <td><span class="badge-rol rol-${r.rol || 'CEO'}" style="font-size:10px;padding:2px 6px">${r.rol || 'CEO'}</span></td>
        <td>${r.equipo_id || '—'}</td>
        <td style="text-align:center">${r.puntos_base ?? r.puntos}</td>
        <td style="text-align:center;color:#d97706">${r.xp_extra ? `+${r.xp_extra} XP` : '0'}</td>
        <td style="text-align:center;color:#174ea6"><b>${r.puntos}</b></td>
        <td style="text-align:center"><b>${r.porcentaje}%</b></td>
      </tr>`;
  }).join('');
}

function actualizarOpcionesAlumnoNuevoEquipo(rol) {
  const input = $(`#asigBuscar_${rol}`);
  const select = $(`#asigRol_${rol}`);
  if (!input || !select) return;

  const busqueda = normalizarBusquedaGestion(input.value);
  const grado = normalizarGrado($('#asigGradoEq').value);
  const seccion = normalizarBusquedaGestion($('#asigSeccionEq').value);
  const seleccionadoActual = select.value;
  const seleccionadosOtrosRoles = new Set(['CEO', 'CTO', 'CMO', 'CFO']
    .filter(otroRol => otroRol !== rol)
    .map(otroRol => $(`#asigRol_${otroRol}`)?.value)
    .filter(Boolean));

  const candidatos = state.alumnos.filter(alumno => {
    const nombre = alumno.nombre || [alumno.nombres, alumno.apellidos].filter(Boolean).join(' ');
    const equipoAlumno = state.equipos.find(e => String(e.equipo_id) === String(alumno.equipo_id));
    const gradoAlumno = normalizarGrado(alumno.grado || equipoAlumno?.grado);
    const seccionAlumno = normalizarBusquedaGestion(alumno.seccion || equipoAlumno?.seccion);
    const esEquipoActual = equipoEnEdicionActual && String(alumno.equipo_id) === equipoEnEdicionActual;
    if (!esEquipoActual && (!grado || !seccion || gradoAlumno !== grado || seccionAlumno !== seccion)) return false;
    const texto = normalizarBusquedaGestion([nombre, alumno.correo, alumno.dni].filter(Boolean).join(' '));
    return !busqueda || texto.includes(busqueda);
  });

  const opciones = candidatos.map(alumno => {
    const nombre = alumno.nombre || [alumno.nombres, alumno.apellidos].filter(Boolean).join(' ') || alumno.correo;
    const equipo = state.equipos.find(e => String(e.equipo_id) === String(alumno.equipo_id));
    const esEquipoActual = equipoEnEdicionActual && String(alumno.equipo_id) === equipoEnEdicionActual;
    const seleccionadoEnOtroRol = seleccionadosOtrosRoles.has(alumno.correo);
    const asignadoAOtroEquipo = Boolean(alumno.equipo_id) && !esEquipoActual;
    const asignado = asignadoAOtroEquipo || seleccionadoEnOtroRol;
    const etiquetaEstado = asignadoAOtroEquipo
      ? ` · Ya tiene equipo: ${equipo?.nombre_equipo || alumno.equipo_id}`
      : esEquipoActual ? ' · En este equipo'
        : seleccionadoEnOtroRol ? ' · Ya asignado a otro rol' : ' · Disponible';
    const estadoClass = asignadoAOtroEquipo || seleccionadoEnOtroRol
      ? ' class="alumno-opcion-asignado" style="color:#b45309;background-color:#fff7ed"'
      : ' class="alumno-opcion-disponible" style="color:#047857;background-color:#ecfdf5"';
    return `<option value="${escaparHtml(alumno.correo)}"${estadoClass}${asignado ? ' disabled' : ''}>${escaparHtml(nombre)}${escaparHtml(etiquetaEstado)}</option>`;
  });

  if (seleccionadoActual && !candidatos.some(alumno => alumno.correo === seleccionadoActual)) {
    const actual = state.alumnos.find(alumno => alumno.correo === seleccionadoActual);
    if (actual) {
      const nombre = actual.nombre || [actual.nombres, actual.apellidos].filter(Boolean).join(' ') || actual.correo;
      opciones.unshift(`<option value="${escaparHtml(actual.correo)}">${escaparHtml(nombre)} · Asignado actualmente</option>`);
    }
  }

  if (!grado || !seccion) {
    opciones.unshift('<option value="">Primero selecciona grado y sección</option>');
  } else if (!opciones.length) {
    opciones.unshift('<option value="">No hay alumnos que coincidan con la búsqueda</option>');
  } else {
    opciones.unshift('<option value="">-- Sin asignar --</option>');
  }
  select.innerHTML = opciones.join('');
  select.value = seleccionadoActual && [...select.options].some(option => option.value === seleccionadoActual)
    ? seleccionadoActual
    : '';
}

/* =========================================================
   9. PLAN SEMANAL (MATRIZ DATA)
   ========================================================= */
function renderPlan() {
  const esDocente = state.sesion?.tipo === 'docente';
  const esAlumno = state.sesion?.tipo === 'alumno';
  let d;
  if (esDocente) {
    const grado = $('#planFiltroGrado').value;
    const rol = $('#planFiltroRol').value;
    d = state.plan.filter(fila =>
      (!grado || normalizarGrado(fila.Grado) === normalizarGrado(grado)) &&
      (!rol || rolCoincide(fila.Rol, rol))
    );
  } else if (esAlumno) {
    const alumno = state.sesion.alumno || {};
    const equipo = state.sesion.equipo || {};
    const grado = alumno.grado || equipo.grado || '';
    const seccion = alumno.seccion || equipo.seccion || '';
    d = state.plan.filter(fila =>
      (!grado || normalizarGrado(fila.Grado) === normalizarGrado(grado)) &&
      (!seccion || !fila.Seccion || String(fila.Seccion).trim() === String(seccion).trim()) &&
      (state.planMostrarTodasTareas || rolCoincide(fila.Rol, alumno.rol))
    );
    $('#controlesPlanAlumno').style.display = 'block';
    $('#btnPlanSoloRol').classList.toggle('active', !state.planMostrarTodasTareas);
    $('#btnPlanSoloRol').classList.toggle('btn-ghost', state.planMostrarTodasTareas);
    $('#btnPlanTodasTareas').classList.toggle('active', state.planMostrarTodasTareas);
    $('#btnPlanTodasTareas').classList.toggle('btn-ghost', !state.planMostrarTodasTareas);
    $('#btnPlanSoloRol').setAttribute('aria-pressed', String(!state.planMostrarTodasTareas));
    $('#btnPlanTodasTareas').setAttribute('aria-pressed', String(state.planMostrarTodasTareas));
    $('#planAlumnoAyuda').textContent = state.planMostrarTodasTareas
      ? 'Las tareas de otros roles se muestran para que sepas cómo apoyar a tus compañeros.'
      : `Se muestran las tareas asignadas a tu rol: ${alumno.rol || 'sin rol asignado'}.`;
  }
  const columnaRecurso = $('#thPlanRecurso');
  columnaRecurso.textContent = esDocente ? 'Material docente' : 'Guía de aprendizaje';
  const filasPlan = [...d].sort((a, b) =>
    normalizarSemana(a.Semana) - normalizarSemana(b.Semana) ||
    String(a.Rol || '').localeCompare(String(b.Rol || ''), 'es')
  );
  const rolAlumno = state.sesion?.alumno?.rol || '';
  $('#tablaPlan tbody').innerHTML = filasPlan.length ? filasPlan.map(x => `
    <tr>
      <td><b>${escaparHtml(x.Grado)}</b></td>
      <td style="text-align:center"><b>${escaparHtml(x.Semana)}</b></td>
      <td>${escaparHtml(x.Tema_Semanal)}</td>
      <td>${String(x.Rol || '').split(/[,;|/]+/).map(rol => rol.trim()).filter(Boolean).map(rol => `
        <span class="plan-rol-tag ${esAlumno && rol.toUpperCase() === String(rolAlumno).toUpperCase() ? 'plan-rol-propio' : 'plan-rol-companero'}">
          ${escaparHtml(rol)}${esAlumno && rol.toUpperCase() === String(rolAlumno).toUpperCase() ? ' · tú' : ''}
        </span>`).join(' ') || '—'}</td>
      <td>${escaparHtml(x.Tarea_Detallada)}</td>
      <td>${escaparHtml(x.Entregable_Especifico)}</td>
      <td><b>${escaparHtml(x.Rol_Backup || '—')}</b></td>
      <td style="font-size:12px;color:#555">${escaparHtml(x.Responsabilidad_Backup || '—')}</td>
      <td>${enlacePlanHtml(
        esDocente ? x.Link_Presentacion : x.Link_Guia_Aprendizaje,
        esDocente ? 'Abrir presentación' : 'Abrir guía'
      ) || '—'}</td>
    </tr>`).join('')
    : '<tr><td colspan="9" style="text-align:center;padding:24px">No hay filas del plan para los filtros seleccionados.</td></tr>';
}

function inicializarFiltrosPlan() {
  const filtros = $('#filtrosPlanCurricular');
  if (!filtros) return;
  const esDocente = state.sesion?.tipo === 'docente';
  const esAlumno = state.sesion?.tipo === 'alumno';
  filtros.style.display = esDocente ? 'flex' : 'none';
  $('#controlesPlanAlumno').style.display = esAlumno ? 'block' : 'none';
  if (esAlumno) {
    $('#btnPlanSoloRol').onclick = () => {
      state.planMostrarTodasTareas = false;
      renderPlan();
    };
    $('#btnPlanTodasTareas').onclick = () => {
      state.planMostrarTodasTareas = true;
      renderPlan();
    };
  }
  if (!esDocente) return;

  const grados = [...new Set(state.plan.map(fila => String(fila.Grado || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  const roles = [...new Set(state.plan.flatMap(fila =>
    String(fila.Rol || '').split(/[,;|/]+/).map(rol => rol.trim()).filter(Boolean)
  ))].sort((a, b) => a.localeCompare(b, 'es'));
  $('#planFiltroGrado').innerHTML = '<option value="">Todos los grados</option>' +
    grados.map(grado => `<option value="${escaparHtml(grado)}">${escaparHtml(grado)}</option>`).join('');
  $('#planFiltroRol').innerHTML = '<option value="">Todos los roles</option>' +
    roles.map(rol => `<option value="${escaparHtml(rol)}">${escaparHtml(rol)}</option>`).join('');
  $('#planFiltroGrado').onchange = renderPlan;
  $('#planFiltroRol').onchange = renderPlan;
}

/* =========================================================
   10. CENTRO DE RECURSOS Y HERRAMIENTAS
   ========================================================= */
async function inicializarRecursos() {
  const inputBusqueda = $('#busquedaRecursosInput');
  if (inputBusqueda && !inputBusqueda._iniciado) {
    inputBusqueda._iniciado = true;
    inputBusqueda.oninput = () => renderRecursos();
  }

  const btnRecargar = $('#btnRecargarRecursos');
  if (btnRecargar && !btnRecargar._iniciado) {
    btnRecargar._iniciado = true;
    btnRecargar.onclick = recargarRecursos;
  }

  try {
    const data = await apiGet('recursos');
    if (data && Array.isArray(data.recursos)) {
      state.recursos = data.recursos.map(r => ({
        titulo: String(r.titulo || '').trim(),
        url: String(r.url || '').trim(),
        categoria: String(r.categoria || '').trim(),
        icono: String(r.icono || '').trim() || '🔗',
        activo: r.activo === true || String(r.activo).toUpperCase() === 'TRUE' || r.activo === undefined || r.activo === ''
      })).filter(r => r.titulo && r.activo);
      renderRecursos();
    }
  } catch (e) {
    state.recursos = [];
    renderRecursos(e.message);
  }
}

async function recargarRecursos() {
  toast('🔄 Actualizando recursos desde Google Sheets...');
  try {
    const data = await apiGet('recursos');
    if (data && data.recursos && data.recursos.length > 0) {
      state.recursos = data.recursos.map(r => ({
        titulo: String(r.titulo || '').trim(),
        url: String(r.url || '').trim(),
        categoria: String(r.categoria || '').trim(),
        icono: String(r.icono || '').trim() || '🔗',
        activo: r.activo === true || String(r.activo).toUpperCase() === 'TRUE' || r.activo === undefined || r.activo === ''
      })).filter(r => r.titulo && r.activo);
      toast('✅ Recursos actualizados correctamente');
    } else {
      state.recursos = [];
      toast('ℹ️ No se encontraron recursos en la hoja');
    }
  } catch (e) {
    state.recursos = [];
    toast('⚠️ Error al consultar hoja Recursos: ' + e.message);
  }
  renderRecursos();
}

function esRecursoDestacado(r) {
  const c = String(r.categoria || '').toLowerCase().trim();
  return c === 'rubrica' || c === 'rúbrica' || c === 'lineamientos' || c === 'lineamiento';
}

function renderRecursos(error = '') {
  const todos = state.recursos || [];
  const busqueda = ($('#busquedaRecursosInput')?.value || '').toLowerCase().trim();
  const filtroCat = state.filtroCategoriaRecurso || '';

  // 1. Filtrar destacados (Rúbricas y Lineamientos)
  const destacados = todos.filter(r => {
    if (!esRecursoDestacado(r)) return false;
    if (!busqueda) return true;
    return r.titulo.toLowerCase().includes(busqueda) ||
           r.categoria.toLowerCase().includes(busqueda);
  });

  const contenedorDestacados = $('#contenedorRecursosDestacados');
  if (contenedorDestacados) {
    if (!destacados.length) {
      contenedorDestacados.innerHTML = `
        <div class="vacio-box" style="grid-column: 1 / -1; padding: 20px;">
          <p>${error ? `No se pudieron cargar los recursos: ${escaparHtml(error)}` : busqueda ? 'No se encontraron documentos o lineamientos para la búsqueda.' : 'No hay documentos oficiales cargados.'}</p>
        </div>`;
    } else {
      contenedorDestacados.innerHTML = destacados.map(d => {
        const catLower = d.categoria.toLowerCase();
        const esRubrica = catLower.includes('rubrica') || catLower.includes('rúbrica');
        const cardClass = esRubrica ? 'card-recurso-destacado tipo-rubrica' : 'card-recurso-destacado';
        const badgeTexto = esRubrica ? '📝 Rúbrica de Evaluación' : '📋 Lineamientos Oficiales';
        const icono = d.icono || (esRubrica ? '📝' : '📋');
        const tieneUrl = Boolean(d.url && d.url.trim().length > 0 && d.url.startsWith('http'));

        let btnHtml = '';
        let desc = '';

        if (esRubrica) {
          desc = 'Criterios e indicadores oficiales para verificar desempeños en la PC según la Ley 32172.';
          if (tieneUrl) {
            btnHtml = `<a href="${d.url}" target="_blank" rel="noopener noreferrer" class="btn-destacado btn-rubrica">
              📄 Abrir Rúbrica en Google Drive ↗
            </a>`;
          } else {
            btnHtml = `<button class="btn-destacado btn-disabled" title="El docente compartirá el enlace oficial próximamente">
              ⏳ Rúbrica en preparación / Próximamente
            </button>`;
          }
        } else {
          desc = 'Orientaciones pedagógicas, fechas clave y entregables programados para el área de EPT.';
          if (tieneUrl) {
            btnHtml = `<a href="${d.url}" target="_blank" rel="noopener noreferrer" class="btn-destacado btn-drive">
              📂 Ver Lineamiento en Google Drive ↗
            </a>`;
          } else {
            btnHtml = `<button class="btn-destacado btn-disabled">
              ⏳ Documento en preparación
            </button>`;
          }
        }

        return `
          <div class="${cardClass}">
            <div>
              <div class="destacado-top">
                <div class="destacado-icon">${icono}</div>
                <span class="badge-destacado">${badgeTexto}</span>
              </div>
              <h4 class="destacado-titulo">${d.titulo}</h4>
              <p class="destacado-desc">${desc}</p>
            </div>
            <div style="margin-top:auto">
              ${btnHtml}
            </div>
          </div>`;
      }).join('');
    }
  }

  // 2. Fichas Simples (Herramientas y Plataformas Web)
  const herramientas = todos.filter(r => !esRecursoDestacado(r));

  // Obtener categorías únicas de las herramientas
  const categoriasUnicas = [...new Set(herramientas.map(h => h.categoria).filter(Boolean))].sort();

  // Renderizar barra de filtros
  const filtrosCont = $('#filtrosCategoriasRecursos');
  if (filtrosCont) {
    const chipTodasActivo = !filtroCat ? 'active' : '';
    let chipsHtml = `
      <button class="chip-filtro-recurso ${chipTodasActivo}" onclick="seleccionarCategoriaRecurso('')">
        🌟 Todas (${herramientas.length})
      </button>`;

    categoriasUnicas.forEach(cat => {
      const count = herramientas.filter(h => h.categoria === cat).length;
      const activoClass = filtroCat === cat ? 'active' : '';
      chipsHtml += `
        <button class="chip-filtro-recurso ${activoClass}" onclick="seleccionarCategoriaRecurso('${cat}')">
          ${cat} (${count})
        </button>`;
    });

    filtrosCont.innerHTML = chipsHtml;
  }

  // Filtrar herramientas por categoría y búsqueda
  const herramientasFiltradas = herramientas.filter(h => {
    if (filtroCat && h.categoria !== filtroCat) return false;
    if (!busqueda) return true;
    return h.titulo.toLowerCase().includes(busqueda) ||
           h.categoria.toLowerCase().includes(busqueda) ||
           (h.url && h.url.toLowerCase().includes(busqueda));
  });

  const contadorEl = $('#contadorRecursosSimples');
  if (contadorEl) {
    contadorEl.textContent = `${herramientasFiltradas.length} herramientas`;
  }

  const contenedorSimples = $('#contenedorRecursosSimples');
  if (contenedorSimples) {
    if (!herramientasFiltradas.length) {
      contenedorSimples.innerHTML = `
        <div class="vacio-box" style="grid-column: 1 / -1; padding: 24px;">
          <p>${error ? `No se pudieron cargar los recursos: ${escaparHtml(error)}` : herramientas.length || busqueda || filtroCat ? 'No se encontraron herramientas que coincidan con la búsqueda o filtro seleccionado.' : 'No hay herramientas cargadas.'}</p>
        </div>`;
    } else {
      contenedorSimples.innerHTML = herramientasFiltradas.map(h => {
        const icono = h.icono || '🛠️';
        const urlSegura = h.url || '#';
        const tieneUrl = Boolean(h.url && h.url.trim().length > 0 && h.url.startsWith('http'));

        return `
          <div class="ficha-recurso-simple">
            <div class="ficha-simple-header">
              <div class="ficha-simple-icon">${icono}</div>
              <div class="ficha-simple-info">
                <h4 class="ficha-simple-titulo" title="${h.titulo}">${h.titulo}</h4>
                <span class="ficha-simple-categoria">${h.categoria}</span>
              </div>
            </div>
            <div>
              ${tieneUrl ? `
                <a href="${urlSegura}" target="_blank" rel="noopener noreferrer" class="btn-abrir-recurso">
                  Abrir herramienta ↗
                </a>
              ` : `
                <span class="btn-abrir-recurso" style="opacity:0.6;cursor:default">Enlace no disponible</span>
              `}
            </div>
          </div>`;
      }).join('');
    }
  }
}

function seleccionarCategoriaRecurso(cat) {
  state.filtroCategoriaRecurso = cat;
  renderRecursos();
}
window.seleccionarCategoriaRecurso = seleccionarCategoriaRecurso;

/* =========================================================
   11. MODAL GENÉRICO
   ========================================================= */
function abrirModalGenerico({ title, campos, onSave }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = campos.map(c => {
    const disabled = c.disabled ? 'disabled' : '';
    if (c.type === 'select') {
      return `<div class="form-group"><label>${c.label}</label><select id="modal-${c.name}" class="select select-full" ${disabled}>${c.options || ''}</select></div>`;
    }
    if (c.type === 'textarea') {
      return `<div class="form-group"><label>${c.label}</label><textarea id="modal-${c.name}" rows="3" class="input-full" ${disabled}>${c.value || ''}</textarea></div>`;
    }
    return `<div class="form-group"><label>${c.label}</label><input id="modal-${c.name}" type="${c.type || 'text'}" value="${c.value || ''}" class="input-full" ${disabled}></div>`;
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

/* =========================================================
   11. INICIALIZACIÓN
   ========================================================= */
async function init() {
  $('#btnLogout').addEventListener('click', cerrarSesion);
  $('#btnNuevaFrase').addEventListener('click', ponerFraseMotivadoraAleatoria);
  inicializarPomodoro();

  // Modales
  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal') $('#modal').classList.remove('active');
  });
  $('#modalOtorgarXP').addEventListener('click', e => {
    if (e.target.id === 'modalOtorgarXP') $('#modalOtorgarXP').classList.remove('active');
  });
  $('#modalAsignarEquipo').addEventListener('click', e => {
    if (e.target.id === 'modalAsignarEquipo') $('#modalAsignarEquipo').classList.remove('active');
  });

  $('#btnCancelarXP').onclick = () => $('#modalOtorgarXP').classList.remove('active');
  $('#btnConfirmarXP').onclick = confirmarOtorgarXP;
  $('#btnCancelarAsignarEq').onclick = () => $('#modalAsignarEquipo').classList.remove('active');

  // Gamificación modal trigger
  if ($('#btnAbrirModalOtorgarXP')) {
    $('#btnAbrirModalOtorgarXP').onclick = abrirModalOtorgarXP;
  }

  // Creación equipos
  if ($('#btnCrearEquipoModal')) {
    $('#btnCrearEquipoModal').onclick = abrirModalCrearEquipo;
  }
  if ($('#btnNuevoAlumnoModal')) {
    $('#btnNuevoAlumnoModal').onclick = () => abrirModalAlumnoEdicion();
  }
  if ($('#btnRecargarGestionCompleta')) {
    $('#btnRecargarGestionCompleta').onclick = cargarGestion;
  }

  // Dashboard alumno: cambio de semana y envío de evidencia
  $('#dashAlumnoSemanaSelect').onchange = (e) => {
    state.semanaSeleccionadaAlumno = normalizarSemana(e.target.value);
    renderDashboardAlumno();
  };
  $('#formEvidenciaAlumno').onsubmit = guardarEvidenciaAlumno;

  // Tabs de modo entrega (Link web o Archivo Drive)
  if ($('#btnTabModoLink') && $('#btnTabModoArchivo')) {
    $('#btnTabModoLink').onclick = () => {
      if ($('#btnTabModoLink').disabled) return;
      $('#btnTabModoLink').classList.add('active');
      $('#btnTabModoArchivo').classList.remove('active');
      $('#formEvidenciaAlumno').style.display = 'block';
      $('#formArchivoAlumno').style.display = 'none';
    };
    $('#btnTabModoArchivo').onclick = () => {
      if ($('#btnTabModoArchivo').disabled) return;
      $('#btnTabModoArchivo').classList.add('active');
      $('#btnTabModoLink').classList.remove('active');
      $('#formEvidenciaAlumno').style.display = 'none';
      $('#formArchivoAlumno').style.display = 'block';
    };
  }
  if ($('#formArchivoAlumno')) {
    $('#formArchivoAlumno').onsubmit = subirArchivoDriveAlumno;
  }

  // Restaurar sesión existente
  restaurarSesion();
  if (state.sesion) {
    try {
      const login = await apiGet('login', { correo: state.sesion.correo });
      if (login.tipo === 'alumno') {
        state.sesion = {
          ...state.sesion,
          alumno: login.alumno,
          equipo: login.equipo
        };
        state.evidencias = Array.isArray(login.evidencias) ? login.evidencias : [];
        state.puntosExtra = Array.isArray(login.puntos_extra) ? login.puntos_extra : [];
        localStorage.setItem(STORAGE_SESION, JSON.stringify(state.sesion));
      } else if (login.tipo === 'docente') {
        state.equipos = login.equipos || [];
        state.alumnos = login.alumnos || [];
        state.rubricaGrupal = login.rubrica || [];
        state.rubricaIndividual = login.rubrica_individual || [];
        state.evidencias = login.evidencias || [];
        state.plan = login.plan || [];
      }
    } catch (e) {
      if (!invalidarSesionPorToken(e.message)) {
        console.error('No se pudo validar sesión guardada:', e);
      }
    }
    if (!state.sesion) return;

    await arrancarApp();
    mostrarApp();
  } else {
    mostrarLogin();
  }
}

async function arrancarApp() {
  await Promise.all([cargarPlan(), cargarFrasesMotivacionales()]);
  ponerFraseMotivadoraAleatoria();
  actualizarSelectoresSemana();
  inicializarFiltrosPlan();

  // Listeners de navegación
  $$('.menu-item').forEach(b => b.addEventListener('click', () => navegar(b.dataset.view)));
  $('#toggleSidebar').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  $('#btnRefresh').onclick = async () => {
    await cargarPlan();
    if (state.sesion.tipo === 'docente') renderDashboardDocente();
    else renderDashboardAlumno();
    toast('🔄 Datos actualizados');
  };

  // Render inicial según rol (únicamente el dashboard activo)
  if (state.sesion.tipo === 'alumno') {
    renderDashboardAlumno();
  } else {
    renderDashboardDocente();
  }

  // Notificación motivacional de bienvenida
  setTimeout(() => {
    toast(`👋 ¡Bienvenido/a, ${state.sesion.nombre}! Que tengas una semana de grandes aprendizajes.`, 4000);
  }, 1000);
}

document.addEventListener('DOMContentLoaded', init);