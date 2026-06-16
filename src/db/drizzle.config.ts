import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const isDatabaseUrlValid = (url: string | undefined): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") return false;
  if (trimmed.includes("[YOUR") || trimmed.includes("YOUR-PASSWORD") || trimmed.includes("YOUR_PASSWORD") || trimmed.includes("PLACEHOLDER")) return false;
  return trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://");
};

const databaseUrl = process.env.DATABASE_URL;
const isDbUrlValid = isDatabaseUrlValid(databaseUrl);
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!isDbUrlValid && (!sqlHost || !sqlDbName || !user || !password)) {
  throw new Error("Relational database credentials missing: Please set either DATABASE_URL or SQL_HOST/SQL_DB_NAME/SQL_ADMIN_USER/SQL_ADMIN_PASSWORD in environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: isDbUrlValid ? {
    url: databaseUrl!,
    ssl: databaseUrl!.includes('supabase') || databaseUrl!.includes('neon') || databaseUrl!.includes('render')
      ? { rejectUnauthorized: false }
      : false,
  } : {
    host: sqlHost!,
    user: user!,
    password: password!,
    database: sqlDbName!,
    ssl: false,
  },
  verbose: true,
});
