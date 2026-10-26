<template>
<section class="view" id="view-gamificacion">
      <div class="card">
        <div class="card-header-flex">
          <div>
            <h2>🎁 Motor de Gamificación e Incentivos XP</h2>
            <p class="hint">Otorga puntos extra con registro obligatorio de motivo para mantener la transparencia del ranking.</p>
          </div>
          <button class="btn btn-primary" id="btnAbrirModalOtorgarXP">⚡ Otorgar XP / Puntos Extra</button>
        </div>

        <!-- Tarjetas de Categorías de Gamificación -->
        <div class="grid-gamificacion-info">
          <div class="card-xp-tipo">
            <div class="xp-icon">🛡️</div>
            <h4>Rol Backup Cumplido</h4>
            <p>Alumno que cubrió a un compañero inactivo para que el equipo no pierda puntos.</p>
            <span class="xp-val">+10 a +15 XP</span>
          </div>
          <div class="card-xp-tipo">
            <div class="xp-icon">🤝</div>
            <h4>Compañerismo</h4>
            <p>Apoyo técnico a otros equipos o integración ejemplar en clase.</p>
            <span class="xp-val">+5 a +10 XP</span>
          </div>
          <div class="card-xp-tipo">
            <div class="xp-icon">🚀</div>
            <h4>Calidad MVP</h4>
            <p>Entrega sobresaliente que superó las expectativas del prototipo.</p>
            <span class="xp-val">+10 a +20 XP</span>
          </div>
          <div class="card-xp-tipo">
            <div class="xp-icon">💡</div>
            <h4>Innovación</h4>
            <p>Solución creativa al modelo de negocio o propuesta de valor.</p>
            <span class="xp-val">+5 a +15 XP</span>
          </div>
        </div>

        <!-- Registro de Auditoría de Puntos -->
        <h3 style="margin-top:24px;color:var(--azul-oscuro)">📜 Registro Obligatorio de Auditoría de Puntos Extra</h3>
        <p class="hint">Historial público y transparente de todos los puntos otorgados por el docente.</p>
        
        <div class="tabla-wrap">
          <table class="tabla" id="tablaAuditoriaPuntos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Destinatario</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Puntos (XP)</th>
                <th>Motivo Obligatorio</th>
                <th>Docente</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>
</template>
