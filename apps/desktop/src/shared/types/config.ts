export interface AutoPortEnvValue {
	"auto-port": number;
}

export type EnvValue = string | AutoPortEnvValue;

export interface SetupConfig {
	setup?: string[];
	teardown?: string[];
	run?: string[];
	env?: Record<string, EnvValue>;
}

export interface LocalScriptMerge {
	before?: string[];
	after?: string[];
}

export interface LocalSetupConfig {
	setup?: string[] | LocalScriptMerge;
	teardown?: string[] | LocalScriptMerge;
	run?: string[] | LocalScriptMerge;
	env?: Record<string, EnvValue>;
}

export interface SetupAction {
	id: string;
	category:
		| "package-manager"
		| "environment"
		| "infrastructure"
		| "version-manager";
	label: string;
	detail: string;
	command: string;
	enabled: boolean;
}

export interface SetupDetectionResult {
	projectSummary: string;
	actions: SetupAction[];
	setupTemplate: string[];
	signals: Record<string, boolean>;
}
