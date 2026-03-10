import { readdirSync } from "fs";
import { dirname, join } from "path";
import { pathToFileURL } from "url";
import { fileURLToPath } from "url";
import type { Command } from "./interfaces.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Scans the commands folder and dynamically imports all command modules.
 * Each file must export a default Command object.
 */
export async function loadCommands(): Promise<Command[]> {
  const commandsDir = join(__dirname, "commands");
  const files = readdirSync(commandsDir).filter(
    (f) =>
      (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts")
  );

  const commands: Command[] = [];

  for (const file of files) {
    const modulePath = pathToFileURL(join(commandsDir, file)).href;

    try {
      const mod = await import(modulePath);
      if (mod.default && typeof mod.default.execute === "function") {
        commands.push(mod.default);
      } else {
        console.warn(
          `[loadCommands] ${file}: missing default Command export, skipped`
        );
      }
    } catch (err) {
      console.error(`[loadCommands] Failed to load ${file}:`, err);
    }
  }

  return commands;
}
