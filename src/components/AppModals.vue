<template>
<!-- Modal Genérico -->
<div class="modal no-print" id="modal">
  <div class="modal-box">
    <h3 id="modalTitle">Título</h3>
    <div id="modalBody"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modalCancel">Cancelar</button>
      <button class="btn btn-primary" id="modalSave">Guardar</button>
    </div>
  </div>
</div>

<!-- Modal para Otorgar Puntos Extra / XP -->
<div class="modal no-print" id="modalOtorgarXP">
  <div class="modal-box">
    <h3>⚡ Otorgar Puntos Extra (Gamificación)</h3>
    <p class="hint">El registro del motivo es obligatorio para garantizar la transparencia del ranking.</p>

    <div class="form-group">
      <label>Destinatario:</label>
      <select id="xpTipoDestinatario" class="select">
        <option value="alumno">Estudiante individual</option>
        <option value="equipo">Equipo completo</option>
      </select>
    </div>

    <div class="form-group" id="xpGrupoAlumno">
      <label>Estudiante:</label>
      <select id="xpSelectAlumno" class="select"></select>
    </div>

    <div class="form-group" id="xpGrupoEquipo" style="display:none">
      <label>Equipo:</label>
      <select id="xpSelectEquipo" class="select"></select>
    </div>

    <div class="form-group">
      <label>Categoría del Reconocimiento:</label>
      <select id="xpCategoria" class="select">
        <option value="backup">🛡️ Rol Backup Cumplido (Rescate de compañero)</option>
        <option value="companerismo">🤝 Compañerismo y Apoyo</option>
        <option value="desempeno">🚀 Calidad MVP / Desempeño Sobresaliente</option>
        <option value="innovacion">💡 Creatividad e Innovación</option>
        <option value="otro">🎯 Otro reconocimiento</option>
      </select>
    </div>

    <div class="form-group">
      <label>Cantidad de Puntos (XP):</label>
      <div class="xp-btn-chips">
        <button type="button" class="btn-chip" data-val="5">+5 XP</button>
        <button type="button" class="btn-chip active" data-val="10">+10 XP</button>
        <button type="button" class="btn-chip" data-val="15">+15 XP</button>
        <button type="button" class="btn-chip" data-val="20">+20 XP</button>
      </div>
      <input type="number" id="xpCantidadPuntos" value="10" min="1" max="50" class="input-full" style="margin-top:6px">
    </div>

    <div class="form-group">
      <label>Motivo Obligatorio (Auditoría):</label>
      <textarea id="xpMotivoTexto" rows="2" placeholder="Ej: Cumplió rol backup diseñando el logo tras ausencia de CMO" class="input-full" required></textarea>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancelarXP">Cancelar</button>
      <button class="btn btn-primary" id="btnConfirmarXP">🎁 Otorgar XP</button>
    </div>
  </div>
</div>

<!-- Modal Asignar Miembros a Equipo -->
<div class="modal no-print" id="modalAsignarEquipo">
  <div class="modal-box modal-box-lg">
    <h3 id="modalAsignarTitulo">Configurar Equipo y Asignar Roles</h3>
    <div id="modalAsignarBody">
      <!-- Formulario interactivo de equipo y los 4 roles -->
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancelarAsignarEq">Cancelar</button>
      <button class="btn btn-primary" id="btnGuardarAsignarEq">💾 Guardar Equipo y Roles</button>
    </div>
  </div>
</div>

<div class="toast no-print" id="toast"></div>
</template>
