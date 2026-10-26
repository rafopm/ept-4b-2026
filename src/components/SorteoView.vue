<template>
<section class="view" id="view-sorteo">
      <div class="card no-print">
        <div class="card-header-flex">
          <div>
            <h2>🎲 Sorteo y Turnos de Exposición / Entregas</h2>
            <p class="hint">Sortea aleatoriamente el orden de presentación de equipos o alumnos y gestiona el tiempo de exposición (Demo Day / Pitch).</p>
          </div>
          <div class="toolbar">
            <button class="btn btn-secondary" id="btnImprimirSorteo">🖨️ Imprimir Turnos</button>
            <button class="btn btn-ghost" id="btnReiniciarSorteo">🔄 Reiniciar</button>
          </div>
        </div>

        <!-- Toolbar de Opciones de Sorteo -->
        <div class="toolbar toolbar-reporte" style="margin-top:12px">
          <div class="form-field">
            <label><b>1. ¿Qué deseas sortear?</b></label>
            <select id="sorteoTipo" class="select">
              <option value="grupos">👥 Equipos / Grupos (Turno por Equipo)</option>
              <option value="alumnos">👤 Alumnos (Secuencia individual)</option>
              <option value="voceros">🎤 1 Vocero/Representante por Equipo</option>
            </select>
          </div>
          <div class="form-field">
            <label><b>2. Sección:</b></label>
            <select id="sorteoSeccion" class="select"><option value="">-- Seleccionar Sección --</option></select>
          </div>
          <div class="form-field">
            <label><b>3. Tiempo por Turno:</b></label>
            <select id="sorteoTiempo" class="select">
              <option value="3">3 minutos (Elevator Pitch)</option>
              <option value="5" selected>5 minutos (Pitch Estándar)</option>
              <option value="7">7 minutos (Pitch + Preguntas)</option>
              <option value="10">10 minutos (Demo Day Completo)</option>
            </select>
          </div>
          <div class="form-field form-field-btn">
            <button class="btn btn-primary btn-lg" id="btnLanzarSorteo">🎲 ¡Sortear Orden!</button>
          </div>
        </div>

        <!-- Caja de Animación de Ruleta (se muestra solo al sortear) -->
        <div id="cajaAnimacionSorteo" class="sorteo-animacion" style="display:none">
          <div class="ruleta-spinner">🎲</div>
          <h3 style="margin-top:12px;color:#be185d" id="textoAnimacionSorteo">¡Mezclando y sorteando turnos aleatorios...!</h3>
          <p class="hint">Calculando secuencia de salida imparcial y tiempos estimados</p>
        </div>
      </div>

      <!-- CRONÓMETRO DE PITCH INTEGRADO -->
      <div id="cronoPitchWrap" class="card-cronometro no-print" style="display:none">
        <div class="crono-header">
          ⏱️ EXPOSICIÓN EN VIVO · <strong id="cronoTurnoActualLabel">Turno 1: —</strong>
        </div>
        <div class="crono-display-wrap">
          <div>
            <div class="crono-num" id="cronoDisplay">05:00</div>
            <small style="color:#94a3b8" id="cronoSubtitulo">Tiempo restante para exponer</small>
          </div>
          <div class="crono-acciones">
            <button class="btn btn-primary" id="btnCronoPlay">▶ Iniciar</button>
            <button class="btn btn-secondary" id="btnCronoPause" style="display:none">⏸ Pausar</button>
            <button class="btn btn-ghost" id="btnCronoNext">⏭ Siguiente Turno</button>
            <button class="btn btn-ghost" id="btnCronoReset">🔄 Reiniciar Reloj</button>
          </div>
        </div>
      </div>

      <!-- ZONA DE RESULTADOS Y SECUENCIA DE TURNOS (IMPRIMIBLE) -->
      <div class="card" id="contenedorResultadosSorteo">
        <div class="sorteo-stats-bar" id="sorteoStatsBar" style="display:none">
          <span id="sorteoStatsTotal">Total sorteados: 0</span>
          <span id="sorteoStatsTiempoTotal">Duración estimada total: 0 min</span>
        </div>

        <div id="sorteoVacio" class="vacio-box">
          <div style="font-size:42px">🎲</div>
          <h3>Aún no se ha realizado ningún sorteo</h3>
          <p>Selecciona la sección y haz clic en <b>"¡Sortear Orden!"</b> para generar la secuencia aleatoria de exposición o entregas.</p>
        </div>

        <div class="tabla-wrap" id="sorteoTablaWrap" style="display:none">
          <table class="tabla tabla-sorteo" id="tablaResultadosSorteo">
            <thead>
              <tr>
                <th style="width:8%;text-align:center">Turno</th>
                <th style="width:28%">Nombre / Equipo</th>
                <th style="width:14%;text-align:center">Sección</th>
                <th style="width:25%">Detalles / Proyecto</th>
                <th style="width:12%;text-align:center">Hora Estimada</th>
                <th style="width:13%;text-align:center" class="no-print">Estado</th>
              </tr>
            </thead>
            <tbody id="tbodyResultadosSorteo"></tbody>
          </table>
        </div>
      </div>
    </section>
</template>
