# Emprende Digital 2026

Aplicacion web para el area de Educacion para el Trabajo (EPT), construida con Vue 3 y Vite.

## Desarrollo

```sh
npm install
npm run dev
```

El servidor local imprime la URL. Para la publicacion bajo `/ept-4b-2026/`, esa URL suele ser `http://localhost:5173/ept-4b-2026/`.

Para validar la version de produccion:

```sh
npm run build
npm run preview
```

## Estructura

- `index.html`: entrada HTML minima de Vite.
- `src/main.js`: monta Vue y carga los estilos.
- `src/App.vue`: compone el login, la estructura de la aplicacion, las vistas y los modales.
- `src/components/`: componentes independientes para cada vista y las partes compartidas de la interfaz.
- `src/style.css`: estilos de la aplicacion.
- `public/app.js` y `public/config.js`: compatibilidad temporal con la logica existente y su configuracion.

La interfaz se ha dividido en componentes Vue manteniendo los identificadores HTML que utiliza `public/app.js`. Al modificar o extraer funcionalidades de una vista, conserva esos identificadores hasta migrar tambien la logica correspondiente a Vue.

La API usa directamente la implementación web de Google Apps Script configurada en `public/config.js`; el proxy local de Vite apunta a la misma implementación. Si se crea una implementación nueva con otra URL, actualiza ambos destinos.

La aplicación no usa listas locales de recursos ni frases de demostración. Espera la respuesta del backend antes de mostrar el panel y, si no hay datos configurados, presenta las secciones vacías en lugar de ejemplos.

## Enlaces del plan semanal

En `Data`, agrega un enlace por fila en `Link_Guia_Aprendizaje` para el alumno y en `Link_Presentacion` para el docente. El menú **EPT Emprende Digital > Verificar y Crear Hojas Faltantes** agrega esos encabezados al final de la hoja si faltan, sin borrar las columnas existentes. La guía se muestra en el panel semanal y en la matriz del alumno; el enlace de presentación aparece en la matriz del docente.

La columna `Tipo_Calificacion` indica cómo se evalúa cada semana. Usa `Grupal e individual` para semanas con ambas evaluaciones y `Solo individual` cuando no corresponda nota grupal. Repite el valor en todas las filas de esa semana y grado. Al ejecutar **Verificar y Crear Hojas Faltantes**, Apps Script agrega la columna si aún no existe. Las filas que ya existían y la semana 0 conservan el comportamiento actual: semana 0 individual y las demás grupal más individual.

En **Calificación Ágil**, el docente selecciona grado y sección, y puede cargar una evaluación individual de toda la sección o elegir un equipo para calificar según el tipo configurado para la semana. En la rúbrica individual, quien no tenga evidencia digital cargada inicia con 0; el docente puede verificar el trabajo y cambiar la nota. La semana 0 y las semanas `Solo individual` no muestran ni guardan nota grupal. En la ficha de cada alumno también se puede marcar explícitamente que no cumplió la tarea para poner en 0 todos sus criterios individuales.

En **Sorteo y Turnos**, se elige grado y sección antes de sortear. Las opciones permiten elegir un representante de la sección, sortear el orden de todos los alumnos, elegir un representante por equipo o sortear el orden de los equipos.

En los rankings de equipos e individual, el docente puede filtrar los resultados por grado, sección y equipo. Al crear un equipo, escribe el nombre o apellido en el buscador del rol para filtrar los alumnos disponibles.

## Entrega de evidencias

Cada alumno puede registrar una sola evidencia por equipo y semana, ya sea mediante un enlace o un archivo en Drive. Al confirmarse el registro, la entrega queda bloqueada en la aplicacion para evitar cambios mientras el docente la califica. El servidor tambien rechaza nuevos envios para esa misma entrega.

## Frases motivacionales

En Apps Script, ejecuta **EPT Emprende Digital > Verificar y Crear Hojas Faltantes** para crear la hoja `Frases` y cargar frases iniciales si esta vacia. Sus columnas son `frase`, `autor`, `categoria` y `activa`; usa `TRUE` o `FALSE` en `activa` para controlar cuales aparecen en el panel. La aplicacion consulta las frases activas al iniciar y oculta el panel de frases si el servicio no responde.

La carpeta `data/` contiene archivos locales y esta excluida de Git.
