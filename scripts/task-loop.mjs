import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const queuePath = path.resolve("docs/NEXT_STEPS.md");

function splitRow(line) {
  return line.slice(1, -1).split("|").map((value) => value.trim());
}

function parseQueue(markdown) {
  return markdown.split(/\r?\n/).flatMap((line) => {
    if (!/^\|\s*[A-Z0-9]+(?:-[A-Z0-9]+)+\s*\|/.test(line)) return [];
    const cells = splitRow(line);
    if (cells.length < 7 || cells[0] === "ID") return [];
    const [id, priority, task, status, owner, dependencies, area] = cells;
    return [{ id, priority, task, status, owner, dependencies, area, line }];
  });
}

function dependencyIds(value) {
  return [...value.matchAll(/\b(?:D|AUTH)[A-Z0-9-]+\b/g)].map(([id]) => id);
}

function unresolvedExternalDependencies(value) {
  const ids = dependencyIds(value);
  const remainder = value
    .replace(/\b(?:D|AUTH)[A-Z0-9-]+\b/g, "")
    .replace(/[;,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return remainder ? [remainder] : ids.length ? [] : [value.trim()];
}

function priorityRank(priority) {
  return Number(priority?.replace(/^P/, "")) || 99;
}

function getPlan(tasks) {
  const statusById = new Map(tasks.map((task) => [task.id, task.status]));
  const ready = [];
  const blocked = [];
  for (const task of tasks) {
    if (task.status !== "Ready") continue;
    const ids = dependencyIds(task.dependencies);
    const missing = ids.filter((id) => statusById.get(id) !== "Completed");
    const external = unresolvedExternalDependencies(task.dependencies);
    if (missing.length || external.length) blocked.push({ ...task, missingDependencies: missing, externalDependencies: external });
    else ready.push(task);
  }
  ready.sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority) || left.id.localeCompare(right.id));
  return { next: ready[0] ?? null, ready, blocked };
}

function parseArgs(argv) {
  const options = { json: false, claim: null, owner: "Unassigned", branch: "" };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg.startsWith("--claim=")) options.claim = arg.slice("--claim=".length);
    else if (arg.startsWith("--owner=")) options.owner = arg.slice("--owner=".length);
    else if (arg.startsWith("--branch=")) options.branch = arg.slice("--branch=".length);
    else if (arg === "--help") options.help = true;
  }
  return options;
}

function printHelp() {
  console.log("Usage: npm run task:next [--json]");
  console.log("       npm run task:claim -- --claim=D11-03 --owner=Codex --branch=agent/d11-03-import");
}

async function claimTask(markdown, tasks, options) {
  const task = tasks.find((candidate) => candidate.id === options.claim);
  if (!task) throw new Error(`Task ${options.claim} was not found in docs/NEXT_STEPS.md`);
  const plan = getPlan(tasks);
  const candidate = plan.ready.find((readyTask) => readyTask.id === task.id);
  if (!candidate) throw new Error(`Task ${task.id} is not claimable: status=${task.status}; resolve dependencies or blockers first`);
  if (!options.branch) throw new Error("--branch is required when claiming a task");
  const oldCells = splitRow(task.line);
  oldCells[3] = "In progress";
  oldCells[4] = `${options.owner} / \`${options.branch}\`; claimed by task-loop`;
  const replacement = `| ${oldCells.join(" | ")} |`;
  const nextMarkdown = markdown.replace(task.line, replacement);
  await writeFile(queuePath, nextMarkdown, "utf8");
  return { id: task.id, owner: options.owner, branch: options.branch, status: "In progress" };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const markdown = await readFile(queuePath, "utf8");
  const tasks = parseQueue(markdown);
  if (options.claim) {
    const claimed = await claimTask(markdown, tasks, options);
    console.log(JSON.stringify({ claimed }, null, 2));
    return;
  }
  const plan = getPlan(tasks);
  const result = {
    next: plan.next ? { id: plan.next.id, priority: plan.next.priority, task: plan.next.task, dependencies: plan.next.dependencies } : null,
    ready: plan.ready.map(({ id, priority, task, dependencies }) => ({ id, priority, task, dependencies })),
    blockedReady: plan.blocked.map(({ id, priority, task, missingDependencies, externalDependencies }) => ({ id, priority, task, missingDependencies, externalDependencies })),
    blocked: tasks.filter((task) => task.status === "Blocked").map(({ id, priority, task, owner, dependencies }) => ({ id, priority, task, owner, dependencies })),
    review: tasks.filter((task) => task.status === "Review").map(({ id, task, owner }) => ({ id, task, owner })),
  };
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (result.next) console.log(`Next task: ${result.next.id} (${result.next.priority}) - ${result.next.task}`);
  else console.log("No task is currently claimable. Review blockedReady and review items in the JSON plan.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
