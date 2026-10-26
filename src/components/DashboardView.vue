<template>
<section class="view active" id="view-dashboard">
      <!-- Tarjeta Motivacional -->
      <div class="card card-motivacional" id="cardMotivacional">
        <div class="motivacional-content">
          <div class="motivacional-icon">💡</div>
          <div>
            <blockquote id="textoFraseMotivadora">"La mejor forma de predecir el futuro es crearlo."</blockquote>
            <cite id="autorFraseMotivadora">— Peter Drucker</cite>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btnNuevaFrase" title="Ver otra frase">✨ Otra frase</button>
      </div>

      <!-- DASHBOARD ALUMNO: VISTA AUTOMATIZADA POR ROL -->
      <div id="dashboardAlumnoContainer" class="rol-alumno" style="display:none">
        
        <!-- Header Alumno con Semana -->
        <div class="semana-header-card">
          <div class="semana-info">
            <span class="badge-rol" id="dashAlumnoBadgeRol">CEO</span>
            <div>
              <h2 id="dashAlumnoTituloProyecto">Proyecto: Cargando...</h2>
              <p class="hint" id="dashAlumnoSubtitulo">Grado y Sección</p>
            </div>
          </div>
          <div class="semana-selector-wrap">
            <label for="dashAlumnoSemanaSelect"><b>Semana de Trabajo:</b></label>
            <select id="dashAlumnoSemanaSelect" class="select select-lg">
              <option value="1">Semana 1 · Equipo y Problema</option>
              <option value="2">Semana 2 · Solución y MVP</option>
              <option value="3">Semana 3 · Canales e Ingresos</option>
              <option value="4">Semana 4 · Métricas y Ajustes</option>
              <option value="5">Semana 5 · Testeo y Pitch</option>
              <option value="6">Semana 6 · Feria / Demo Day</option>
            </select>
          </div>
        </div>

        <div class="grid-dashboard-alumno">
          <!-- Tarea Individual por Rol -->
          <div class="card card-tarea-individual">
            <div class="card-tag">🎯 Tu Tarea Individual de la Semana</div>
            <h3 id="dashAlumnoTemaSemanal">Tema Semanal</h3>
            
            <div class="tarea-box">
              <label>📝 Tarea obligatoria según tu rol:</label>
              <p id="dashAlumnoTareaDetallada" class="tarea-texto">Cargando tarea...</p>
            </div>

            <div class="entregable-box">
              <label>📦 Entregable específico a presentar en la PC:</label>
              <p id="dashAlumnoEntregableEspecifico" class="entregable-texto">Cargando entregable...</p>
            </div>

            <div class="ley-box">
              ⚖️ <b>Nota Ley 32172:</b> <span id="dashAlumnoLey">Uso computadoras IE. Sin celulares.</span>
            </div>
          </div>

          <!-- Entregable Grupal & Trello -->
          <div class="card card-grupal-trello">
            <div class="card-tag">👥 Entregable Grupal del Equipo</div>
            <h3 id="dashAlumnoProyectoNombre">Proyecto de Equipo</h3>
            <p class="hint" id="dashAlumnoTecnologia">Tecnología: Canva / Glide / Sheets</p>

            <div class="trello-callout">
              <div class="trello-icon">📋</div>
              <div class="trello-info">
                <strong>Coordinación en Trello</strong>
                <p>Las tareas individuales y grupales se gestionan moviendo tarjetas en el tablero oficial.</p>
                <a id="btnDashTrello" href="#" target="_blank" rel="noopener" class="btn btn-trello">
                  <span>🔗</span> Abrir Tablero Trello del Equipo
                </a>
              </div>
            </div>

            <!-- Red de Seguridad / Rol Backup -->
            <div class="backup-alert-box" id="dashAlumnoBackupBox">
              <div class="backup-header">
                <span class="backup-icon">🛡️</span>
                <strong>Red de Seguridad y Responsabilidad Backup</strong>
              </div>
              <p id="dashAlumnoBackupResponsabilidad" class="backup-desc">
                Si un compañero de equipo no puede cumplir su tarea, entra en acción la responsabilidad de rescate.
              </p>
              <div class="backup-badge-info">
                <span>⚡ <b>Bonus de Gamificación:</b> Cumplir tu tarea y rescatar la de un compañero otorga <b>+10 XP Extra</b> en el ranking.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Carga de Evidencia / Enlace y Archivos Drive -->
        <div class="card card-entrega-evidencia">
          <div class="card-header-flex">
            <div>
              <h2>📤 Cargar Evidencia de tu Trabajo</h2>
              <p class="hint">Puedes pegar un enlace web (Canva, Carrd, Docs) o subir un archivo físico (PDF, PNG, Doc) directamente a Google Drive.</p>
            </div>
            <div class="evidencia-modo-tabs">
              <button type="button" class="btn-tab active" id="btnTabModoLink">🔗 Pegar Enlace</button>
              <button type="button" class="btn-tab" id="btnTabModoArchivo">📁 Subir Archivo a Drive</button>
            </div>
          </div>
          
          <!-- MODO 1: PEGAR ENLACE -->
          <form id="formEvidenciaAlumno" class="form-evidencia">
            <div class="form-group-inline">
              <input type="url" id="inputLinkEvidencia" placeholder="https://www.canva.com/design/... o https://docs.google.com/..." class="input-url">
              <button type="submit" class="btn btn-primary" id="btnGuardarEvidencia">📤 Guardar Enlace</button>
            </div>
            <div class="form-group">
              <input type="text" id="inputComentarioEvidencia" placeholder="Comentario opcional: Ej: Se terminaron los 2 logos y se seleccionó el oficial" class="input-text">
            </div>
          </form>

          <!-- MODO 2: SUBIR ARCHIVO A GOOGLE DRIVE -->
          <form id="formArchivoAlumno" class="form-evidencia" style="display:none">
            <div class="drive-folder-banner">
              📁 Se guardará en Google Drive del colegio en: <b>Entregas EPT - San Martín</b>
            </div>
            <div class="form-group-inline" style="margin-top:10px">
              <input type="file" id="inputFileEvidencia" class="input-file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx">
              <button type="submit" class="btn btn-primary" id="btnSubirArchivoDrive">☁️ Subir a Drive</button>
            </div>
            <div class="form-group">
              <input type="text" id="inputComentarioArchivo" placeholder="Comentario opcional para el archivo..." class="input-text">
            </div>
            <div id="uploadProgress" style="display:none;font-size:12px;color:var(--azul);margin-top:6px">
              ⏳ Subiendo archivo a Google Drive, por favor espera...
            </div>
          </form>

          <div id="estadoEvidenciaCargada" class="estado-evidencia" style="display:none">
            <span class="check-icon">✅</span>
            <div class="evidencia-info">
              <strong>Evidencia Registrada para esta semana:</strong>
              <a id="linkEvidenciaActual" href="#" target="_blank" rel="noopener">Ver entrega ↗</a>
              <small id="fechaEvidenciaActual">—</small>
            </div>
          </div>
        </div>

      </div>

      <!-- DASHBOARD DOCENTE: METRICAS Y VISTA GLOBAL -->
      <div id="dashboardDocenteContainer" class="rol-docente">
        <div class="kpis" id="kpis"></div>
        <div class="grid-2">
          <div class="card"><h2>📅 Matriz de Tareas por Grado y Semana</h2><div id="matrizGradoSemana"></div></div>
          <div class="card"><h2>👥 Distribución por Roles de Emprendimiento</h2><div id="chartRoles"></div></div>
          <div class="card"><h2>🏷️ Distribución por Grado Escolar</h2><div id="chartGrado"></div></div>
          <div class="card"><h2>🏆 Acceso Rápido a Calificación</h2>
            <p class="hint">El sistema lee automáticamente el Plan Semanal del Excel y conoce qué le toca a cada estudiante según su rol (CEO, CTO, CMO, CFO).</p>
            <button class="btn btn-primary" onclick="navegar('calificacion-agil')">⚡ Ir a Calificación Ágil</button>
          </div>
        </div>
      </div>
    </section>
</template>
