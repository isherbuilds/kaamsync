import type { Query, Row, Schema, TableSchema } from "@rocicorp/zero";

export type ZeroQueryResult<
	T extends (...args: any) => TableSchema | Query<Schema, string, any>,
> = Row<ReturnType<T>>;
