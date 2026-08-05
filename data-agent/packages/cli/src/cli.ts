#!/usr/bin/env node
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { openDataSource } from "@warjiang/data-agent-core";
import { createDataAgent } from "./agent.js";

interface CliOptions {
  source?: string;
  model?: string;
  maxRows: number;
  prompt?: string;
  help: boolean;
}

const HELP = `DataAgent — a read-only data analyst powered by Pi

Usage:
  pnpm data-agent -- --source <file> [question]
  data-agent --source <file> [--model provider/model-id] [--max-rows 200]

Sources:
  SQLite (.db, .sqlite, .sqlite3), CSV, TSV, JSON, JSONL, NDJSON
  Tabular files are exposed to SQL as a table named "data".

Examples:
  pnpm data-agent -- -s ./sales.csv "各区域的销售额是多少？"
  pnpm data-agent -- -s ./analytics.db

Environment:
  DATA_AGENT_MODEL   Optional provider/model-id selector.
  Provider API keys and Pi credentials are resolved by Pi's ModelRuntime.
`;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { maxRows: 200, help: false };
  const prompt: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === "--") continue;
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--source" || arg === "-s") options.source = args[++index];
    else if (arg === "--model" || arg === "-m") options.model = args[++index];
    else if (arg === "--max-rows") {
      const value = Number(args[++index]);
      if (!Number.isInteger(value) || value < 1 || value > 10_000) throw new Error("--max-rows must be an integer from 1 to 10000.");
      options.maxRows = value;
    } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else prompt.push(arg);
  }
  if (prompt.length > 0) options.prompt = prompt.join(" ");
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    stdout.write(HELP);
    return;
  }
  if (!options.source) throw new Error("Missing --source. Run with --help for usage.");

  const sourcePath = resolve(options.source);
  const source = await openDataSource(sourcePath);
  let agent;
  try {
    agent = await createDataAgent({ source, sourcePath, maxRows: options.maxRows, model: options.model });
  } catch (error) {
    source.close();
    throw error;
  }

  const unsubscribe = agent.session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      stdout.write(event.assistantMessageEvent.delta);
    }
    if (event.type === "tool_execution_start") stdout.write(`\n\x1b[2m↳ ${event.toolName}\x1b[0m\n`);
    if (event.type === "tool_execution_end" && event.isError) stdout.write("\x1b[31m  tool failed\x1b[0m\n");
  });

  try {
    if (options.prompt) {
      await agent.session.prompt(options.prompt);
      stdout.write("\n");
      return;
    }

    stdout.write(`DataAgent connected to ${sourcePath}\nType a question, or /exit to quit.\n\n`);
    const readline = createInterface({ input: stdin, output: stdout });
    try {
      while (true) {
        const question = (await readline.question("data> ")).trim();
        if (!question) continue;
        if (question === "/exit" || question === "/quit") break;
        await agent.session.prompt(question);
        stdout.write("\n\n");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ABORT_ERR") throw error;
    } finally {
      readline.close();
    }
  } finally {
    unsubscribe();
    agent.dispose();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DataAgent error: ${message}\n`);
  process.exitCode = 1;
});
