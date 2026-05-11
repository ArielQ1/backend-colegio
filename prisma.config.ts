// Prisma Config - Soporte para Supabase con pooling
// En Prisma 7+ se usa esta configuración centralizada

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

// ============================================
// NOTAS SOBRE LA CONFIGURACIÓN:
// ============================================
//
// IMPORTANTE: Para db push/migraciones, usar:
//   DATABASE_URL="...puerto 5432..." pnpm db:push
//
// El puerto 6543 (con pgbouncer=true) es para la app en producción
// El puerto 5432 es para migraciones/db push
// ============================================