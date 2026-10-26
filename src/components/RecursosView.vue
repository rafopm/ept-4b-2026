<template>
<section class="view" id="view-recursos">
      <div class="card">
        <div class="card-header-flex">
          <div>
            <h2>📚 Centro de Recursos, Rúbricas y Herramientas</h2>
            <p class="hint">Acceso centralizado a lineamientos pedagógicos oficiales, rúbricas de evaluación y plataformas digitales recomendadas.</p>
          </div>
          <div class="toolbar no-print">
            <input type="search" id="busquedaRecursosInput" placeholder="🔍 Buscar recurso o herramienta..." class="input-search">
            <button class="btn btn-ghost" id="btnRecargarRecursos">🔄 Refrescar</button>
          </div>
        </div>

        <!-- 1. PARTE SUPERIOR DESTACADA: RÚBRICAS Y LINEAMIENTOS -->
        <div class="recursos-seccion-titulo" style="margin-top:14px">
          <h3><span>📌</span> Documentos Oficiales, Lineamientos y Rúbricas</h3>
          <span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:700">Oficial EPT 2026</span>
        </div>
        <p class="hint" style="margin-top:-6px;margin-bottom:14px">
          Materiales oficiales de orientación y evaluación compartidos por el docente en Google Drive para el Bimestre.
        </p>

        <div id="contenedorRecursosDestacados" class="recursos-destacados-grid">
          <!-- Tarjetas destacadas de rúbricas y lineamientos -->
        </div>

        <!-- 2. PARTE INFERIOR: FICHAS SIMPLES DE PLATAFORMAS WEB -->
        <div class="recursos-seccion-titulo" style="margin-top:20px">
          <h3><span>🛠️</span> Plataformas y Herramientas Web Recomendadas</h3>
          <span class="badge" style="background:#f1f5f9;color:#475569" id="contadorRecursosSimples">Herramientas</span>
        </div>
        <p class="hint" style="margin-top:-6px;margin-bottom:14px">
          Enlaces directos a las plataformas digitales de diseño, prototipado, hosting, productividad e inteligencia artificial.
        </p>

        <!-- Filtros de categoría -->
        <div class="recursos-filtros-bar no-print" id="filtrosCategoriasRecursos">
          <!-- Chips de categorías generados dinámicamente -->
        </div>

        <!-- Grid de fichas simples -->
        <div id="contenedorRecursosSimples" class="grid-recursos-simples">
          <!-- Fichas simples generadas dinámicamente -->
        </div>
      </div>
    </section>
</template>
