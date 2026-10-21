import { isV2OnlyUser } from "@superset/shared/v2-only-user";
import { authClient } from "renderer/lib/auth-client";

/**
 * True for accounts created on/after V2_ONLY_USER_CUTOFF — these users
 * default to v2.
 */
export function useIsV2OnlyUser(): boolean {
	const { data: session } = authClient.useSession();
	return isV2OnlyUser(session?.user?.createdAt);
}

/** Returns whether v2 is currently active for this user. */
export function useIsV2CloudEnabled(): boolean {
	// Fork-local: force v1. This is a local-only (mock-mode) setup whose
	// workspaces live in local.db; v2 needs cloud auth. Upstream removed the
	// v1/v2 opt-out store and hardcoded this to `true` (v1 sunset in progress),
	// so there is nothing left to defer to — return false to keep the v1
	// surface, which still exists and is still gated on this hook.
	return false;
}
