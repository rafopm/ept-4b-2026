<template>
<header class="topbar no-print">
      <button id="toggleSidebar" class="btn-toggle">☰</button>
      <h1 id="viewTitle">Panel de Control</h1>
      <div class="topbar-actions">
        <div id="filtrosDocente" class="filtros-docente">
          <select id="filtroSeccion" class="select"><option value="">Todas las secciones</option></select>
          <select id="filtroGrado" class="select"><option value="">Todos los grados</option></select>
        </div>
        <span id="contextoAlumno" class="contexto-alumno" aria-live="polite"></span>
        <button id="btnRefresh" class="btn btn-ghost">🔄 Refrescar</button>
      </div>
    </header>
</template>
