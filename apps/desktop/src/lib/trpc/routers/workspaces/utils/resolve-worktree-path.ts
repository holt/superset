import { join } from "node:path";
import { type SelectProject, settings } from "@superset/local-db";
import { SUPERSET_HOME_DIR } from "main/lib/app-environment";
import { localDb } from "main/lib/local-db";
import { WORKTREES_DIR_NAME } from "shared/constants";

/**
 * Resolves base dir: project override > global setting > default
 * (<SUPERSET_HOME_DIR>/worktrees). Derives from SUPERSET_HOME_DIR rather than
 * a hardcoded `~/.superset` so a relocated home dir is honored — and so the
 * default never lands under a dot-prefixed path (which makes glob-based lint
 * rules like postcss-modules silently skip files).
 */
export function resolveWorktreePath(
	project: Pick<SelectProject, "name" | "worktreeBaseDir">,
	branch: string,
): string {
	if (project.worktreeBaseDir) {
		return join(project.worktreeBaseDir, project.name, branch);
	}

	const row = localDb.select().from(settings).get();
	const baseDir =
		row?.worktreeBaseDir ?? join(SUPERSET_HOME_DIR, WORKTREES_DIR_NAME);

	return join(baseDir, project.name, branch);
}
