<template>
<section class="view" id="view-reportes">
      <div class="card no-print">
        <div class="card-header-flex">
          <div>
            <h2>📄 Reportes y Listas Imprimibles</h2>
            <p class="hint">Genera listas oficiales segmentadas por sección y grupo con opción de privacidad para el aula.</p>
          </div>
          <div class="toolbar">
            <button class="btn btn-primary" id="btnImprimirReporte">🖨️ Imprimir / Guardar en PDF</button>
          </div>
        </div>

        <!-- Controles de Configuración de Reporte -->
        <div class="toolbar toolbar-reporte">
          <div class="form-field">
            <label for="reporteFiltroGrado">Grado:</label>
            <select id="reporteFiltroGrado" class="select"><option value="">-- Selecciona un grado --</option></select>
          </div>
          <div class="form-field">
            <label for="reporteFiltroSeccion">Sección:</label>
            <select id="reporteFiltroSeccion" class="select" disabled><option value="">-- Primero elige grado --</option></select>
          </div>
          <div class="form-field">
            <label for="reporteFiltroEquipo">Equipo (opcional):</label>
            <select id="reporteFiltroEquipo" class="select" disabled><option value="">-- Primero elige sección --</option></select>
          </div>
          <div class="form-field form-field-check">
            <label class="checkbox-label">
              <input type="checkbox" id="checkOcultarDatosSensibles" checked>
              <span>🔒 <b>Ocultar datos sensibles</b> (DNI y Correo del alumno)</span>
            </label>
          </div>
        </div>
      </div>

      <div class="card reporte-calificaciones-controles no-print">
        <div class="card-header-flex">
          <div>
            <h2>📊 Reporte detallado de calificaciones</h2>
            <p class="hint">Consulta las notas por entrega y los puntos adicionales otorgados en el grado y sección seleccionados.</p>
          </div>
          <button type="button" class="btn btn-primary" id="btnImprimirCalificaciones" disabled>🖨️ Imprimir reporte</button>
        </div>
        <div class="toolbar toolbar-reporte">
          <div class="form-field">
            <label for="calificacionesFiltroGrado">Grado:</label>
            <select id="calificacionesFiltroGrado" class="select"><option value="">-- Selecciona un grado --</option></select>
          </div>
          <div class="form-field">
            <label for="calificacionesFiltroSeccion">Sección:</label>
            <select id="calificacionesFiltroSeccion" class="select" disabled><option value="">-- Primero elige grado --</option></select>
          </div>
        </div>
        <div class="reporte-calificaciones-tabs" role="group" aria-label="Tipo de reporte">
          <button type="button" class="btn btn-sm active" id="btnReporteEntregas" aria-pressed="true">📝 Calificaciones por entrega</button>
          <button type="button" class="btn btn-ghost btn-sm" id="btnReportePuntosExtra" aria-pressed="false">⚡ Puntos adicionales</button>
        </div>
        <p id="reporteCalificacionesEstado" class="hint" role="status" aria-live="polite">Selecciona grado y sección para cargar el detalle.</p>
      </div>

      <div class="reporte-imprimible-wrap reporte-calificaciones-salida" id="reporteCalificacionesImprimible" style="display:none">
        <div class="membrete-oficial">
          <div class="escudo">🏫</div>
          <div class="membrete-texto">
            <h3>INSTITUCIÓN EDUCATIVA SAN MARTÍN</h3>
            <h4>ÁREA DE EDUCACIÓN PARA EL TRABAJO · EMPRENDIMIENTO DIGITAL 2026</h4>
            <p id="reporteCalificacionesSubtitulo">Reporte de calificaciones</p>
          </div>
          <div class="fecha-emision" id="reporteCalificacionesFecha">Fecha: —</div>
        </div>
        <div id="reporteCalificacionesResumen" class="reporte-calificaciones-resumen"></div>
        <div id="reporteCalificacionesContenido"></div>
      </div>

      <!-- ZONA DE IMPRESIÓN (FORMATO OFICIAL ESCOLAR) -->
      <div class="reporte-imprimible-wrap" id="zonaImpresion">
        <!-- Encabezado Oficial -->
        <div class="membrete-oficial">
          <div class="escudo">🏫</div>
          <div class="membrete-texto">
            <h3>INSTITUCIÓN EDUCATIVA SAN MARTÍN</h3>
            <h4>ÁREA DE EDUCACIÓN PARA EL TRABAJO · EMPRENDIMIENTO DIGITAL 2026</h4>
            <p id="reporteSubtitulo">Reporte de Equipos, Roles y Calificaciones · Bimestre 4</p>
          </div>
          <div class="fecha-emision" id="reporteFechaEmision">Fecha: —</div>
        </div>

        <!-- Contenido Dinámico del Reporte -->
        <div id="reporteContenido"></div>

        <!-- Pie de Página Oficial -->
        <div class="pie-reporte">
          <div class="firma">
            <div class="linea-firma"></div>
            <span>Docente de Educación para el Trabajo</span>
          </div>
          <div class="firma">
            <div class="linea-firma"></div>
            <span>Coordinación Pedagógica</span>
          </div>
        </div>
      </div>
    </section>
</template>
