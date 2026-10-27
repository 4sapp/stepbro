# Probar Money en Render

El archivo `render.yaml` crea un servicio web Docker y una base PostgreSQL, ambos con `plan: free`. El contenedor compila Vue y sirve frontend y API Laravel bajo el mismo dominio. No requiere Netlify para esta prueba.

## Publicar

1. Inicia sesión en Render y abre **New → Blueprint**.
2. Elige este repositorio y la rama que contiene `render.yaml`.
3. Revisa que tanto el servicio `soulhem-money` como la base `soulhem-money-db` indiquen **Free**.
4. Despliega el Blueprint. El script de inicio ejecuta las migraciones y escucha en el puerto que proporciona Render.
5. Abre la URL `onrender.com` del servicio. Ve a Opciones → Configuración → Cuenta y crea tu cuenta.

`APP_KEY_BASE64` se genera una sola vez en Render; `DB_URL` se obtiene de la conexión interna de PostgreSQL. No copies `.env` locales ni credenciales en el repositorio.

## Límites de esta prueba

La base gratuita de Render caduca a los **30 días**. Es un entorno de prueba; exporta los datos antes de su caducidad o decide un alojamiento permanente. El servicio web gratuito puede dormirse cuando no se utiliza y tardar al volver a abrir.

## Subdominio opcional

Cuando el despliegue funcione, se puede conectar `money.soulhem.online` desde los dominios personalizados de Render y crear el registro DNS que Render indique. Después configura:

- `APP_URL=https://money.soulhem.online`
- `SANCTUM_STATEFUL_DOMAINS=money.soulhem.online`

El Blueprint no modifica DNS y no cambia el sitio del dominio principal.

Documentación oficial: https://render.com/docs/deploy-php-laravel-docker · https://render.com/docs/free
