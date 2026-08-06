import { isV2OnlyUser } from "@superset/shared/v2-only-user";
import { authClient } from "renderer/lib/auth-client";
import { useV2LocalOverrideStore } from "renderer/stores/v2-local-override";

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
	const v2Only = useIsV2OnlyUser();
	const optInV2 = useV2LocalOverrideStore((s) => s.optInV2);
	// Fork-local: do NOT default dev builds to v2, and do NOT honor the
	// v1→v2 migrate-then-flip / forced-flip gates. This is a v1 setup whose
	// workspaces live in local.db; upstream's dev-defaults-to-v2 (and now its
	// auto-migration flip) hid them on every restart. The auto-migration boot
	// trigger is flag-gated and stays off offline, so leaving it mounted is a
	// no-op here. Explicit opt-in still wins; v2-only accounts still get v2.
	return optInV2 ?? v2Only;
}
