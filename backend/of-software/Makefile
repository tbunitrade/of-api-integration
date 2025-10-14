# =========[ ENV ]=========
ENV_FILE = .env
PG_USER = postgres
PG_PASSWORD = supersecretpassword
PG_DB = of_software
DUMP_FILE = init-db.dump
CONTAINER_NAME = local_pgdb

# =========[ COMMANDS ]=========

up:
	docker-compose up --build -d

down:
	docker-compose down -v

logs:
	docker-compose logs -f

restart: down up

ps:
	docker ps --filter "name=$(CONTAINER_NAME)"

shell:
	docker exec -it $(CONTAINER_NAME) bash

psql:
	docker exec -e PGPASSWORD=$(PG_PASSWORD) -it $(CONTAINER_NAME) psql -U $(PG_USER) -d $(PG_DB)

restore-db:
	@echo "📦 Копируем дамп в контейнер..."
	docker cp $(DUMP_FILE) $(CONTAINER_NAME):/$(DUMP_FILE)
	@echo "🛠️  Удаляем и создаем базу..."
	docker exec -e PGPASSWORD=$(PG_PASSWORD) $(CONTAINER_NAME) \
		psql -U $(PG_USER) -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $(PG_DB);"
	docker exec -e PGPASSWORD=$(PG_PASSWORD) $(CONTAINER_NAME) \
		psql -U $(PG_USER) -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $(PG_DB);"
	@echo "♻️  Восстанавливаем базу..."
	docker exec -e PGPASSWORD=$(PG_PASSWORD) $(CONTAINER_NAME) \
		pg_restore -U $(PG_USER) -d $(PG_DB) /$(DUMP_FILE)
	@echo "✅ Готово! База восстановлена."

backend-logs:
	docker exec -it nest_backend tail -f /app/startup.log

db:
	docker-compose up -d db pgadmin