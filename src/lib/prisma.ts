import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// In serverless environments (Vercel) each Lambda instance must be kept to a
// very small number of connections. The default pg.Pool max is 10; with tens
// of concurrent instances that saturates most managed Postgres plans instantly.
// max: 2 lets Promise.all([queryA, queryB]) run concurrently within one
// instance while keeping the per-instance footprint tiny.
const POOL_MAX = 2;

declare global {
  // eslint-disable-next-line no-var
  var __prismaPool:   Pool         | undefined;
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString:    process.env.DATABASE_URL,
    max:                 POOL_MAX,
    idleTimeoutMillis:   10_000,
    connectionTimeoutMillis: 5_000,
  });
}

// Reuse across hot-reloads in dev and across invocations within the same
// Lambda instance in production. globalThis persists for the lifetime of the
// Node.js process — exactly what we need in both environments.
const pool   = globalThis.__prismaPool   ?? (globalThis.__prismaPool   = createPool());
const prisma = globalThis.__prismaClient ?? (globalThis.__prismaClient = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ["error"],
}));

export { prisma };
