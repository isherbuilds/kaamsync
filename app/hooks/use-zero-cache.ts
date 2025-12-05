import { createUseZero } from "@rocicorp/zero/react";
import type { Mutators } from "zero/mutators";
import type { QueryContext } from "zero/queries";
import type { Schema } from "zero/schema";

/**
 * Typed Zero hook following zbugs pattern.
 * @example const z = useZ(); z.mutate.matter.create({...});
 */
export const useZ = createUseZero<Schema, Mutators, QueryContext | undefined>();

export type Z = ReturnType<typeof useZ>;
