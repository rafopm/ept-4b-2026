<template>
<aside class="sidebar" id="sidebar">
    <div class="logo">
      <span class="logo-icon">🚀</span>
      <div>
        <strong id="sidebarNombre">Emprende Digital</strong>
        <small id="sidebarRol">—</small>
      </div>
    </div>

    <nav class="menu">
      <!-- VISTAS COMUNES / ALUMNO -->
      <button class="menu-item active" data-view="dashboard"><span>📈</span> Panel de Control</button>
      
      <button class="menu-item rol-alumno" data-view="mi-equipo"><span>👥</span> Mi Equipo</button>
      <button class="menu-item rol-alumno" data-view="mis-notas"><span>📝</span> Mis Calificaciones</button>

      <!-- VISTAS DOCENTE -->
      <button class="menu-item rol-docente" data-view="calificacion-agil"><span>⚡</span> Calificación Ágil</button>
      <button class="menu-item rol-docente" data-view="gestion-equipos"><span>👥</span> Grupos y Roles</button>
      <button class="menu-item rol-docente" data-view="gamificacion"><span>🎁</span> Motor de Gamificación</button>
      <button class="menu-item rol-docente" data-view="reportes"><span>📄</span> Reportes e Impresión</button>
      <button class="menu-item rol-docente" data-view="sorteo"><span>🎲</span> Sorteo y Turnos</button>

      <!-- RANKINGS Y PLAN -->
      <button class="menu-item" data-view="ranking"><span>🏆</span> Ranking de Equipos</button>
      <button class="menu-item" data-view="ranking-individual"><span>🥇</span> Ranking Individual XP</button>
      <button class="menu-item" data-view="plan"><span>📋</span> Matriz Curricular</button>
      <button class="menu-item" data-view="recursos"><span>📚</span> Recursos</button>
      <button class="menu-item" data-view="acerca"><span>ℹ️</span> Acerca de</button>
    </nav>

    <div class="sidebar-footer">
      <button class="btn-cerrar-sesion" id="btnLogout">🚪 Cerrar sesión</button>
      <small>⚖️ Ley 32172 · Uso de computadoras IE</small>
    </div>
  </aside>
</template>
