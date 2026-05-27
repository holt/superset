// React 19.2's development build emits a `performance.measure()` for every
// component render/effect to populate its "Components ⚛" / "Scheduler ⚛"
// tracks in Chrome's Performance panel. Those PerformanceMeasure entries are
// never cleared, so over a multi-hour session they accumulate into millions of
// retained objects — a heap snapshot showed 6.87M entries (796 MB) — and OOM
// the renderer against Chromium's hard 2 GB Blink PartitionAlloc cap
// (PartitionsOutOfMemoryUsing2G). The tracks are only meaningful while a
// Performance-panel recording is active, so we neutralize the entry
// accumulation in dev. Production React builds don't emit these at all.
//
// Escape hatch: to profile with the React tracks, run
//   localStorage.setItem("superset:react-perf-tracks", "1")
// in the renderer console and reload.
//
// This module must be imported before `react-dom/client` so the stubs are in
// place before React records its first measure.
if (
	import.meta.env.DEV &&
	localStorage.getItem("superset:react-perf-tracks") !== "1"
) {
	const noop = () => undefined;
	performance.measure = noop as unknown as Performance["measure"];
	performance.mark = noop as unknown as Performance["mark"];
}
