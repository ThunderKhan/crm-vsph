import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/passwords.js";

async function main() {
  console.log("🌱 Seeding default tenant...");

  let tenant = await prisma.tenant.findFirst({
    where: { tenant_code: "VSPH001" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        tenant_name: "VSPH Demo Client",
        tenant_code: "VSPH001",
        tenant_plan: "STARTER",
        tenant_status: "ACTIVE",
        tenant_sync_status: "INTERNAL_SEED",
      },
    });
  }
  console.log("✅ Tenant ready:", tenant.tenant_name);

  await prisma.organization_app_entitlement.upsert({
    where: {
      tenant_fk_app_code: { tenant_fk: tenant.tenant_id, app_code: "CRM" },
    },
    update: { entitlement_status: "ACTIVE", last_synced_at: new Date() },
    create: {
      tenant_fk: tenant.tenant_id,
      app_code: "CRM",
      entitlement_status: "ACTIVE",
      last_synced_at: new Date(),
    },
  });

  console.log("🌱 Seeding superadmin user...");
  await prisma.user.upsert({
    where: { user_email: "superadmin@vsph.in" },
    update: {
      user_name: "Super Admin",
      user_role: "SUPER_ADMIN",
      user_department: "IT",
      user_password: await hashPassword("1dmin123456"),
      user_status: true,
      tenant_fk: null,
    },
    create: {
      user_email: "superadmin@vsph.in",
      user_name: "Super Admin",
      user_role: "SUPER_ADMIN",
      user_department: "IT",
      user_password: await hashPassword("1dmin123456"),
      user_status: true,
      tenant_fk: null,
    },
  });
  console.log("✅ Superadmin seeded!");

  console.log("✅ All seeds completed successfully!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
