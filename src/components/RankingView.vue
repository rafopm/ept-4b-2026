<template>
<section class="view" id="view-ranking">
      <div class="card">
        <div class="card-header-flex">
          <div>
            <h2>🏆 Ranking de Equipos de la Sección</h2>
            <p class="hint" id="rankingActualizado">Progreso Colectivo = Entrega Grupal + Promedio Individual + XP Extra</p>
          </div>
          <div class="ranking-filter-badge" id="badgeFiltroSeccion">Todas las Secciones</div>
        </div>
        <div class="tabla-wrap">
          <table class="tabla tabla-ranking" id="tablaRanking">
            <thead>
              <tr>
                <th style="width:6%;text-align:center">#</th>
                <th>Equipo</th>
                <th>Grado</th>
                <th style="text-align:center">Sección</th>
                <th>Proyecto</th>
                <th style="text-align:center">Grupal</th>
                <th style="text-align:center">Prom. Ind.</th>
                <th style="text-align:center">Total Pts</th>
                <th style="text-align:center">%</th>
                <th style="text-align:center">Trello</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>
</template>
