<template>
  <section class="view" id="view-tecnicas-estudio">
    <div class="card">
      <div class="card-header-flex">
        <div>
          <h2>🧠 Técnicas de estudio</h2>
          <p class="hint">Prueba estrategias breves para organizarte, concentrarte y recordar mejor lo aprendido.</p>
        </div>
        <span class="tecnica-etiqueta">Herramientas personales de estudio</span>
      </div>

      <div class="pomodoro-layout">
        <section class="pomodoro-app" aria-labelledby="pomodoroTitulo">
          <div class="pomodoro-app-header">
            <div>
              <span class="tecnica-kicker">MINIAPLICACIÓN</span>
              <h3 id="pomodoroTitulo">⏱️ Temporizador Pomodoro</h3>
              <p>Enfócate en una tarea y toma descansos breves.</p>
            </div>
            <span class="pomodoro-ciclos"><b id="pomodoroCiclos">0</b> ciclos completados</span>
          </div>

          <div class="pomodoro-modos" role="group" aria-label="Duración de la sesión">
            <button type="button" class="pomodoro-modo active" data-focus-minutes="25" data-break-minutes="5">Clásico <small>25 / 5 min</small></button>
            <button type="button" class="pomodoro-modo" data-focus-minutes="50" data-break-minutes="10">Sesión larga <small>50 / 10 min</small></button>
          </div>

          <div class="pomodoro-clock">
            <span id="pomodoroEstado">Listo para empezar</span>
            <strong id="pomodoroReloj" role="timer" aria-live="off">25:00</strong>
            <small id="pomodoroInstruccion">Elige una tarea concreta para este bloque de concentración.</small>
          </div>

          <div class="pomodoro-acciones">
            <button type="button" class="btn btn-primary" id="btnPomodoroIniciar">▶ Iniciar</button>
            <button type="button" class="btn btn-ghost" id="btnPomodoroReiniciar">↺ Reiniciar</button>
            <button type="button" class="btn btn-ghost" id="btnPomodoroSaltar" hidden>⏭ Saltar descanso</button>
          </div>
          <p class="pomodoro-nota">Al terminar el bloque, el temporizador inicia un descanso. Puedes pausarlo cuando lo necesites.</p>
        </section>

        <aside class="pomodoro-consejos">
          <h3>Cómo aprovecharlo</h3>
          <ol>
            <li>Escribe una meta pequeña y específica.</li>
            <li>Durante el bloque, deja a un lado las distracciones.</li>
            <li>En el descanso, levántate y descansa la vista.</li>
            <li>Al terminar cuatro ciclos, toma un descanso más largo.</li>
          </ol>
          <p>La duración es una guía: ajústala a la actividad y a las indicaciones del docente.</p>
        </aside>
      </div>
    </div>

    <div class="card">
      <div class="card-header-flex">
        <div>
          <h2>📚 Otras técnicas que puedes probar</h2>
          <p class="hint">Estrategias sencillas para estudiar de forma activa, no solo releer.</p>
        </div>
      </div>
      <div class="tecnicas-grid">
        <article class="tecnica-card">
          <span>🧠</span><div><h3>Recuerdo activo</h3><p>Cierra tus apuntes e intenta explicar lo aprendido. Después, revisa qué faltó.</p></div>
        </article>
        <article class="tecnica-card">
          <span>🗓️</span><div><h3>Repaso espaciado</h3><p>Programa repasos cortos en distintos días en vez de estudiar todo a última hora.</p></div>
        </article>
        <article class="tecnica-card">
          <span>🗣️</span><div><h3>Método Feynman</h3><p>Explica una idea con palabras simples, como si se la enseñaras a alguien.</p></div>
        </article>
        <article class="tecnica-card">
          <span>🔀</span><div><h3>Práctica intercalada</h3><p>Alterna tipos de problemas o temas relacionados para aprender a elegir cómo resolverlos.</p></div>
        </article>
      </div>
    </div>
  </section>
</template>
