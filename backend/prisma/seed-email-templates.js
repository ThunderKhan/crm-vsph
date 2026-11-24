import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaClientPackage from "@prisma/client";
import { emailTemplates } from "../src/lib/email-templates.js";

const { PrismaClient } = prismaClientPackage;

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 10,
  connectTimeout: 30000,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { tenant_id: true, tenant_name: true },
  });
  console.log(`Found ${tenants.length} tenant(s)`);

  for (const tenant of tenants) {
    const existing = await prisma.email_template.count({
      where: { tenant_fk: tenant.tenant_id },
    });
    if (existing > 0) {
      console.log(`Skipping ${tenant.tenant_name} (already has ${existing} template(s))`);
      continue;
    }

    await prisma.email_template.createMany({
      data: emailTemplates.map((t) => {
        const { html, text, ...rest } = t;
        return {
          ...rest,
          body_html: html,
          body_text: text,
          tenant_fk: tenant.tenant_id,
        };
      }),
    });
    console.log(`Seeded ${emailTemplates.length} templates for ${tenant.tenant_name}`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
