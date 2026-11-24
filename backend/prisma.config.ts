import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI accepts either DATABASE_URL or the DATABASE_* variables the server
// uses at runtime, so generation works even before DATABASE_URL is configured.
const databaseUrl =
  process.env.DATABASE_URL ||
  `mysql://${encodeURIComponent(process.env.DATABASE_USER || "root")}:${encodeURIComponent(process.env.DATABASE_PASSWORD || "")}@${process.env.DATABASE_HOST || "localhost"}:${process.env.DATABASE_PORT || "3306"}/${process.env.DATABASE_NAME || "crm"}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
