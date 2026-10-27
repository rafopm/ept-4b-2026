<template>
<section class="view" id="view-sorteo">
      <div class="card no-print">
        <div class="card-header-flex">
          <div>
            <h2>🎲 Sorteo y Turnos de Exposición / Entregas</h2>
            <p class="hint">Selecciona grado y sección para elegir un representante, ordenar aleatoriamente a los alumnos o elegir un representante por equipo.</p>
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
              <option value="representante_seccion">🎤 Un representante de la sección</option>
              <option value="alumnos">👤 Alumnos en orden aleatorio</option>
              <option value="representantes_equipos">👥 Un representante por equipo</option>
              <option value="grupos">🏷️ Orden aleatorio de equipos</option>
            </select>
          </div>
          <div class="form-field">
            <label><b>2. Grado:</b></label>
            <select id="sorteoGrado" class="select"><option value="">-- Seleccionar Grado --</option></select>
          </div>
          <div class="form-field">
            <label><b>3. Sección:</b></label>
            <select id="sorteoSeccion" class="select" disabled><option value="">-- Primero elija Grado --</option></select>
          </div>
          <div class="form-field">
            <label><b>4. Tiempo por Turno:</b></label>
            <select id="sorteoTiempo" class="select">
              <option value="3">3 minutos (Elevator Pitch)</option>
              <option value="5" selected>5 minutos (Pitch Estándar)</option>
              <option value="7">7 minutos (Pitch + Preguntas)</option>
              <option value="10">10 minutos (Demo Day Completo)</option>
            </select>
          </div>
          <div class="form-field form-field-btn">
            <button class="btn btn-primary btn-lg" id="btnLanzarSorteo" disabled>🎲 ¡Sortear!</button>
          </div>
        </div>

        <div id="sorteoLoader" class="data-loader" style="display:none" role="status" aria-live="polite">
          <span class="data-loader-spinner" aria-hidden="true"></span>
          <span id="sorteoLoaderTexto">Cargando alumnos y equipos…</span>
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
          <p>Selecciona el grado y la sección, luego el tipo de sorteo que necesitas.</p>
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
