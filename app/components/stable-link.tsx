import { memo } from "react";
import { Link, type LinkProps } from "react-router";

// A memoized wrapper around react-router's Link to prevent re-renders when
// only parent component state changes unrelated to navigation target.
// NOTE: React Compiler (enabled in build) already optimizes, but in dev this
// helps React Scan highlight genuine changes.
export const StableLink = memo(
	(props: LinkProps) => {
		// Spread props so react-router retains all behavior (prefetch, reload, etc.)
		return <Link {...props} />;
	},
	(prev, next) => {
		// Compare cheap scalar props; skip children deep compare (assume stable element structure).
		return (
			prev.to === next.to &&
			prev.className === next.className &&
			prev.prefetch === next.prefetch &&
			prev.reloadDocument === next.reloadDocument
		);
	},
);

StableLink.displayName = "StableLink";
