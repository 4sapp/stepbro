# API de Money · Laravel + PostgreSQL

El frontend Vue sigue en la raíz. Esta API guarda un libro financiero independiente por usuario en PostgreSQL (`finance_ledgers.state`, JSONB), con importes enteros en centavos y control de versión. Una escritura confirma todo el libro dentro de una transacción; una versión antigua devuelve HTTP 409 sin sobrescribir los datos.

## Entorno local con Docker o Podman Compose

1. Copia `.env.example` a `.env` en la raíz y define `POSTGRES_PASSWORD` con un valor propio. Conserva `VITE_FINANCE_API=true`.
2. Copia `backend/.env.example` a `backend/.env`. Configura `APP_KEY` (con `php artisan key:generate`), `APP_URL`, `DB_*` y los dominios de Sanctum. Compose sobrescribe la conexión a su contenedor PostgreSQL.
3. Ejecuta `docker compose up -d --build` (o `podman compose up -d --build`).
4. Ejecuta `docker compose exec api php artisan key:generate --force`, seguido de `docker compose exec api php artisan migrate --force`.
5. Inicia Vite desde la raíz con `npm run dev -- --host 127.0.0.1 --port 5174`. Su proxy envía `/api` y `/sanctum` a `127.0.0.1:8000`.
6. En la app abre Opciones → Configuración → Cuenta. Crea una cuenta o inicia sesión. Después crea movimientos con el botón `+`.

Los datos guardados anteriormente en localStorage se conservan, pero no se suben automáticamente a una cuenta. Para volver al modo local, desactiva `VITE_FINANCE_API` y reinicia Vite.

## API

- `GET /sanctum/csrf-cookie`: prepara CSRF antes de iniciar sesión.
- `POST /api/register`: nombre, email, password, password_confirmation.
- `POST /api/login`, `POST /api/logout`, `GET /api/user`: sesión con cookies HttpOnly de Sanctum; sin tokens guardados en localStorage.
- `GET /api/finance`: `{ state, version }` del usuario autenticado.
- `PUT /api/finance`: recibe `{ state, version }`; valida referencias, importes, monedas y transferencias. Devuelve el estado confirmado y su nueva versión.

Los saldos se derivan de los movimientos, sin guardar un saldo mutable duplicado. Un gasto descuenta, un ingreso suma y una transferencia mueve saldo entre las cuentas indicadas. Los importes de monedas distintas no se mezclan.

## Pruebas

`php artisan test` ejecuta los tests de la API. Para probar PostgreSQL real, crea una base separada `stepbro_test` y exporta `DB_CONNECTION=pgsql`, `DB_HOST`, `DB_DATABASE=stepbro_test`, `DB_USERNAME`, `DB_PASSWORD` antes de ejecutar las pruebas. **No uses la base de producción**: los tests reconstruyen sus tablas.

Desde la raíz, `npm test` prueba los cálculos financieros y el adaptador de sesión; `npm run build` compila Vue.

## Despliegue en la nube

Usa PostgreSQL administrado o un servidor propio, configura sus credenciales solo en las variables privadas del backend y ejecuta las migraciones. Sirve Laravel exclusivamente desde `backend/public`; el `.env` nunca debe ser público.

Publica el frontend y la API bajo el mismo dominio (por ejemplo, estáticos de Vue en `/` y Laravel para `/api`, `/sanctum` y `/up` mediante un proxy). Configura `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://tu-dominio`, `SESSION_SECURE_COOKIE=true`, `SANCTUM_STATEFUL_DOMAINS=tu-dominio` y el SSL que exija PostgreSQL. Conserva el mismo `APP_KEY` entre despliegues. Compila Vue con `VITE_FINANCE_API=true`.

El Dockerfile proporciona Apache con DocumentRoot en `public` y dependencias PHP de producción. No publica la base de datos al exterior. La publicación real requiere elegir el proveedor y configurar el dominio y las credenciales del proyecto.
