/* =========================================================
   EMPRENDE DIGITAL 2026 - FRONTEND COMPLETO
   Automatización por Roles, Calificación Ágil, Gamificación y Reportes
   ========================================================= */

const API_URL = window.APP_CONFIG.API_URL;
const STORAGE_SESION = 'emprende_sesion_v2';
const STORAGE_TOKEN = 'google_id_token';
const STORAGE_OFFLINE_PUNTOS = 'emprende_offline_puntos_extra';
const STORAGE_OFFLINE_EVIDENCIAS = 'emprende_offline_evidencias';

// Frases motivacionales de innovación, emprendimiento y perseverancia
const FRASES_MOTIVACIONALES = [
  { frase: "El único modo de hacer un gran trabajo es amar lo que haces.", autor: "Steve Jobs" },
  { frase: "No te preocupes por el fracaso; sólo debes acertar una vez.", autor: "Drew Houston (Dropbox)" },
  { frase: "La perseverancia es la clave del éxito en cualquier emprendimiento digital.", autor: "Satya Nadella" },
  { frase: "Tus clientes más insatisfechos son tu mayor fuente de aprendizaje.", autor: "Bill Gates" },
  { frase: "El valor no está en tener ideas, sino en ejecutarlas con excelencia.", autor: "Scott Belsky (Behance)" },
  { frase: "Si construyes un gran producto, los usuarios vendrán y lo recomendarán.", autor: "Larry Page" },
  { frase: "El trabajo en equipo divide el trabajo y multiplica los resultados.", autor: "Anónimo" },
  { frase: "Emprender no es tener un negocio, es resolver problemas reales para personas reales.", autor: "Guy Kawasaki" },
  { frase: "La mejor manera de predecir el futuro es inventarlo.", autor: "Alan Kay" },
  { frase: "Cada error superado en equipo es un paso más hacia el MVP perfecto.", autor: "Eric Ries (Lean Startup)" },
  { frase: "La tecnología es mejor cuando une a las personas.", autor: "Matt Mullenweg" },
  { frase: "Los grandes logros de cualquier organización son el resultado del esfuerzo combinado de cada individuo.", autor: "Vince Lombardi" }
];

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
  evidencias: [],
  puntosExtra: [],
  rubricaGrupal: [],
  rubricaIndividual: [],
  semanaSeleccionadaAlumno: 1
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
    mostrarApp();
    await arrancarApp();
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
  'mi-equipo': 'Mi Equipo',
  'mis-notas': 'Mis Calificaciones',
  ranking: 'Ranking de Equipos',
  'ranking-individual': 'Ranking Individual XP',
  plan: 'Matriz Curricular (Plan Data)',
  acerca: 'Acerca de'
};

function navegar(view) {
  if (state.sesion.tipo === 'alumno' &&
      (view === 'calificacion-agil' || view === 'gestion-equipos' || view === 'gamificacion' || view === 'reportes')) return;
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
  if (view === 'reportes') inicializarReportes();
  if (view === 'ranking') cargarRanking();
  if (view === 'ranking-individual') cargarRankingIndividual();
  if (view === 'mi-equipo') renderMiEquipo();
  if (view === 'mis-notas') cargarMisNotasAlumno();
  if (view === 'plan') renderPlan();

  if (window.innerWidth < 900) $('#sidebar').classList.remove('open');
}

/* ============ MOTOR MOTIVACIONAL ============ */
function ponerFraseMotivadoraAleatoria() {
  const item = FRASES_MOTIVACIONALES[Math.floor(Math.random() * FRASES_MOTIVACIONALES.length)];
  const txt = $('#textoFraseMotivadora');
  const aut = $('#autorFraseMotivadora');
  if (txt && aut) {
    txt.textContent = `"${item.frase}"`;
    aut.textContent = `— ${item.autor}`;
  }
}

