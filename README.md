# Emprende Digital 2026

Aplicacion web para el area de Educacion para el Trabajo (EPT), construida con Vue 3 y Vite.

## Desarrollo

```sh
npm install
npm run dev
```

La aplicación usa el despliegue web de Google Apps Script configurado en `public/config.js` para producción y en `vite.config.js` para desarrollo local. Mantén ambas URL sincronizadas cuando publiques una nueva implementación.

Los rankings de equipos e individual para alumnos se limitan en Apps Script al grado y sección asignados al estudiante autenticado. Al cambiar esta lógica, actualiza y vuelve a implementar `code.gs`; el frontend también aplica el mismo filtro como protección visual adicional.