#!/bin/bash

# Переходим в каталог проекта
cd /Users/oleksandrsonich/sites/joefans/backend/of-software || exit 1

# Load variables data from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi


# Path for backup folder
BACKUP_DIR="./dailybackup"

# create folder if not exist
mkdir -p "$BACKUP_DIR"

# Dump name with current date
DUMP_FILE="$BACKUP_DIR/init-db_$(date +%F.dump)"

#
# Запускаем pg_dump из контейнера, сохраняем на локалке
docker exec -e PGPASSWORD=$POSTGRES_PASSWORD local_pgdb pg_dump -U $POSTGRES_USER -F c -d $DB_NAME > "$DUMP_FILE"

echo "Backup created: $DUMP_FILE"