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
            <label>Sección:</label>
            <select id="reporteFiltroSeccion" class="select"><option value="">-- Todas las Secciones --</option></select>
          </div>
          <div class="form-field">
            <label>Equipo (opcional):</label>
            <select id="reporteFiltroEquipo" class="select"><option value="">-- Todos los Equipos --</option></select>
          </div>
          <div class="form-field form-field-check">
            <label class="checkbox-label">
              <input type="checkbox" id="checkOcultarDatosSensibles" checked>
              <span>🔒 <b>Ocultar datos sensibles</b> (DNI y Correo del alumno)</span>
            </label>
          </div>
        </div>
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
