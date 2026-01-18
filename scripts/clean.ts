import { exec } from "shared/exec";

console.log("Cleaning up resources...");

try {
	exec("rm -f /tmp/zero.db*");
} catch (err) {
	console.info(err);
}

try {
	exec("docker rm -f zero");
} catch (err) {
	console.info(err);
}

console.log("Cleanup complete.");
