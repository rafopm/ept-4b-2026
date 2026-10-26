<template>
<section class="view" id="view-calificacion-agil">
      <div class="card">
        <div class="card-header-flex">
          <div>
            <h2>⚡ Calificación Ágil y Automatizada (Core)</h2>
            <p class="hint">El sistema lee automáticamente el plan semanal. Selecciona sección, equipo y semana para cargar consignas, evidencias y notas.</p>
          </div>
          <div class="badge-ley">⚖️ Ley 32172: Verificable en PC</div>
        </div>

        <!-- Barra de Selección en Cascada -->
        <div class="toolbar toolbar-calificar">
          <div class="form-field">
            <label>1. Sección:</label>
            <select id="agilSeccion" class="select"><option value="">-- Seleccionar Sección --</option></select>
          </div>
          <div class="form-field">
            <label>2. Equipo:</label>
            <select id="agilEquipo" class="select"><option value="">-- Primero elija Sección --</option></select>
          </div>
          <div class="form-field">
            <label>3. Semana:</label>
            <select id="agilSemana" class="select">
              <option value="1">Semana 1 · Equipo y Problema</option>
              <option value="2">Semana 2 · Solución y MVP</option>
              <option value="3">Semana 3 · Canales e Ingresos</option>
              <option value="4">Semana 4 · Métricas y Ajustes</option>
              <option value="5">Semana 5 · Testeo y Pitch</option>
              <option value="6">Semana 6 · Feria / Demo Day</option>
            </select>
          </div>
          <div class="form-field form-field-btn">
            <button class="btn btn-secondary" id="btnCargarCalificacionAgil">🔄 Cargar Datos</button>
          </div>
        </div>

        <!-- Banner de Contexto de la Semana -->
        <div id="agilBannerSemana" class="banner-contexto" style="display:none">
          <div class="contexto-item">
            <span class="lbl">Proyecto:</span>
            <strong id="agilProyectoNombre">—</strong>
          </div>
          <div class="contexto-item">
            <span class="lbl">Tecnología:</span>
            <strong id="agilTecnologia">—</strong>
          </div>
          <div class="contexto-item">
            <span class="lbl">Trello:</span>
            <span id="agilTrelloLink">—</span>
          </div>
          <div class="contexto-item">
            <span class="lbl">Estado de Calificación:</span>
            <span id="agilEstadoCalificacion" class="badge-estado">—</span>
          </div>
        </div>

        <!-- Contenedor Principal de Calificación -->
        <div id="agilPanelCalificacion" style="display:none">
          
          <!-- RÚBRICA GRUPAL -->
          <div class="bloque-calificacion">
            <div class="bloque-header">
              <h3>👥 1. Evaluación Grupal (Entregable Conjunto)</h3>
              <span class="max-badge" id="agilMaxGrupal">Máx 20 pts</span>
            </div>

            <div class="consigna-grupal-box">
              <strong>📦 Objetivo Grupal de la Semana:</strong>
              <span id="agilConsignaGrupalTexto">Cargando...</span>
            </div>

            <div class="tabla-wrap">
              <table class="tabla tabla-rubrica-agil" id="tablaRubricaGrupalAgil">
                <thead>
                  <tr>
                    <th style="width:28%">Criterio</th>
                    <th style="width:40%">Qué observar en la PC</th>
                    <th style="width:12%;text-align:center">Puntaje</th>
                    <th style="width:8%;text-align:center">Máx</th>
                    <th style="width:12%">Acciones</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>

            <div class="grid-observaciones">
              <div>
                <label class="lbl-campo">📸 Observación de la PC (evidencia física verificada):</label>
                <input type="text" id="agilObsPcG处" placeholder="Ej: Mostraron en pantalla el sitio Canva publicado y funcionando" class="input-full">
              </div>
              <div>
                <label class="lbl-campo">💬 Retroalimentación general para el equipo:</label>
                <input type="text" id="agilComentarioGrupal" placeholder="Comentario formativo para el equipo" class="input-full">
              </div>
            </div>
          </div>

          <!-- EVALUACIÓN INDIVIDUAL POR ROL -->
          <div class="bloque-calificacion">
            <div class="bloque-header">
              <h3>👤 2. Evaluación Individual según Rol (CEO, CTO, CMO, CFO)</h3>
              <p class="hint">El sistema exige la evidencia exacta que el plan estipula para cada rol en esta semana.</p>
            </div>

            <div id="agilContenedorAlumnos" class="alumnos-agil-grid">
              <!-- Se generará dinámicamente cada alumno -->
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN GLOBAL -->
          <div class="acciones-guardar-agil">
            <button class="btn btn-success btn-lg" id="btnGuardarTodoAgil">
              💾 Guardar / Sobrescribir Calificación Semanal
            </button>
            <button class="btn btn-ghost" id="btnAutoLlenar5">
              ⭐ Todo 5 (Excelente desempeño)
            </button>
            <span id="agilStatusGuardado" class="status-msg"></span>
          </div>

        </div>

      </div>
    </section>
</template>
