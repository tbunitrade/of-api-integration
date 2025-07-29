#!/bin/bash

cd /Users/oleksandrsonich/sites/joefans/backend/of-software || exit 1

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="./dailybackup"
mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/init-db_$(date +%F.dump)"

docker exec local_pgdb bash -c "export PGPASSWORD='$POSTGRES_PASSWORD'; pg_dump -U '$POSTGRES_USER' -F c -d '$DB_NAME'" > "$DUMP_FILE"

echo "Backup created: $DUMP_FILE"