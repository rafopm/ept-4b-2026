<template>
<header class="topbar no-print">
      <button id="toggleSidebar" class="btn-toggle">☰</button>
      <h1 id="viewTitle">Panel de Control</h1>
      <div class="card-motivacional topbar-motivacional" id="cardMotivacional" style="display:none">
        <div class="motivacional-content">
          <div class="motivacional-icon">💡</div>
          <div>
            <blockquote id="textoFraseMotivadora"></blockquote>
            <cite id="autorFraseMotivadora"></cite>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btnNuevaFrase" title="Ver otra frase">✨ Otra</button>
      </div>
      <div class="topbar-actions">
        <span id="contextoAlumno" class="contexto-alumno" aria-live="polite"></span>
        <button id="btnRefresh" class="btn btn-ghost">🔄 Refrescar</button>
      </div>
    </header>
</template>
