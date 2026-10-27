#!/bin/sh
set -eu

PORT="${PORT:-10000}"
case "$PORT" in
    ''|*[!0-9]*)
        echo "PORT must be an integer between 1 and 65535" >&2
        exit 1
        ;;
esac
if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "PORT must be an integer between 1 and 65535" >&2
    exit 1
fi

if [ -z "${APP_KEY:-}" ] && [ -n "${APP_KEY_BASE64:-}" ]; then
    case "$APP_KEY_BASE64" in
        base64:*) export APP_KEY="$APP_KEY_BASE64" ;;
        *) export APP_KEY="base64:$APP_KEY_BASE64" ;;
    esac
fi
if [ -z "${APP_KEY:-}" ]; then
    echo "Set APP_KEY or APP_KEY_BASE64 in the Render environment" >&2
    exit 1
fi

if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_HOSTNAME:-}" ]; then
    export APP_URL="https://${RENDER_EXTERNAL_HOSTNAME}"
fi
if [ -z "${SANCTUM_STATEFUL_DOMAINS:-}" ] && [ -n "${RENDER_EXTERNAL_HOSTNAME:-}" ]; then
    export SANCTUM_STATEFUL_DOMAINS="$RENDER_EXTERNAL_HOSTNAME"
fi

sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \\*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
php artisan config:cache
php artisan route:cache
php artisan migrate --force

exec apache2-foreground
