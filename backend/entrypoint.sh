#!/bin/bash
set -e

# Wait for PostgreSQL to accept connections
echo "Waiting for database..."
until python -c "
import psycopg2, os, dj_database_url
db = dj_database_url.config(default=os.environ.get('DATABASE_URL', ''))
conn = psycopg2.connect(
    dbname=db['NAME'], user=db['USER'], password=db['PASSWORD'],
    host=db['HOST'], port=db['PORT']
)
conn.close()
print('Database connection successful')
" 2>/dev/null; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done

echo "Generating migrations for tickets app..."
python manage.py makemigrations tickets --noinput

echo "Applying all migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "Starting server..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
