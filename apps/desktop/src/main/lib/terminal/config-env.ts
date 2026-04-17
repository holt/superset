/**
 * Config env resolver for desktop daemon-backed terminals.
 * NOTE: A parallel implementation exists at packages/host-service/src/terminal/config-env.ts
 * for v2 host-service terminals. Keep both in sync when making changes.
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const PROJECT_SUPERSET_DIR = ".superset";
const CONFIG_FILE = "config.json";

interface AutoPortValue {
	"auto-port": number;
}

type EnvValue = string | AutoPortValue;

interface ConfigWithEnv {
	env?: Record<string, EnvValue>;
}

function isAutoPort(value: EnvValue): value is AutoPortValue {
	return (
		typeof value === "object" &&
		value !== null &&
		"auto-port" in value &&
		typeof value["auto-port"] === "number"
	);
}

function readEnvFromConfig(
	configPath: string,
): Record<string, EnvValue> | undefined {
	if (!existsSync(configPath)) return undefined;

	try {
		const content = readFileSync(configPath, "utf-8");
		const parsed = JSON.parse(content) as ConfigWithEnv;
		if (
			parsed.env &&
			typeof parsed.env === "object" &&
			!Array.isArray(parsed.env)
		) {
			return parsed.env;
		}
	} catch {
		// Invalid config — skip silently
	}
	return undefined;
}

function isPortFree(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = createServer();
		server.once("error", () => resolve(false));
		server.once("listening", () => {
			server.close(() => resolve(true));
		});
		server.listen(port, "127.0.0.1");
	});
}

/**
 * Load the `env` field from the workspace's `.superset/config.json`,
 * resolve any `auto-port` values to actual free ports, and return
 * a flat Record<string, string> ready to merge into the terminal environment.
 *
 * Reads from worktree path first, falls back to main repo path.
 * Returns undefined if no env config is found.
 */
export async function resolveConfigEnv({
	mainRepoPath,
	worktreePath,
}: {
	mainRepoPath: string;
	worktreePath: string;
}): Promise<Record<string, string> | undefined> {
	const mainEnv = readEnvFromConfig(
		join(mainRepoPath, PROJECT_SUPERSET_DIR, CONFIG_FILE),
	);
	const worktreeEnv =
		worktreePath !== mainRepoPath
			? readEnvFromConfig(
					join(worktreePath, PROJECT_SUPERSET_DIR, CONFIG_FILE),
				)
			: undefined;

	const merged =
		mainEnv || worktreeEnv
			? { ...mainEnv, ...worktreeEnv }
			: undefined;

	if (!merged) return undefined;

	const resolved: Record<string, string> = {};
	const allocatedPorts = new Set<number>();

	for (const [key, value] of Object.entries(merged)) {
		if (typeof value === "string") {
			resolved[key] = value;
		} else if (isAutoPort(value)) {
			let port = value["auto-port"];
			const maxPort = port + 100;
			while (allocatedPorts.has(port) || !(await isPortFree(port))) {
				port++;
				if (port >= maxPort) {
					console.error(
						`[config-env] No free port for env.${key} starting from ${value["auto-port"]}`,
					);
					break;
				}
			}
			if (port < maxPort) {
				allocatedPorts.add(port);
				resolved[key] = String(port);
			}
		}
	}

	return Object.keys(resolved).length > 0 ? resolved : undefined;
}
