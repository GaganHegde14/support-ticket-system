#!/bin/bash
set -e

echo "Waiting for database..."
while ! python -c "
import psycopg2, os, dj_database_url
db = dj_database_url.config(default=os.environ.get('DATABASE_URL', ''))
conn = psycopg2.connect(
    dbname=db['NAME'], user=db['USER'], password=db['PASSWORD'],
    host=db['HOST'], port=db['PORT']
)
conn.close()
" 2>/dev/null; do
  echo "Database not ready, waiting 2s..."
  sleep 2
done
echo "Database is ready!"

echo "Making migrations for tickets app..."
python manage.py makemigrations tickets --noinput

echo "Running all migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
