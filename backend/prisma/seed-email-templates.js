import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaClientPackage from "@prisma/client";

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

const WELCOME_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <tr>
      <td align="center" style="background:#001B44;padding:30px 20px;">
        <img src="https://app.vsph.in/logo.png" alt="VSPH" style="width:140px;height:auto;display:block;" border="0">
      </td>
    </tr>
    <tr>
      <td style="padding:30px 20px;color:#1f2937;line-height:1.6;">
        <h1 style="color:#001B44;font-size:24px;margin:0 0 16px 0;font-weight:700;">Welcome to {{company_name}}!</h1>
        <p style="margin:0 0 16px 0;font-size:16px;">Hello {{contact_name}},</p>
        <p style="margin:0 0 16px 0;font-size:16px;">We're excited to have you on board. Your CRM account is ready and waiting for you.</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:20px 0;">
              <a href="{{company_website}}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;display:inline-block;">Visit Our Website &rarr;</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:14px;color:#6b7280;">Best regards,<br>{{employee_name}}<br>{{employee_email}}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f3f4f6;padding:20px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#1f2937;">VSPH</p>
        <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">Innovation. Technology. People.</p>
        <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;"><a href="{{company_website}}" style="color:#2563eb;text-decoration:none;">vsph.in</a></p>
        <p style="margin:0;font-size:11px;color:#9ca3af;">You are receiving this because you subscribed at vsph.in.<br><a href="#" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:12px 0 0 0;font-size:11px;color:#9ca3af;">&copy; 2026 VSPH. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const FOLLOWUP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <tr>
      <td align="center" style="background:#001B44;padding:30px 20px;">
        <img src="https://app.vsph.in/logo.png" alt="VSPH" style="width:140px;height:auto;display:block;" border="0">
      </td>
    </tr>
    <tr>
      <td style="padding:30px 20px;color:#1f2937;line-height:1.6;">
        <h1 style="color:#001B44;font-size:24px;margin:0 0 16px 0;font-weight:700;">Following up</h1>
        <p style="margin:0 0 16px 0;font-size:16px;">Hi {{contact_name}},</p>
        <p style="margin:0 0 16px 0;font-size:16px;">I wanted to follow up on our recent conversation at {{company_name}}. Do you have any questions or need any assistance?</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:20px 0;">
              <a href="{{company_website}}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;display:inline-block;">Visit Our Website &rarr;</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:14px;color:#6b7280;">Best regards,<br>{{employee_name}}<br>{{employee_email}}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f3f4f6;padding:20px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#1f2937;">VSPH</p>
        <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">Innovation. Technology. People.</p>
        <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;"><a href="{{company_website}}" style="color:#2563eb;text-decoration:none;">vsph.in</a></p>
        <p style="margin:0;font-size:11px;color:#9ca3af;">You are receiving this because you subscribed at vsph.in.<br><a href="#" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:12px 0 0 0;font-size:11px;color:#9ca3af;">&copy; 2026 VSPH. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
      data: [
        {
          tenant_fk: tenant.tenant_id,
          name: "Welcome New Client",
          subject: "Welcome to {{company_name}}!",
          body_html: WELCOME_HTML,
          body_text: `Welcome to {{company_name}}!\n\nHello {{contact_name}},\n\nWe're excited to have you on board. Your CRM account is ready and waiting for you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}\n\n---\nVSPH\nInnovation. Technology. People.\nvsph.in\nYou are receiving this because you subscribed at vsph.in.\nUnsubscribe\n\u00a9 2026 VSPH. All rights reserved.`,
          is_default: true,
        },
        {
          tenant_fk: tenant.tenant_id,
          name: "Follow Up",
          subject: "Following up - {{company_name}}",
          body_html: FOLLOWUP_HTML,
          body_text: `Following up - {{company_name}}\n\nHi {{contact_name}},\n\nI wanted to follow up on our recent conversation at {{company_name}}. Do you have any questions or need any assistance?\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}\n\n---\nVSPH\nInnovation. Technology. People.\nvsph.in\nYou are receiving this because you subscribed at vsph.in.\nUnsubscribe\n\u00a9 2026 VSPH. All rights reserved.`,
          is_default: false,
        },
      ],
    });
    console.log(`Seeded default templates for ${tenant.tenant_name}`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
