import { z } from "zod";

// ============================================================================
// WEIGHT LOG SCHEMAS
// ============================================================================

/** Schema for adding a new weight entry */
export const AddWeightSchema = z.object({
	familyMemberId: z.string().uuid("ID membro non valido"),
	date: z.coerce.date(),
	weightKg: z
		.number()
		.min(10, "Peso minimo 10 kg")
		.max(500, "Peso massimo 500 kg"),
	notes: z.string().max(500).optional(),
});
export type AddWeightInput = z.infer<typeof AddWeightSchema>;

/** Full weight log response schema */
export const WeightLogSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	familyMemberId: z.string().uuid(),
	date: z.coerce.date(),
	weightKg: z.number(),
	notes: z.string().nullish(),
	createdAt: z.coerce.date(),
});
export type WeightLog = z.infer<typeof WeightLogSchema>;

/** Schema for weight history query params */
export const WeightHistoryQuerySchema = z.object({
	familyMemberId: z.string().uuid(),
	limit: z.number().int().positive().optional().default(30),
	offset: z.number().int().nonnegative().optional().default(0),
});
export type WeightHistoryQuery = z.infer<typeof WeightHistoryQuerySchema>;
