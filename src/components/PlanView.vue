<template>
<section class="view" id="view-plan">
      <div class="card">
        <h2>📋 Matriz Curricular Semanal (Plan Data)</h2>
        <p class="hint">Guía automatizada de proyectos para 1°, 2°, 3° y 4° de Secundaria.</p>
        <div id="controlesPlanAlumno" class="plan-alumno-controles" style="display:none">
          <div class="plan-alumno-vistas" role="group" aria-label="Tareas visibles">
            <button type="button" class="btn btn-sm active" id="btnPlanSoloRol" aria-pressed="true">🎯 Solo mis tareas</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btnPlanTodasTareas" aria-pressed="false">🤝 Ver todas para ayudar</button>
          </div>
          <p id="planAlumnoAyuda" class="hint">Se muestran las tareas asignadas a tu rol.</p>
        </div>
        <div id="filtrosPlanCurricular" class="toolbar filtros-plan" style="display:none">
          <div class="form-field">
            <label for="planFiltroGrado">Grado</label>
            <select id="planFiltroGrado" class="select"><option value="">Todos los grados</option></select>
          </div>
          <div class="form-field">
            <label for="planFiltroRol">Rol</label>
            <select id="planFiltroRol" class="select"><option value="">Todos los roles</option></select>
          </div>
        </div>
        <div class="tabla-wrap">
          <table class="tabla" id="tablaPlan">
            <thead>
              <tr>
                <th>Grado</th>
                <th style="text-align:center">Sem</th>
                <th>Tema Semanal</th>
                <th>Rol asignado</th>
                <th>Tarea Detallada</th>
                <th>Entregable Específico</th>
                <th>Rol Backup</th>
                <th>Responsabilidad Backup</th>
                <th id="thPlanRecurso">Guía de aprendizaje</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>
</template>
