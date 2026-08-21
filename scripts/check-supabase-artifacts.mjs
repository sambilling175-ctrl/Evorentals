import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const testsDir = join(root, "supabase", "tests");

const migrationName = /^(\d{12}|\d{14})_[a-z0-9][a-z0-9_]*\.sql$/;
const forbiddenMigrationTokens = /<<<<<<<|>>>>>>>|DROP\s+(DATABASE|SCHEMA)\b|RESET\s+ROLE\b/i;
const forbiddenWriteTokens = /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP)\b/i;
const withoutComments = (sql) => sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
if (files.length === 0) throw new Error("No Supabase migration files found");

const versions = new Set();
for (const name of files) {
  const match = name.match(migrationName);
  if (!match) throw new Error(`Invalid migration filename: ${name}`);
  const version = name.slice(0, name.indexOf("_"));
  if (!versions.add(version)) throw new Error(`Duplicate migration version: ${version}`);
  const sql = await readFile(join(migrationsDir, name), "utf8");
  if (!sql.trim()) throw new Error(`Empty migration: ${name}`);
  if (forbiddenMigrationTokens.test(withoutComments(sql))) throw new Error(`Unsafe token in migration: ${name}`);
}

const testFiles = (await readdir(testsDir)).filter((name) => name.endsWith(".sql")).sort();
if (testFiles.length === 0) throw new Error("No Supabase SQL tests found");

for (const name of testFiles) {
  const sql = await readFile(join(testsDir, name), "utf8");
  if (!sql.trim()) throw new Error(`Empty SQL test: ${name}`);
  const executableSql = withoutComments(sql);
  if (/<<<<<<<|>>>>>>>|\bCOMMIT\s*;/i.test(executableSql)) throw new Error(`Unsafe transaction marker in SQL test: ${name}`);

  if (name === "production_reconciliation.sql") {
    if (forbiddenWriteTokens.test(executableSql)) throw new Error(`Production reconciliation is not read-only: ${name}`);
  } else if (!/\bBEGIN\s*;/i.test(executableSql) || !/\bROLLBACK\s*;/i.test(executableSql)) {
    throw new Error(`SQL test must be rollback-only: ${name}`);
  }
}

console.log(`Supabase artifact check passed: ${files.length} migrations, ${testFiles.length} SQL tests`);
