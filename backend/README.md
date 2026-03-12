# Backend (Django + DRF)

## Development
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Tests
```bash
ALLOW_SQLITE_FOR_TESTS=true python manage.py test
```

## Migration from Legacy SQLite
```bash
./scripts/backup_sqlite.sh ../data/app.db ../data/backups
python scripts/migrate_sqlite_to_postgres.py
```
