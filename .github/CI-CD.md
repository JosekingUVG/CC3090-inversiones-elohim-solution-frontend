# CI/CD de frontend

Publicar `.github/workflows/ci.yml` y `cd.yml` en el repositorio de frontend.

## Configuración

En Settings → Secrets and variables → Actions:

- Secret `DOCKERHUB_USERNAME`: usuario de Docker Hub.
- Secret `DOCKERHUB_TOKEN`: token con permiso de escritura en el destino.
- Variable `DOCKERHUB_IMAGE`: nombre completo, por ejemplo `tuusuario/elohim-frontend`.

Crear el repositorio de Docker Hub antes de ejecutar CD.

## Validación y publicación

Instala dependencias con lockfile congelado, ejecuta ESLint, TypeScript y Jest
con cobertura. La construcción de Next.js se ejecuta dentro del Dockerfile.

CI clona recursivamente `main` del repositorio principal y reemplaza únicamente
frontend por el commit bajo prueba (el merge temporal en pull requests).
Los otros submódulos conservan los commits registrados por el principal.
Se necesita acceso de lectura a esos repositorios; un repositorio privado
requiere configurar credenciales adicionales de checkout.

Levanta PostgreSQL, backend, frontend, docs y Nginx. Usa datos de ejemplo y un
certificado TLS temporal. Comprueba disponibilidad HTTP y ausencia de reinicios.
Docs se ejecuta desde su imagen sin el montaje del código fuente del host.
Las comprobaciones HTTP no sustituyen pruebas funcionales completas del negocio.

Solo un push a `main` con CI exitoso habilita CD. Este descarga y publica la
misma imagen probada con etiqueta `sha-<commit completo>`, sin reconstruirla.
Los PR y ejecuciones manuales de CI no publican. No se modifica `latest` ni se
despliega a un servidor. Los artefactos duran tres días; pasado ese plazo, volver
a ejecutar el CI del commit para poder publicar. Configurar el check `validate`
como obligatorio en las reglas de protección de `main`.
