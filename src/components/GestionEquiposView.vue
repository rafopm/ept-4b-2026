<template>
<section class="view" id="view-gestion-equipos">
      <div class="card">
        <div class="card-header-flex">
          <div>
            <h2>👥 Gestión Visual de Grupos y Roles</h2>
            <p class="hint">Crea equipos y asigna los 4 roles estratégicos (CEO, CTO, CMO, CFO) a cada estudiante.</p>
          </div>
          <div class="toolbar">
            <button class="btn btn-primary" id="btnCrearEquipoModal">➕ Nuevo Equipo</button>
            <button class="btn btn-secondary" id="btnNuevoAlumnoModal">➕ Nuevo Alumno</button>
            <button class="btn btn-ghost" id="btnRecargarGestionCompleta">🔄 Recargar</button>
          </div>
        </div>

        <div class="toolbar filtros-gestion" style="margin-top:10px">
          <div class="form-field">
            <label for="filtroGestionGrado"><b>Filtrar por grado:</b></label>
            <select id="filtroGestionGrado" class="select"><option value="">Todos los grados</option></select>
          </div>
          <div class="form-field">
            <label for="filtroGestionSeccion"><b>Filtrar por sección:</b></label>
            <select id="filtroGestionSeccion" class="select" disabled><option value="">Primero elija grado</option></select>
          </div>
        </div>

        <section class="solicitudes-equipo-panel" aria-labelledby="solicitudesEquipoTitulo">
          <div class="card-header-flex">
            <div>
              <h3 id="solicitudesEquipoTitulo">📝 Solicitudes de cambio de equipo</h3>
              <p class="hint">Revisa quién propone cada cambio. El nombre y el enlace solo se actualizan cuando los apruebas.</p>
            </div>
            <div class="toolbar">
              <span id="solicitudesEquipoContador" class="badge-solicitudes">Cargando...</span>
              <button type="button" class="btn btn-ghost btn-sm" id="btnRecargarSolicitudesEquipo">🔄 Actualizar solicitudes</button>
            </div>
          </div>
          <div id="solicitudesEquipoLista" aria-live="polite">
            <p class="hint">Cargando solicitudes...</p>
          </div>
        </section>

        <!-- Grid de Tarjetas de Equipos con Slots de Roles -->
        <div id="contenedorEquiposVisual" class="equipos-visual-grid">
          <!-- Tarjetas generadas dinámicamente -->
        </div>

        <!-- TABLA COMPLETA DE ALUMNOS REGISTRADOS -->
        <div class="alumnos-listado-wrap" style="margin-top:30px">
          <div class="card-header-flex">
            <h3>📋 Registro General de Alumnos y Asignación de Roles</h3>
            <div class="toolbar">
              <input type="search" id="busquedaAlumnoInput" placeholder="🔍 Buscar por nombre, correo o DNI..." class="input-search">
            </div>
          </div>

          <div class="tabla-wrap">
            <table class="tabla" id="tablaAlumnosGestion">
              <thead>
                <tr>
                  <th>Nombres y Apellidos</th>
                  <th>DNI</th>
                  <th>Correo Google</th>
                  <th>Grado</th>
                  <th>Sección</th>
                  <th>Equipo Asignado</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
</template>
