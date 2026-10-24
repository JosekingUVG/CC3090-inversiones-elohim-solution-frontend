# CI/CD de frontend

Publicar `.github/workflows/ci.yml` y `cd.yml` en el repositorio de frontend.

## Configuración

En Settings → Secrets and variables → Actions:

- Secret `DOCKERHUB_USERNAME`: usuario de Docker Hub.
- Secret `DOCKERHUB_TOKEN`: token con permiso de escritura en el destino.
- Variable `DOCKERHUB_IMAGE`: nombre completo, por ejemplo `tuusuario/elohim-frontend`.

Crear el repositorio de Docker Hub antes de ejecutar CD.

## Validación y publicación

CI se ejecuta en pushes, pull requests y manualmente. Clona el repositorio de
frontend en el commit bajo prueba (el merge temporal en un PR), con checkout
recursivo de sus propios submódulos si los hubiera. No clona el repositorio raíz
ni los repositorios de backend y docs.

Usa Node.js 22 y pnpm 9, instala dependencias con `pnpm install --frozen-lockfile`,
limpia `.next` y `coverage`, ejecuta ESLint y Jest con `--ci --runInBand`.
No hay un paso independiente de TypeScript ni una solicitud de cobertura en el
comando de Jest. La construcción de Next.js se ejecuta dentro del Dockerfile.

Copia `.env.example` y construye `elohim-frontend:ci` con los argumentos de build
definidos en el YAML, incluyendo las URL de API `http://localhost:5000`.
Levanta únicamente el contenedor de frontend y comprueba su página inicial en
`http://localhost:3000/`. No levanta backend, PostgreSQL, docs o Nginx, ni
configura TLS o comprueba el contador de reinicios. Esta comprobación HTTP
verifica disponibilidad, no los flujos completos que dependen del backend.
Siempre intenta mostrar logs y eliminar el contenedor.

En pushes a `main`, exporta la imagen validada como el artefacto `frontend-image`.
Los valores públicos de Next.js quedan incorporados durante el build; para otro
entorno deben ajustarse antes de construir y validar la imagen.

Solo un push a `main` del mismo repositorio con CI exitoso habilita CD. Este descarga y publica la
misma imagen probada con etiqueta `sha-<commit completo>`, sin reconstruirla.
Los PR y ejecuciones manuales de CI no publican. No se modifica `latest` ni se
despliega a un servidor. Los artefactos duran tres días; pasado ese plazo, volver
a ejecutar el CI del commit para poder publicar. Configurar el check `validate`
como obligatorio en las reglas de protección de `main`.
