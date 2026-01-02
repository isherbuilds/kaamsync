import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	memberAc,
	ownerAc,
} from "better-auth/plugins/organization/access";

// Define formal Access Control for the organization
export const ac = createAccessControl({
	...defaultStatements,
	// We can add custom resources here if needed in the future
});

export const owner = ac.newRole({
	...ownerAc.statements,
});

export const admin = ac.newRole({
	...adminAc.statements,
});

export const member = ac.newRole({
	...memberAc.statements,
});

export const guest = ac.newRole({
	ac: ["read"], // Minimal permission to satisfy type system
});

export const roles = {
	owner,
	admin,
	member,
	guest,
};