/* ============ CARGAS DE DATOS ============ */
async function cargarPlan() {
  try {
    const data = await apiGet('plan');
    state.plan = data.data || [];
    state.filas = state.plan;
  } catch (e) {
    console.error('Error cargando plan:', e);
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

/* =========================================================
   1. DASHBOARD DEL ALUMNO (AUTOMATIZADO POR ROL)
   ========================================================= */
function renderDashboardAlumno() {
  $('#dashboardAlumnoContainer').style.display = 'block';
  $('#dashboardDocenteContainer').style.display = 'none';

  const alumno = state.sesion.alumno;
  const equipo = state.sesion.equipo;
  const semana = Number(state.semanaSeleccionadaAlumno) || 1;

  // Header del alumno
  $('#dashAlumnoBadgeRol').textContent = alumno.rol || 'CEO';
  $('#dashAlumnoBadgeRol').className = 'badge-rol rol-' + (alumno.rol || 'CEO');
  $('#dashAlumnoTituloProyecto').textContent = equipo.proyecto || 'Proyecto Emprendedor';
  $('#dashAlumnoSubtitulo').textContent = `${equipo.nombre} · ${alumno.grado || equipo.grado} · Sección ${alumno.seccion || equipo.seccion || '—'}`;

  // Buscar tarea en el Plan Semanal
  const gradoNormalizado = String(alumno.grado || equipo.grado || '').trim();
  const planFila = state.plan.find(p =>
    String(p.Grado).trim() === gradoNormalizado &&
    Number(p.Semana) === semana &&
    String(p.Rol).trim().toUpperCase() === String(alumno.rol).trim().toUpperCase()
  );

  if (planFila) {
    $('#dashAlumnoTemaSemanal').textContent = `Semana ${semana} · ${planFila.Tema_Semanal}`;
    $('#dashAlumnoTareaDetallada').textContent = planFila.Tarea_Detallada;
    $('#dashAlumnoEntregableEspecifico').textContent = planFila.Entregable_Especifico;
    $('#dashAlumnoLey').textContent = planFila.Notas_Ley32172 || 'Uso computadoras IE. Sin celulares.';
    $('#dashAlumnoProyectoNombre').textContent = planFila.Proyecto || equipo.proyecto;
    $('#dashAlumnoTecnologia').textContent = 'Tecnología: ' + (planFila.Tecnologia || 'Herramientas Digitales');

    // Red de Seguridad / Backup
    const backupResponsabilidad = planFila.Responsabilidad_Backup || 'Si tu compañero falla, debes cubrir su tarea.';
    $('#dashAlumnoBackupResponsabilidad').innerHTML = `
      <b>Tu Respaldo Asignado:</b> ${planFila.Rol_Backup || 'Compañero'}<br>
      <b>Instrucción de Rescate:</b> "${backupResponsabilidad}"
    `;
  } else {
    $('#dashAlumnoTemaSemanal').textContent = `Semana ${semana}`;
    $('#dashAlumnoTareaDetallada').textContent = 'Consigna en preparación para tu rol esta semana.';
    $('#dashAlumnoEntregableEspecifico').textContent = 'Presentar avance en la computadora del laboratorio.';
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
  const correo = state.sesion.correo.toLowerCase();
  const eqId = state.sesion.alumno?.equipo_id;

  // Buscar en evidencias de state o en localStorage offline
  let ev = state.evidencias.find(e =>
    String(e.equipo_id) === String(eqId) &&
    Number(e.semana) === Number(semana) &&
    String(e.correo_alumno).toLowerCase() === correo
  );

  if (!ev) {
    try {
      const offline = JSON.parse(localStorage.getItem(STORAGE_OFFLINE_EVIDENCIAS) || '[]');
      ev = offline.find(e =>
        String(e.equipo_id) === String(eqId) &&
        Number(e.semana) === Number(semana) &&
        String(e.correo_alumno).toLowerCase() === correo
      );
    } catch (e) {}
  }

  const contenedor = $('#estadoEvidenciaCargada');
  const linkEl = $('#linkEvidenciaActual');
  const fechaEl = $('#fechaEvidenciaActual');
  const inputLink = $('#inputLinkEvidencia');
  const inputCom = $('#inputComentarioEvidencia');

  if (ev && ev.link_evidencia) {
    contenedor.style.display = 'flex';
    linkEl.href = ev.link_evidencia;
    linkEl.textContent = ev.link_evidencia;
    fechaEl.textContent = ev.fecha ? `Registrado: ${new Date(ev.fecha).toLocaleString('es-PE')}` : 'Registrado';
    inputLink.value = ev.link_evidencia;
    inputCom.value = ev.comentario_alumno || '';
  } else {
    contenedor.style.display = 'none';
    inputLink.value = '';
    inputCom.value = '';
  }
}

async function guardarEvidenciaAlumno(e) {
  e.preventDefault();
  const link = $('#inputLinkEvidencia').value.trim();
  const comentario = $('#inputComentarioEvidencia').value.trim();
  const semana = Number(state.semanaSeleccionadaAlumno) || 1;
  const alumno = state.sesion.alumno;

  if (!link) { toast('⚠️ Ingresa el enlace de tu evidencia'); return; }

  const payload = {
    equipo_id: alumno.equipo_id,
    semana: semana,
    correo_alumno: state.sesion.correo,
    rol: alumno.rol || 'CEO',
    link_evidencia: link,
    comentario_alumno: comentario,
    fecha: new Date().toISOString()
  };

  try {
    $('#btnGuardarEvidencia').disabled = true;
    $('#btnGuardarEvidencia').textContent = '⏳ Guardando...';

    // Guardar en state y offline backup de inmediato
    state.evidencias = state.evidencias.filter(x =>
      !(String(x.equipo_id) === String(payload.equipo_id) &&
        Number(x.semana) === Number(payload.semana) &&
        String(x.correo_alumno).toLowerCase() === payload.correo_alumno.toLowerCase())
    );
    state.evidencias.push(payload);

    try {
      const offline = JSON.parse(localStorage.getItem(STORAGE_OFFLINE_EVIDENCIAS) || '[]');
      const filtrados = offline.filter(x =>
        !(String(x.equipo_id) === String(payload.equipo_id) &&
          Number(x.semana) === Number(payload.semana) &&
          String(x.correo_alumno).toLowerCase() === payload.correo_alumno.toLowerCase())
      );
      filtrados.push(payload);
      localStorage.setItem(STORAGE_OFFLINE_EVIDENCIAS, JSON.stringify(filtrados));
    } catch (err) {}

    // Enviar al backend
    await apiPost('guardar-evidencia', payload);
    toast('✅ Evidencia guardada exitosamente');
    verificarEvidenciaCargadaAlumno(semana);
  } catch (err) {
    // Si falla el backend, el fallback local ya preservó la entrega
    toast('✅ Evidencia registrada en tu sesión local');
    verificarEvidenciaCargadaAlumno(semana);
  } finally {
    $('#btnGuardarEvidencia').disabled = false;
    $('#btnGuardarEvidencia').textContent = '📤 Guardar Enlace';
  }
}

async function subirArchivoDriveAlumno(e) {
  e.preventDefault();
  const fileInput = $('#inputFileEvidencia');
  const comentario = $('#inputComentarioArchivo').value.trim();
  const semana = Number(state.semanaSeleccionadaAlumno) || 1;
  const alumno = state.sesion.alumno;

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
        const base64Data = dataUrl.split(',')[1];
        const mimeType = file.type || 'application/octet-stream';

        const payload = {
          equipo_id: alumno.equipo_id,
          semana: semana,
          correo_alumno: state.sesion.correo,
          rol: alumno.rol || 'CEO',
          nombre_archivo: file.name,
          mime_type: mimeType,
          base64_data: base64Data,
          comentario_alumno: comentario,
          fecha: new Date().toISOString()
        };

        const resp = await apiPost('subir-archivo', payload);
        const driveUrl = resp.url || ('https://drive.google.com/drive/u/0/search?q=' + encodeURIComponent(file.name));

        // Registrar en state local
        const evItem = {
          equipo_id: alumno.equipo_id,
          semana: semana,
          correo_alumno: state.sesion.correo,
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
        toast('❌ Error subiendo a Drive: ' + errApi.message);
      } finally {
        btnSubir.disabled = false;
        progress.style.display = 'none';
      }
    };

    reader.onerror = () => {
      toast('❌ Error leyendo el archivo local');
      btnSubir.disabled = false;
      progress.style.display = 'none';
    };

    reader.readAsDataURL(file);

  } catch (err) {
    btnSubir.disabled = false;
    progress.style.display = 'none';
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
  const seccion = $('#filtroSeccion').value;
  const grado = $('#filtroGrado').value;
  return state.plan.filter(f =>
    (!grado || f.Grado === grado)
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
  const semanas = [1, 2, 3, 4, 5, 6];
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
    }

    const secs = [...new Set(state.equipos.map(e => e.seccion).filter(Boolean))].sort();
    $('#agilSeccion').innerHTML = '<option value="">-- Seleccionar Sección --</option>' +
      secs.map(s => `<option value="${s}">${s}</option>`).join('');

    $('#agilSeccion').onchange = () => {
      const s = $('#agilSeccion').value;
      const eqs = state.equipos.filter(e => String(e.seccion).trim() === String(s).trim());
      $('#agilEquipo').innerHTML = '<option value="">-- Seleccionar Equipo --</option>' +
        eqs.map(e => `<option value="${e.equipo_id}">${e.nombre_equipo} (${e.grado})</option>`).join('');
      $('#agilPanelCalificacion').style.display = 'none';
      $('#agilBannerSemana').style.display = 'none';
    };

    $('#agilEquipo').onchange = () => {
      $('#agilPanelCalificacion').style.display = 'none';
      $('#agilBannerSemana').style.display = 'none';
    };

    $('#btnCargarCalificacionAgil').onclick = cargarCalificacionAgil;
    $('#btnGuardarTodoAgil').onclick = guardarCalificacionAgilCompleta;
    $('#btnAutoLlenar5').onclick = autoLlenarMaximos;

  } catch (e) {
    toast('❌ Error inicializando calificación: ' + e.message);
  }
}

async function cargarCalificacionAgil() {
  const eqId = $('#agilEquipo').value;
  const semana = Number($('#agilSemana').value) || 1;

  if (!eqId) { toast('⚠️ Por favor selecciona un equipo'); return; }

  try {
    $('#btnCargarCalificacionAgil').disabled = true;
    $('#btnCargarCalificacionAgil').textContent = '⏳ Cargando...';

    const equipo = state.equipos.find(e => String(e.equipo_id) === String(eqId));
    const grado = equipo?.grado || '1° Secundaria';

    // Cargar plan de esta semana y grado
    const planSemana = state.plan.filter(p =>
      String(p.Grado).trim() === String(grado).trim() &&
      Number(p.Semana) === semana
    );

    // Intentar leer calificaciones previas de la API
    let datosApi = null;
    try {
      datosApi = await apiGet('calificacion-semana', { equipo_id: eqId, semana });
    } catch (e) {
      // Si la API remota aún no tiene el endpoint nuevo, sintetizar desde state
      datosApi = null;
    }

    // Miembros del equipo
    const miembros = state.alumnos.filter(a => String(a.equipo_id) === String(eqId));

    // Buscar evidencias cargadas
    const evidenciasSemana = state.evidencias.filter(ev =>
      String(ev.equipo_id) === String(eqId) && Number(ev.semana) === semana
    );

    datosCalificacionAgilActual = {
      equipo_id: eqId,
      equipo,
      semana,
      planSemana,
      miembros,
      evidencias: evidenciasSemana,
      datosApi
    };

    renderPanelCalificacionAgil();

  } catch (e) {
    toast('❌ ' + e.message);
  } finally {
    $('#btnCargarCalificacionAgil').disabled = false;
    $('#btnCargarCalificacionAgil').textContent = '🔄 Cargar Datos';
  }
}

function renderPanelCalificacionAgil() {
  const { equipo, semana, planSemana, miembros, evidencias, datosApi } = datosCalificacionAgilActual;

  // Banner
  $('#agilProyectoNombre').textContent = equipo.proyecto || 'Proyecto Emprendedor';
  $('#agilTecnologia').textContent = planSemana[0]?.Tecnologia || 'Herramientas Digitales';
  $('#agilTrelloLink').innerHTML = equipo.trello_url
    ? `<a href="${equipo.trello_url}" target="_blank" rel="noopener" class="btn-trello" style="padding:2px 8px;font-size:11px">🔗 Abrir Trello ↗</a>`
    : '<em>Sin enlace</em>';

  const yaCalificado = datosApi?.calificacion_grupal_existente?.calificado;
  $('#agilEstadoCalificacion').textContent = yaCalificado ? '✅ Ya Calificado (Modo Edición)' : '⏳ Pendiente de Calificar';
  $('#agilEstadoCalificacion').className = 'badge-estado ' + (yaCalificado ? 'calificado' : 'pendiente');
  $('#agilBannerSemana').style.display = 'flex';

  // Consigna grupal de la semana
  $('#agilConsignaGrupalTexto').textContent = planSemana[0]?.Tema_Semanal
    ? `${planSemana[0].Tema_Semanal} — Todos los miembros deben colaborar en la entrega conjunta.`
    : `Semana ${semana} de trabajo.`;

  // Rúbrica grupal
  const rubricaG = [...(state.rubricaGrupal || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const prevG = datosApi?.calificacion_grupal_existente?.criterios || [];

  $('#tablaRubricaGrupalAgil tbody').innerHTML = rubricaG.map(r => {
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

  $('#agilObsPcG处').value = datosApi?.calificacion_grupal_existente?.observacion_pc || '';
  $('#agilComentarioGrupal').value = datosApi?.calificacion_grupal_existente?.comentario || '';

  // Rúbrica Individual por Alumno
  const rubricaI = [...(state.rubricaIndividual || [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const contAlumnos = $('#agilContenedorAlumnos');

  if (!miembros.length) {
    contAlumnos.innerHTML = '<p class="hint" style="grid-column:1/-1">⚠️ Este equipo no tiene alumnos asignados actualmente.</p>';
  } else {
    contAlumnos.innerHTML = miembros.map(al => {
      const rolUpper = String(al.rol || 'CEO').toUpperCase();
      const planRol = planSemana.find(p => String(p.Rol).toUpperCase() === rolUpper) || {};
      const evAl = evidencias.find(e => String(e.correo_alumno).toLowerCase() === String(al.correo).toLowerCase());
      
      const prevInd = datosApi?.calificaciones_individuales_existentes?.find(x =>
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

      return `
        <div class="alumno-eval-card" data-correo="${al.correo}">
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
                  const valPrevI = prevInd?.criterios?.find(c => c.criterio_id === ri.criterio_id)?.puntaje ?? (yaCalificado ? 0 : ri.peso_max || 5);
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

async function guardarCalificacionAgilCompleta() {
  if (!datosCalificacionAgilActual) return;
  const { equipo_id, semana } = datosCalificacionAgilActual;

  // 1. Recolectar Grupal
  const filasG = $$('#tablaRubricaGrupalAgil tbody tr');
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
    const asumioBackup = card.querySelector('.check-backup-bonus').checked;

    return {
      correo_alumno: correo,
      criterios,
      observacion_pc: obsInd,
      bonus_backup: asumioBackup ? { puntos: 10, motivo: `Asumió Rol Backup en Semana ${semana}` } : null
    };
  });

  const entregaId = `${equipo_id}_SEM_${semana}`;

  try {
    $('#btnGuardarTodoAgil').disabled = true;
    $('#agilStatusGuardado').textContent = '⏳ Guardando en la nube...';
    $('#agilStatusGuardado').style.color = 'var(--azul)';

    // Intentar endpoint de calificación unificada
    try {
      await apiPost('guardar-calificacion-semana', {
        equipo_id,
        semana,
        entrega_id: entregaId,
        calificacion_grupal: {
          criterios: criteriosGrupales,
          comentario: comGrupal,
          observacion_pc: obsPcGrupal
        },
        calificaciones_individuales: evaluacionesIndividuales
      });
    } catch (e) {
      // Fallback a los endpoints tradicionales si es necesario
      await apiPost('calificar', {
        entrega_id: entregaId,
        equipo_id: equipo_id,
        criterios: criteriosGrupales,
        comentario: comGrupal,
        observacion_pc: obsPcGrupal
      });

      for (const ind of evaluacionesIndividuales) {
        await apiPost('calificar-individual', {
          entrega_id: entregaId,
          equipo_id: equipo_id,
          correo_alumno: ind.correo_alumno,
          criterios: ind.criterios,
          observacion_pc: ind.observacion_pc
        });

        if (ind.bonus_backup) {
          try {
            await apiPost('otorgar-puntos-extra', {
              tipo_destinatario: 'alumno',
              destinatario_id: ind.correo_alumno,
              puntos: 10,
              motivo: ind.bonus_backup.motivo,
              categoria: 'backup'
            });
          } catch (errXp) {}
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
    $('#btnGuardarTodoAgil').disabled = false;
  }
}

/* =========================================================
   4. GESTIÓN DE GRUPOS Y ROLES (DOCENTE)
   ========================================================= */
async function cargarGestion() {
  try {
    const [eqData, alData] = await Promise.all([
      apiGet('equipos'),
      apiGet('alumnos')
    ]);
    state.equipos = eqData.equipos || [];
    state.alumnos = alData.alumnos || [];

    // Poblar filtro sección
    const secs = [...new Set(state.equipos.map(e => e.seccion).filter(Boolean))].sort();
    $('#filtroGestionSeccion').innerHTML = '<option value="">Todas las secciones</option>' +
      secs.map(s => `<option value="${s}">${s}</option>`).join('');

    $('#filtroGestionSeccion').onchange = renderEquiposVisuales;
    $('#busquedaAlumnoInput').oninput = renderTablaAlumnosGestion;

    renderEquiposVisuales();
    renderTablaAlumnosGestion();

  } catch (e) {
    toast('❌ Error en gestión: ' + e.message);
  }
}

function renderEquiposVisuales() {
  const cont = $('#contenedorEquiposVisual');
  const filtroSec = $('#filtroGestionSeccion').value;

  const equiposFiltrados = filtroSec
    ? state.equipos.filter(e => String(e.seccion).trim() === String(filtroSec).trim())
    : state.equipos;

  if (!equiposFiltrados.length) {
    cont.innerHTML = '<p class="hint" style="grid-column:1/-1">No hay equipos registrados para esta sección.</p>';
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
            ${al ? `<b>${al.nombre || al.correo}</b>` : `<span class="slot-vacio">Sin asignar</span>`}
          </div>
          ${al ? `<small style="color:#666">${al.dni || ''}</small>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="equipo-visual-card">
        <div class="eq-card-header">
          <div>
            <h3>${eq.nombre_equipo}</h3>
            <small style="color:#666">${eq.grado} · ${eq.proyecto || 'Proyecto'}</small>
          </div>
          <span class="sec-badge">${eq.seccion || '1A'}</span>
        </div>

        ${eq.trello_url ? `<p style="font-size:12px;margin-bottom:8px">📋 <a href="${eq.trello_url}" target="_blank" rel="noopener">Trello oficial ↗</a></p>` : ''}

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
  const q = ($('#busquedaAlumnoInput').value || '').toLowerCase().trim();

  const filtrados = state.alumnos.filter(a => {
    if (!q) return true;
    const n = (a.nombre || [a.nombres, a.apellidos].filter(Boolean).join(' ') || '').toLowerCase();
    const c = (a.correo || '').toLowerCase();
    const d = (a.dni || '').toLowerCase();
    return n.includes(q) || c.includes(q) || d.includes(q);
  });

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">No se encontraron estudiantes</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map(a => {
    const eq = state.equipos.find(e => String(e.equipo_id) === String(a.equipo_id))?.nombre_equipo || a.equipo_id || '—';
    return `
      <tr>
        <td><b>${a.nombre || [a.nombres, a.apellidos].filter(Boolean).join(' ') || '—'}</b></td>
        <td>${a.dni || '—'}</td>
        <td>${a.correo}</td>
        <td>${a.grado || '—'}</td>
        <td style="text-align:center">${a.seccion || '—'}</td>
        <td>${eq}</td>
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
  const posiblesAlumnos = state.alumnos.filter(a =>
    !a.equipo_id || a.equipo_id === equipoId || a.seccion === eq.seccion
  );

  const roles = ['CEO', 'CTO', 'CMO', 'CFO'];

  const slotsSelects = roles.map(r => {
    const actual = miembros.find(m => String(m.rol).toUpperCase() === r);
    const opciones = '<option value="">-- Sin asignar --</option>' + posiblesAlumnos.map(al => {
      const sel = actual && al.correo === actual.correo ? 'selected' : '';
      return `<option value="${al.correo}" ${sel}>${al.nombre || al.correo} (${al.seccion || ''})</option>`;
    }).join('');

    return `
      <div class="form-group">
        <label><span class="badge-rol rol-${r}" style="font-size:10px;padding:2px 6px">${r}</span> Asignar Estudiante:</label>
        <select id="asigRol_${r}" class="select select-full">${opciones}</select>
      </div>`;
  }).join('');

  $('#modalAsignarTitulo').textContent = `Configurar Equipo: ${eq.nombre_equipo}`;
  $('#modalAsignarBody').innerHTML = `
    <div class="form-group">
      <label>Nombre del Equipo:</label>
      <input type="text" id="asigNombreEq" value="${eq.nombre_equipo || ''}" class="input-full">
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
        <input type="text" id="asigSeccionEq" value="${eq.seccion || '1A'}" class="input-full">
      </div>
    </div>
    <div class="form-group">
      <label>Proyecto de Emprendimiento:</label>
      <input type="text" id="asigProyectoEq" value="${eq.proyecto || ''}" class="input-full">
    </div>
    <div class="form-group">
      <label>URL Oficial del Tablero Trello:</label>
      <input type="url" id="asigTrelloEq" value="${eq.trello_url || ''}" placeholder="https://trello.com/b/..." class="input-full">
    </div>
    <h4 style="margin:16px 0 10px;color:var(--azul-oscuro)">Asignación de Roles Obligatorios:</h4>
    ${slotsSelects}
  `;

  $('#btnGuardarAsignarEq').onclick = async () => {
    const payload = {
      equipo_id: eq.equipo_id,
      nombre_equipo: $('#asigNombreEq').value.trim(),
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
  const slotsSelects = roles.map(r => {
    const opciones = '<option value="">-- Sin asignar --</option>' + state.alumnos.map(al =>
      `<option value="${al.correo}">${al.nombre || al.correo} (${al.seccion || ''})</option>`
    ).join('');
    return `
      <div class="form-group">
        <label><span class="badge-rol rol-${r}" style="font-size:10px;padding:2px 6px">${r}</span> Estudiante Asignado:</label>
        <select id="asigRol_${r}" class="select select-full">${opciones}</select>
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
          <option>1° Secundaria</option>
          <option>2° Secundaria</option>
          <option>3° Secundaria</option>
          <option>4° Secundaria</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sección:</label>
        <input type="text" id="asigSeccionEq" value="1A" class="input-full">
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
    <h4 style="margin:16px 0 10px;color:var(--azul-oscuro)">Asignación Inicial de Roles:</h4>
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
  };

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
    return `<option value="${e.equipo_id}" ${sel}>${e.nombre_equipo} (${e.seccion || ''})</option>`;
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
    `<option value="${e.equipo_id}">${e.nombre_equipo} (${e.seccion || ''})</option>`
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
  const secs = [...new Set(state.equipos.map(e => e.seccion).filter(Boolean))].sort();
  $('#reporteFiltroSeccion').innerHTML = '<option value="">-- Todas las Secciones --</option>' +
    secs.map(s => `<option value="${s}">Sección ${s}</option>`).join('');

  $('#reporteFiltroSeccion').onchange = () => {
    const s = $('#reporteFiltroSeccion').value;
    const eqs = s ? state.equipos.filter(e => String(e.seccion).trim() === String(s).trim()) : state.equipos;
    $('#reporteFiltroEquipo').innerHTML = '<option value="">-- Todos los Equipos --</option>' +
      eqs.map(e => `<option value="${e.equipo_id}">${e.nombre_equipo}</option>`).join('');
    renderReporteImprimible();
  };

  $('#reporteFiltroEquipo').onchange = renderReporteImprimible;
  $('#checkOcultarDatosSensibles').onchange = renderReporteImprimible;
  $('#btnImprimirReporte').onclick = () => window.print();

  renderReporteImprimible();
}

function renderReporteImprimible() {
  const secFiltro = $('#reporteFiltroSeccion').value;
  const eqFiltro = $('#reporteFiltroEquipo').value;
  const ocultarSensibles = $('#checkOcultarDatosSensibles').checked;

  $('#reporteFechaEmision').textContent = 'Fecha: ' + new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  let equipos = state.equipos;
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
            <td><b>${m.nombre || [m.nombres, m.apellidos].filter(Boolean).join(' ') || m.correo}</b></td>
            ${!ocultarSensibles ? `<td>${dniMostrar}</td>` : ''}
            <td><span class="badge-rol rol-${m.rol || 'CEO'}" style="font-size:10px;padding:2px 6px">${m.rol || 'CEO'}</span></td>
            <td>${correoMostrar}</td>
          </tr>`;
      }).join('');

      return `
        <div style="margin-bottom:20px;border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:#fff">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
            <div>
              <strong style="color:var(--azul-oscuro);font-size:14px">Equipo: ${eq.nombre_equipo}</strong>
              <span style="color:#555;margin-left:10px">Grado: ${eq.grado} · Proyecto: ${eq.proyecto || '—'}</span>
            </div>
            <div><b>Trello:</b> ${eq.trello_url || '—'}</div>
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
            <b>${c?.nombre || 'Vacante'}</b>
            <small style="display:block;color:#666">${c?.correo || ''}</small>
          </div>
        </div>
      </div>`;
  }).join('');

  $('#infoMiEquipo').innerHTML = `
    <div style="margin-bottom:20px">
      <h3>${eq.nombre}</h3>
      <p class="hint">${eq.grado} · Sección ${eq.seccion || '—'} · Proyecto: <b>${eq.proyecto}</b></p>
      ${eq.trello_url ? `<p style="margin-top:8px">📋 Tablero Trello: <a href="${eq.trello_url}" target="_blank" rel="noopener" class="btn-trello">Abrir Trello ↗</a></p>` : ''}
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
}

async function cargarMisNotasAlumno() {
  const correo = state.sesion.correo;
  const cont = $('#contenedorMisNotasCompleto');

  try {
    const data = await apiGet('mi-nota', { correo });
    const porSemana = data.porSemana || [];

    const semanasHTML = porSemana.map(s => `
      <div class="entrega-card ${s.calificado ? 'calificada' : 'pendiente'}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h4>Semana ${s.semana} ${s.calificado ? `✅ ${s.total}/${s.max} pts` : '⏳ Pendiente de Calificación'}</h4>
          <span style="font-size:12px;color:#666">${s.observacion_pc ? `PC: "${s.observacion_pc}"` : ''}</span>
        </div>
        ${s.calificado && s.detalle ? `
          <div style="margin-top:8px">
            ${s.detalle.map(d => `
              <div class="criterio-mini">
                <b>${d.criterio}:</b> ${d.puntaje}/${d.max}
                ${d.comentario ? `<em> — "${d.comentario}"</em>` : ''}
              </div>`).join('')}
          </div>
        ` : '<p class="hint" style="margin-top:4px">Aún no calificada por el docente.</p>'}
      </div>
    `).join('');

    cont.innerHTML = `
      <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
        <div class="posicion-destacada" style="flex:1">
          <div class="num">${data.totalGeneral || 0}</div>
          <div class="lbl">Puntos Totales Acumulados (XP)</div>
        </div>
        <div class="posicion-destacada" style="flex:1;background:linear-gradient(135deg,#e8f0fe,#fff);border-color:#1a73e8">
          <div class="num" style="color:#1a73e8">${data.porcentaje || 0}%</div>
          <div class="lbl">Porcentaje de Rendimiento General</div>
        </div>
      </div>
      <h3 style="margin-bottom:12px;color:var(--azul-oscuro)">Detalle Semanal de Calificaciones:</h3>
      ${semanasHTML}
    `;

  } catch (e) {
    cont.innerHTML = `<p class="hint">No se pudieron cargar tus calificaciones: ${e.message}</p>`;
  }
}

/* =========================================================
   8. RANKINGS (EQUIPOS E INDIVIDUAL)
   ========================================================= */
function renderRanking() {
  const tbody = $('#tablaRanking tbody');
  const filtroSec = $('#filtroSeccion').value;
  $('#badgeFiltroSeccion').textContent = filtroSec ? `Sección ${filtroSec}` : 'Todas las Secciones';

  if (!state.ranking.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px">No hay calificaciones registradas</td></tr>';
    return;
  }

  const miEquipoId = state.sesion?.tipo === 'alumno' ? state.sesion.alumno?.equipo_id : null;

  tbody.innerHTML = state.ranking.map(r => {
    const medalla = r.posicion === 1 ? '🥇' : r.posicion === 2 ? '🥈' : r.posicion === 3 ? '🥉' : r.posicion;
    const clase = r.posicion <= 3 ? `rank-${r.posicion}` : '';
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
        <td>${r.proyecto || '—'}</td>
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
  if (!state.rankingIndividual.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px">Sin evaluaciones individuales registradas</td></tr>';
    return;
  }

  const miCorreo = state.sesion?.tipo === 'alumno' ? state.sesion.correo : null;

  tbody.innerHTML = state.rankingIndividual.map(r => {
    const medalla = r.posicion === 1 ? '🥇' : r.posicion === 2 ? '🥈' : r.posicion === 3 ? '🥉' : r.posicion;
    const clase = r.posicion <= 3 ? `rank-${r.posicion}` : '';
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

/* =========================================================
   9. PLAN SEMANAL (MATRIZ DATA)
   ========================================================= */
function renderPlan() {
  const d = datosFiltrados();
  $('#tablaPlan tbody').innerHTML = d.map(x => `
    <tr>
      <td><b>${x.Grado}</b></td>
      <td style="text-align:center"><b>${x.Semana}</b></td>
      <td>${x.Tema_Semanal}</td>
      <td><span class="badge-rol rol-${x.Rol}" style="font-size:10px;padding:2px 6px">${x.Rol}</span></td>
      <td>${x.Tarea_Detallada}</td>
      <td>${x.Entregable_Especifico}</td>
      <td><b>${x.Rol_Backup || '—'}</b></td>
      <td style="font-size:12px;color:#555">${x.Responsabilidad_Backup || '—'}</td>
    </tr>`).join('');
}

/* =========================================================
   10. MODAL GENÉRICO
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
    state.semanaSeleccionadaAlumno = Number(e.target.value) || 1;
    renderDashboardAlumno();
  };
  $('#formEvidenciaAlumno').onsubmit = guardarEvidenciaAlumno;

  // Tabs de modo entrega (Link web o Archivo Drive)
  if ($('#btnTabModoLink') && $('#btnTabModoArchivo')) {
    $('#btnTabModoLink').onclick = () => {
      $('#btnTabModoLink').classList.add('active');
      $('#btnTabModoArchivo').classList.remove('active');
      $('#formEvidenciaAlumno').style.display = 'block';
      $('#formArchivoAlumno').style.display = 'none';
    };
    $('#btnTabModoArchivo').onclick = () => {
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
      await apiGet('login', { correo: state.sesion.correo });
    } catch (e) {
      if (!invalidarSesionPorToken(e.message)) {
        console.error('No se pudo validar sesión guardada:', e);
      }
    }
    if (!state.sesion) return;

    mostrarApp();
    await arrancarApp();
  } else {
    mostrarLogin();
  }
}

async function arrancarApp() {
  ponerFraseMotivadoraAleatoria();
  await cargarPlan();

  // Filtros de topbar
  const grados = [...new Set(state.plan.map(f => f.Grado))].sort();
  $('#filtroGrado').innerHTML = '<option value="">Todos los grados</option>' +
    grados.map(g => `<option value="${g}">${g}</option>`).join('');

  if (state.sesion.tipo === 'docente') {
    try {
      const login = await apiGet('login', { correo: state.sesion.correo });
      const secs = login.secciones || [];
      $('#filtroSeccion').innerHTML = '<option value="">Todas las secciones</option>' +
        secs.map(s => `<option value="${s}">${s}</option>`).join('');
    } catch (e) {}
  } else if (state.sesion.alumno?.seccion) {
    $('#filtroSeccion').innerHTML =
      `<option value="${state.sesion.alumno.seccion}">Sección ${state.sesion.alumno.seccion}</option>`;
    $('#filtroSeccion').value = state.sesion.alumno.seccion;
  }

  // Listeners de navegación
  $$('.menu-item').forEach(b => b.addEventListener('click', () => navegar(b.dataset.view)));
  $('#toggleSidebar').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  $('#filtroSeccion').onchange = () => {
    if ($('#view-dashboard').classList.contains('active')) {
      if (state.sesion.tipo === 'docente') renderDashboardDocente();
    }
    if ($('#view-ranking').classList.contains('active')) cargarRanking();
    if ($('#view-ranking-individual').classList.contains('active')) cargarRankingIndividual();
  };

  $('#filtroGrado').onchange = () => {
    if ($('#view-dashboard').classList.contains('active') && state.sesion.tipo === 'docente') renderDashboardDocente();
    if ($('#view-plan').classList.contains('active')) renderPlan();
  };

  $('#btnRefresh').onclick = async () => {
    await cargarPlan();
    if (state.sesion.tipo === 'docente') renderDashboardDocente();
    else renderDashboardAlumno();
    toast('🔄 Datos actualizados');
  };

  // Render inicial según rol
  if (state.sesion.tipo === 'alumno') {
    renderDashboardAlumno();
  } else {
    renderDashboardDocente();
    // Precargar datos docentes
    cargarGestion();
    cargarGamificacion();
  }

  // Notificación motivacional de bienvenida
  setTimeout(() => {
    toast(`👋 ¡Bienvenido/a, ${state.sesion.nombre}! Que tengas una semana de grandes aprendizajes.`, 4000);
  }, 1000);
}

document.addEventListener('DOMContentLoaded', init);