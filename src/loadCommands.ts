import { readdirSync } from "fs";
import { dirname, join, relative } from "path";
import { pathToFileURL, fileURLToPath } from "url";
import type { Command } from "./interfaces.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Scans the commands folder and dynamically imports all command modules.
 * Each file must export a default Command object.
 */
export async function loadCommands(): Promise<Command[]> {
  const commandsDir = join(__dirname, "commands");
  const files: string[] = [];

  const walk = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (
        (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
        !entry.name.endsWith(".d.ts")
      ) {
        files.push(fullPath);
      }
    }
  };
  walk(commandsDir);

  const commands: Command[] = [];
  for (const file of files) {
    const modulePath = pathToFileURL(file).href;
    const displayPath = relative(commandsDir, file);

    try {
      const mod = await import(modulePath);
      if (mod.default && typeof mod.default.execute === "function") {
        commands.push(mod.default);
      } else {
        console.warn(`[loadCommands] ${displayPath}: missing default Command export, skipped`);
      }
    } catch (err) {
      console.error(`[loadCommands] Failed to load ${displayPath}:`, err);
    }
  }
  return commands;
}
