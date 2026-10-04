import { isV2OnlyUser } from "@superset/shared/v2-only-user";
import { useSyncExternalStore } from "react";
import { authClient } from "renderer/lib/auth-client";
import {
	isV1ForcedFlipActive,
	isV1MigrationComplete,
	isV1MigrationCompleteAtBoot,
	V1_MIGRATION_COMPLETED_EVENT,
} from "renderer/lib/v1-migration/completion";
import { useV2LocalOverrideStore } from "renderer/stores/v2-local-override";

function subscribeToMigrationCompletion(onChange: () => void): () => void {
	window.addEventListener(V1_MIGRATION_COMPLETED_EVENT, onChange);
	return () =>
		window.removeEventListener(V1_MIGRATION_COMPLETED_EVENT, onChange);
}

/** Live marker read: re-renders the moment a pass completes this session. */
function useIsV1MigrationCompleteNow(
	organizationId: string | null | undefined,
): boolean {
	const read = () => isV1MigrationComplete(organizationId ?? null);
	return useSyncExternalStore(subscribeToMigrationCompletion, read, read);
}

/**
 * True for accounts created on/after V2_ONLY_USER_CUTOFF — these users
 * default to v2.
 */
export function useIsV2OnlyUser(): boolean {
	const { data: session } = authClient.useSession();
	return isV2OnlyUser(session?.user?.createdAt);
}

/**
 * True when v2 is locked on for this machine (org migration completed, or
 * the forced-flip backstop is active). The optInV2 override has no effect in
 * either state, so surfaces offering the v1/v2 switch must hide it instead
 * of rendering a control that silently snaps back.
 */
export function useIsV1FlipLocked(): boolean {
	const { data: session } = authClient.useSession();
	const organizationId = session?.session?.activeOrganizationId;
	const completedThisSession = useIsV1MigrationCompleteNow(organizationId);
	return (
		isV1MigrationCompleteAtBoot(organizationId) ||
		completedThisSession ||
		isV1ForcedFlipActive()
	);
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
