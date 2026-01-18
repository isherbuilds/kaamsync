import { type ExecSyncOptions, execSync } from "node:child_process";

export function exec(command: string, options?: ExecSyncOptions) {
	console.log(`> ${command}`);
	return execSync(command, { stdio: "inherit", ...options });
}
