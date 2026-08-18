import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_INPUT = path.resolve("legacy-data/customers.csv");
const DEFAULT_OUTPUT = path.resolve("legacy-data/customers.staging.json");
const DEFAULT_REVIEW_OUTPUT = path.resolve("legacy-data/customers.identity-review.json");
const DEFAULT_EXPECTED_COUNT = 13_792;

function parseArgs(argv) {
  const options = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, reviewOutput: DEFAULT_REVIEW_OUTPUT, expectedCount: DEFAULT_EXPECTED_COUNT };
  for (const arg of argv) {
    if (arg === "--allow-partial") options.allowPartial = true;
    else if (arg.startsWith("--input=")) options.input = path.resolve(arg.slice("--input=".length));
    else if (arg.startsWith("--output=")) options.output = path.resolve(arg.slice("--output=".length));
    else if (arg.startsWith("--review-output=")) options.reviewOutput = path.resolve(arg.slice("--review-output=".length));
    else if (arg.startsWith("--expected-count=")) options.expectedCount = Number(arg.slice("--expected-count=".length));
    else if (arg === "--help") options.help = true;
  }
  return options;
}

function printHelp() {
  console.log("Usage: npm run legacy:customers:stage -- [--input=legacy-data/customers.csv] [--output=legacy-data/customers.staging.json] [--review-output=legacy-data/customers.identity-review.json] [--expected-count=13792] [--allow-partial]");
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"' && value.length === 0) quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.endsWith("\r") ? value.slice(0, -1) : value);
      if (row.some((cell) => cell.trim() !== "")) records.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (value.length > 0 || row.length > 0) {
    row.push(value.endsWith("\r") ? value.slice(0, -1) : value);
    if (row.some((cell) => cell.trim() !== "")) records.push(row);
  }
  if (records.length < 2) throw new Error("CSV must contain a header and at least one data row");
  const headers = records[0].map((header) => header.trim().replace(/^\uFEFF/, ""));
  return records.slice(1).map((cells, rowIndex) => {
    const record = { _row: rowIndex + 2 };
    for (const [index, header] of headers.entries()) record[header] = (cells[index] ?? "").trim();
    return record;
  });
}

function normalizeEmail(value) {
  const email = value.trim().toLowerCase();
  return email || null;
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return value.trim().startsWith("+") ? `+${digits}` : digits;
}

function normalizeKycStatus(value) {
  const status = value.trim().toLowerCase();
  return { accepted: "verified", pending: "pending", rejected: "rejected", expired: "expired" }[status] ?? "pending";
}

function normalizeAccountStatus(value) {
  return value.trim().toLowerCase() === "inactive" ? "inactive" : "active";
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidIndianPhone(value) {
  return typeof value === "string" && /^\+91\d{10}$/.test(value);
}

function duplicateValues(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    const group = groups.get(value) ?? [];
    group.push(row.legacyId);
    groups.set(value, group);
  }
  return new Map([...groups.entries()].filter(([, ids]) => ids.length > 1));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!Number.isInteger(options.expectedCount) || options.expectedCount < 1) throw new Error("expected-count must be a positive integer");
  const csv = await readFile(options.input, "utf8");
  const sourceRows = parseCsv(csv);
  const rows = sourceRows.map((source) => {
    const legacyId = source["Customer ID"]?.trim() ?? "";
    const email = normalizeEmail(source.Email ?? "");
    const phone = normalizePhone(source.Mobile ?? "");
    return {
      sourceRow: source._row,
      legacyId,
      fullName: source["Customer Name"]?.trim() ?? "",
      email,
      phone,
      drivingLicenceNumber: source["Driving Licence Number"]?.trim() || null,
      address: source.Address?.trim() || null,
      status: normalizeAccountStatus(source.Status ?? ""),
      kycStatus: normalizeKycStatus(source["KYC Status"] ?? ""),
      hasDocumentMarker: Boolean(source.Documents?.trim()),
      createdAt: source["Created At"]?.trim() || null,
      issues: [],
    };
  });

  const emailDuplicates = duplicateValues(rows, "email");
  const phoneDuplicates = duplicateValues(rows, "phone");
  const duplicateIds = new Set([...emailDuplicates.values(), ...phoneDuplicates.values()].flat());
  for (const row of rows) {
    if (!row.legacyId) row.issues.push("missing_legacy_id");
    if (!row.fullName) row.issues.push("missing_full_name");
    if (!row.email) row.issues.push("missing_email");
    else if (!isValidEmail(row.email)) row.issues.push("invalid_email");
    if (!row.phone) row.issues.push("missing_phone");
    else if (!isValidIndianPhone(row.phone)) row.issues.push("invalid_phone");
    if (duplicateIds.has(row.legacyId)) row.issues.push("duplicate_identity");
    if (!row.createdAt || Number.isNaN(Date.parse(row.createdAt))) row.issues.push("invalid_created_at");
  }

  const missingName = rows.filter((row) => row.issues.includes("missing_full_name")).length;
  const duplicateIdentityRows = rows.filter((row) => row.issues.includes("duplicate_identity")).length;
  const invalidPhoneRows = rows.filter((row) => row.issues.includes("invalid_phone")).length;
  const invalidRows = rows.filter((row) => row.issues.length > 0).length;
  const countMatches = rows.length === options.expectedCount;
  const safeToImport = countMatches && invalidRows === 0 && (options.allowPartial || rows.length >= options.expectedCount);
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: { file: path.relative(process.cwd(), options.input), expectedCount: options.expectedCount, allowPartial: Boolean(options.allowPartial) },
    safeToImport,
    summary: {
      rows: rows.length,
      countMatches,
      invalidRows,
      missingName,
      duplicateIdentityRows,
      invalidPhoneRows,
      duplicateEmails: emailDuplicates.size,
      duplicateMobiles: phoneDuplicates.size,
      withDocumentMarkers: rows.filter((row) => row.hasDocumentMarker).length,
      statuses: Object.fromEntries(["active", "inactive"].map((status) => [status, rows.filter((row) => row.status === status).length])),
      kycStatuses: Object.fromEntries(["pending", "verified", "rejected", "expired"].map((status) => [status, rows.filter((row) => row.kycStatus === status).length])),
    },
    rows,
  };
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const review = {
    schemaVersion: 1,
    generatedAt: result.generatedAt,
    source: result.source,
    safeToImport,
    summary: result.summary,
    duplicateGroups: {
      email: [...emailDuplicates.values()].map((ids) => ({ legacyIds: ids })),
      mobile: [...phoneDuplicates.values()].map((ids) => ({ legacyIds: ids })),
    },
    conflicts: rows.filter((row) => row.issues.length > 0).map((row) => ({
      sourceRow: row.sourceRow,
      legacyId: row.legacyId || null,
      issues: row.issues,
    })),
  };
  await mkdir(path.dirname(options.reviewOutput), { recursive: true });
  await writeFile(options.reviewOutput, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: path.relative(process.cwd(), options.output), reviewOutput: path.relative(process.cwd(), options.reviewOutput), safeToImport, summary: result.summary }, null, 2));
  if (!safeToImport) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
