import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";
import { db } from "./client";

export function useMigrationHelper() {
	const { success, error } = useMigrations(db, migrations);
	return { success, error };
}
