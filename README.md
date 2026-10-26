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

## Frases motivacionales

En Apps Script, ejecuta **EPT Emprende Digital > Verificar y Crear Hojas Faltantes** para crear la hoja `Frases` y cargar frases iniciales si esta vacia. Sus columnas son `frase`, `autor`, `categoria` y `activa`; usa `TRUE` o `FALSE` en `activa` para controlar cuales aparecen en el panel. La aplicacion consulta las frases activas al iniciar y usa su lista local si el servicio no responde.

La carpeta `data/` contiene archivos locales y esta excluida de Git.
