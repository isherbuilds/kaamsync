import { dropAllDatabases } from "@rocicorp/zero";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth-client";

export function loader() {
	return redirect("/login");
}

export async function clientAction() {
	await authClient.signOut();
	localStorage.clear();
	await dropAllDatabases();

	const dbs = await window.indexedDB.databases();
	dbs.forEach((db: any) => {
		window.indexedDB.deleteDatabase(db.name);
	});

	return redirect("/");
}
