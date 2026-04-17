import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createServer } from "node:net";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfigEnv } from "./config-env";

const TEST_DIR = join(tmpdir(), `superset-test-config-env-${process.pid}`);
const MAIN_REPO = join(TEST_DIR, "main-repo");
const WORKTREE = join(TEST_DIR, "worktree");

describe("resolveConfigEnv", () => {
	beforeEach(() => {
		mkdirSync(join(MAIN_REPO, ".superset"), { recursive: true });
	});

	afterEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	test("returns undefined when no config exists", async () => {
		rmSync(join(MAIN_REPO, ".superset", "config.json"), { force: true });
		const result = await resolveConfigEnv({
			mainRepoPath: MAIN_REPO,
			worktreePath: MAIN_REPO,
		});
		expect(result).toBeUndefined();
	});

	test("returns undefined when config has no env field", async () => {
		writeFileSync(
			join(MAIN_REPO, ".superset", "config.json"),
			JSON.stringify({ setup: ["yarn install"] }),
		);

		const result = await resolveConfigEnv({
			mainRepoPath: MAIN_REPO,
			worktreePath: MAIN_REPO,
		});
		expect(result).toBeUndefined();
	});

	test("resolves static string env values", async () => {
		writeFileSync(
			join(MAIN_REPO, ".superset", "config.json"),
			JSON.stringify({
				env: { NODE_ENV: "development", FOO: "bar" },
			}),
		);

		const result = await resolveConfigEnv({
			mainRepoPath: MAIN_REPO,
			worktreePath: MAIN_REPO,
		});
		expect(result).toEqual({ NODE_ENV: "development", FOO: "bar" });
	});

	test("resolves auto-port to a free port", async () => {
		writeFileSync(
			join(MAIN_REPO, ".superset", "config.json"),
			JSON.stringify({
				env: { PORT: { "auto-port": 3000 } },
			}),
		);

		const result = await resolveConfigEnv({
			mainRepoPath: MAIN_REPO,
			worktreePath: MAIN_REPO,
		});
		expect(result).toBeDefined();
		const port = Number.parseInt(result!.PORT!, 10);
		expect(port).toBeGreaterThanOrEqual(3000);
		expect(port).toBeLessThan(3100);
	});

	test("auto-port skips occupied ports", async () => {
		// Use a high ephemeral port to avoid conflicts with dev servers
		const basePort = 49200;
		writeFileSync(
			join(MAIN_REPO, ".superset", "config.json"),
			JSON.stringify({
				env: { PORT: { "auto-port": basePort } },
			}),
		);

		// Occupy the base port
		const server = createServer();
		await new Promise<void>((resolve) => {
			server.listen(basePort, "127.0.0.1", () => resolve());
		});

		try {
			const result = await resolveConfigEnv({
				mainRepoPath: MAIN_REPO,
				worktreePath: MAIN_REPO,
			});
			expect(result).toBeDefined();
			const port = Number.parseInt(result!.PORT!, 10);
			expect(port).toBeGreaterThan(basePort);
		} finally {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	});

	test("worktree env merges over main repo env", async () => {
		writeFileSync(
			join(MAIN_REPO, ".superset", "config.json"),
			JSON.stringify({
				env: { NODE_ENV: "development", SHARED: "from-main" },
			}),
		);

		mkdirSync(join(WORKTREE, ".superset"), { recursive: true });
		writeFileSync(
			join(WORKTREE, ".superset", "config.json"),
			JSON.stringify({
				env: { SHARED: "from-worktree", EXTRA: "value" },
			}),
		);

		const result = await resolveConfigEnv({
			mainRepoPath: MAIN_REPO,
			worktreePath: WORKTREE,
		});
		expect(result).toEqual({
			NODE_ENV: "development",
			SHARED: "from-worktree",
			EXTRA: "value",
		});
	});

	test("returns undefined for empty env object", async () => {
		writeFileSync(
			join(MAIN_REPO, ".superset", "config.json"),
			JSON.stringify({ env: {} }),
		);

		const result = await resolveConfigEnv({
			mainRepoPath: MAIN_REPO,
			worktreePath: MAIN_REPO,
		});
		expect(result).toBeUndefined();
	});
});
