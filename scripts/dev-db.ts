import { must } from "shared/must";
import "shared/env";
import { exec } from "shared/exec";

const devPgPassword = must(
	process.env.DEV_PG_PASSWORD,
	"DEV_PG_PASSWORD is required",
);

function main() {
	try {
		console.log("Attempting to start existing zero container...");
		exec("docker start -a zero");
		console.log("zero container started.");
	} catch (error) {
		console.log(error);
		console.log(
			"Existing zero container not found or could not be started. Creating a new one...",
		);
		try {
			exec(
				`docker run --rm --name zero -e POSTGRES_PASSWORD=${devPgPassword} -p 5432:5432 postgres:17-alpine -c wal_level=logical`,
			);
		} catch (runError) {
			console.error("Failed to create and run new container:", runError);
		}
	}
}

main();
