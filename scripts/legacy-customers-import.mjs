import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_INPUT = path.resolve("legacy-data/customers.staging.json");
const DEFAULT_PLAN = path.resolve("legacy-data/customers.import-plan.json");
const EXPECTED_SOURCE_COUNT = 13_792;
const EXPECTED_QUARANTINE_COUNT = 32;
const EXPECTED_ELIGIBLE_COUNT = 13_760;
const MAX_CHUNK_SIZE = 250;

function parseArgs(argv) {
  const options = { input: DEFAULT_INPUT, plan: DEFAULT_PLAN, chunkSize: 200, remote: false, apply: false };
  for (const arg of argv) {
    if (arg === "--remote") options.remote = true;
    else if (arg === "--apply") {
      options.apply = true;
      options.remote = true;
    } else if (arg.startsWith("--input=")) options.input = path.resolve(arg.slice("--input=".length));
    else if (arg.startsWith("--plan=")) options.plan = path.resolve(arg.slice("--plan=".length));
    else if (arg.startsWith("--chunk-size=")) options.chunkSize = Number(arg.slice("--chunk-size=".length));
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(options.chunkSize) || options.chunkSize < 1 || options.chunkSize > MAX_CHUNK_SIZE) {
    throw new Error(`chunk-size must be an integer between 1 and ${MAX_CHUNK_SIZE}`);
  }
  return options;
}

function printHelp() {
  console.log([
    "Usage: npm run legacy:customers:import -- [--remote] [--apply] [--chunk-size=200]",
    "",
    "Default: create a local, PII-free reconciliation plan without database access.",
    "--remote: run every chunk through the authenticated database dry-run RPC.",
    "--apply: run the complete remote dry-run, then apply resumable chunks.",
    "",
    "Remote modes require NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,",
    "and EVORENTALS_IMPORT_JWT in the environment. --apply additionally requires",
    "the EVORENTALS_IMPORT_CONFIRM value printed by the local plan.",
  ].join("\n"));
}

