-- Script de inicialização do banco de dados
-- Este script é executado automaticamente quando o PostgreSQL é iniciado pela primeira vez

-- Remove o schema public padrão se existir
CREATE SCHEMA IF NOT EXISTS "administration";

-- Define o search_path padrão para incluir todos os schemas
ALTER DATABASE "api" SET search_path TO public, "administration";

-- Garante que o usuário tem permissões em todos os schemas
GRANT ALL ON SCHEMA public TO "api";
GRANT ALL ON SCHEMA "administration" TO "api";

-- Garante permissões futuras para tabelas que serão criadas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "api";
ALTER DEFAULT PRIVILEGES IN SCHEMA "administration" GRANT ALL ON TABLES TO "api";

-- Garante permissões futuras para sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "api";
ALTER DEFAULT PRIVILEGES IN SCHEMA "administration" GRANT ALL ON SEQUENCES TO "api";
