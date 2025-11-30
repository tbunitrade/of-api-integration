#!/usr/bin/env bash
set -e

# Находим корень проекта относительно скрипта:
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
UPLOADS_DIR="$PROJECT_ROOT/uploads"

echo "Fixing ownership and permissions in: $UPLOADS_DIR"

# Если юзер www-data есть — меняем владельца (на маке просто пропустится)
if id "www-data" >/dev/null 2>&1; then
  chown -R www-data:www-data "$UPLOADS_DIR"
fi

find "$UPLOADS_DIR" -type d -exec chmod 755 {} \;
find "$UPLOADS_DIR" -type f -exec chmod 644 {} \;

echo "Done."

######
# how to use
######

#chmod +x backend/of-software/scripts/fix_uploads_perms.sh
#sudo backend/of-software/scripts/fix_uploads_perms.sh