function canonicalRow(row) {
  return {
    legacyId: row.legacyId,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    drivingLicenceNumber: row.drivingLicenceNumber,
    address: row.address,
    status: row.status,
    kycStatus: row.kycStatus,
    hasDocumentMarker: row.hasDocumentMarker,
    createdAt: row.createdAt,
    issues: row.issues,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function uuidFromChecksum(checksum) {
  const bytes = Buffer.from(checksum.slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function chunks(rows, size) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for remote import validation`);
  return value;
}

async function callImportRpc(configuration, body) {
  const response = await fetch(`${configuration.url}/rest/v1/rpc/import_legacy_customer_batch`, {
    method: "POST",
    headers: {
      apikey: configuration.anonKey,
      authorization: `Bearer ${configuration.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message ?? payload?.hint ?? `HTTP ${response.status}`;
    throw new Error(`Import RPC failed: ${message}`);
  }
  return payload;
}

async function validateRemote(configuration, rowChunks, metadata) {
  let validated = 0;
  for (const [index, rows] of rowChunks.entries()) {
    const result = await callImportRpc(configuration, {
      p_rows: rows,
      p_source_checksum: metadata.checksum,
      p_source_row_count: metadata.sourceCount,
      p_eligible_row_count: metadata.eligibleCount,
      p_quarantined_row_count: metadata.quarantinedCount,
      p_batch_id: metadata.batchId,
      p_finalize: false,
      p_dry_run: true,
    });
    if (!result?.ok) throw new Error(`Remote dry-run failed in chunk ${index + 1}: ${JSON.stringify(result?.errors ?? [])}`);
    validated += Number(result.validated ?? 0);
  }
  if (validated !== metadata.eligibleCount) throw new Error(`Remote dry-run validated ${validated}; expected ${metadata.eligibleCount}`);
  return validated;
}

async function applyRemote(configuration, rowChunks, metadata) {
  let importedThisRun = 0;
  let batchImported = 0;
  for (const [index, rows] of rowChunks.entries()) {
    const result = await callImportRpc(configuration, {
      p_rows: rows,
      p_source_checksum: metadata.checksum,
      p_source_row_count: metadata.sourceCount,
      p_eligible_row_count: metadata.eligibleCount,
      p_quarantined_row_count: metadata.quarantinedCount,
      p_batch_id: metadata.batchId,
      p_finalize: index === rowChunks.length - 1,
      p_dry_run: false,
    });
    if (!result?.ok) throw new Error(`Import failed in chunk ${index + 1}: ${JSON.stringify(result?.errors ?? [])}`);
    importedThisRun += Number(result.imported ?? 0);
    batchImported = Number(result.batchImported ?? batchImported);
  }
  if (batchImported !== metadata.eligibleCount) throw new Error(`Import contains ${batchImported}; expected ${metadata.eligibleCount}`);
  return { importedThisRun, batchImported };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const staging = JSON.parse(await readFile(options.input, "utf8"));
  if (staging.schemaVersion !== 1 || !Array.isArray(staging.rows)) throw new Error("Unsupported customer staging format");

  const eligibleRows = staging.rows.filter((row) => Array.isArray(row.issues) && row.issues.length === 0).map(canonicalRow);
  const quarantinedRows = staging.rows.filter((row) => !Array.isArray(row.issues) || row.issues.length > 0);
  if (staging.rows.length !== EXPECTED_SOURCE_COUNT) throw new Error(`Source has ${staging.rows.length} rows; expected ${EXPECTED_SOURCE_COUNT}`);
  if (eligibleRows.length !== EXPECTED_ELIGIBLE_COUNT || quarantinedRows.length !== EXPECTED_QUARANTINE_COUNT) {
    throw new Error(`Reconciliation mismatch: ${eligibleRows.length} eligible and ${quarantinedRows.length} quarantined; expected ${EXPECTED_ELIGIBLE_COUNT} and ${EXPECTED_QUARANTINE_COUNT}`);
  }

  const legacyIds = new Set();
  const emails = new Set();
  const phones = new Set();
  for (const row of eligibleRows) {
    if (!/^\d+$/.test(row.legacyId) || legacyIds.has(row.legacyId)) throw new Error(`Invalid or duplicate eligible legacy ID: ${row.legacyId}`);
    if (!/^\+91\d{10}$/.test(row.phone) || phones.has(row.phone)) throw new Error(`Invalid or duplicate eligible phone at legacy ID ${row.legacyId}`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || emails.has(row.email)) throw new Error(`Invalid or duplicate eligible email at legacy ID ${row.legacyId}`);
    legacyIds.add(row.legacyId);
    emails.add(row.email);
    phones.add(row.phone);
  }

  const checksum = sha256(JSON.stringify(eligibleRows));
  const batchId = uuidFromChecksum(checksum);
  const confirmation = `IMPORT_${eligibleRows.length}_${checksum.slice(0, 12).toUpperCase()}`;
  const metadata = {
    sourceCount: staging.rows.length,
    eligibleCount: eligibleRows.length,
    quarantinedCount: quarantinedRows.length,
    checksum,
    batchId,
  };
  const rowChunks = chunks(eligibleRows, options.chunkSize);
  const plan = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: path.relative(process.cwd(), options.input),
    ...metadata,
    chunks: rowChunks.length,
    chunkSize: options.chunkSize,
    remoteDryRun: false,
    applied: false,
    confirmation,
  };

  if (options.remote) {
    const configuration = {
      url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      accessToken: readEnv("EVORENTALS_IMPORT_JWT"),
    };
    plan.remoteValidatedRows = await validateRemote(configuration, rowChunks, metadata);
    plan.remoteDryRun = true;

    if (options.apply) {
      if (process.env.EVORENTALS_IMPORT_CONFIRM !== confirmation) {
        throw new Error(`Apply confirmation missing. Set EVORENTALS_IMPORT_CONFIRM=${confirmation}`);
      }
      plan.applyResult = await applyRemote(configuration, rowChunks, metadata);
      plan.applied = true;
    }
  }

  await mkdir(path.dirname(options.plan), { recursive: true });
  await writeFile(options.plan, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ plan: path.relative(process.cwd(), options.plan), ...plan }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
