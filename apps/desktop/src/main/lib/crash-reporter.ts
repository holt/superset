import { app, crashReporter } from "electron";

let crashReporterStarted = false;

export function initCrashReporter(): void {
	if (crashReporterStarted) return;

	try {
		crashReporter.start({
			productName: app.getName(),
			companyName: "Superset",
			submitURL: "",
			uploadToServer: false,
			ignoreSystemCrashHandler: false,
			rateLimit: false,
		});
		crashReporterStarted = true;
		const dumpsDir = app.getPath("crashDumps");
		console.log(
			`[crash-reporter] Local minidumps will be written to ${dumpsDir}`,
		);
	} catch (error) {
		console.error("[crash-reporter] Failed to start:", error);
	}
}
