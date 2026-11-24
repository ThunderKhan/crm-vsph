import { test, expect } from "@playwright/test";

const url = "http://localhost:5173/dev/contact-preview";
test("selection, clipboard, composer validation, persistence and rapid switches",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await page.goto(url);
  await expect(page.getByRole("heading",{name:/Priya Anjali Kapoor/})).toBeVisible();
  await page.getByRole("button",{name:"Opportunities",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Linked opportunities"})).toBeVisible();
  await page.getByRole("button",{name:"Overview",exact:true}).click();
  await expect(page.locator(".cw-main-tabs .cw-sliding-indicator")).toBeVisible();
  await page.getByRole("button",{name:"Copy Email",exact:true}).click();
  await expect(page.getByRole("button",{name:"Email copied",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe("priya.kapoor@meridian.example.com");
  await page.getByRole("button",{name:"Log a call",exact:true}).click();
  await page.getByRole("button",{name:"Save call",exact:true}).click();
  await expect(page.getByText("Enter a call subject or outcome.",{exact:true})).toBeVisible();
  await page.getByLabel("Subject / outcome").fill("Motion test call");
  await page.getByLabel("Call notes").fill("Local fixture test notes");
  await page.getByRole("button",{name:"Create task",exact:true}).click();
  await page.getByRole("button",{name:"Log a call",exact:true}).click();
  await expect(page.getByLabel("Subject / outcome")).toHaveValue("Motion test call");
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.getByRole("button",{name:"Log a call",exact:true}).click();
  await expect(page.getByLabel("Call notes")).toHaveValue("Local fixture test notes");
  await page.getByText("Slow requests",{exact:true}).click();
  await page.getByRole("button",{name:"Save call",exact:true}).click();
  await expect(page.getByRole("button",{name:"Saving…",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Saved",exact:true})).toBeVisible();
  await expect(page.locator(".cw-timeline-item[data-new=true]")).toContainText("Motion test call");
  await page.getByRole("button",{name:"Tasks",exact:true}).click();
  await page.getByRole("button",{name:"All activity",exact:true}).click();
  await expect(page.locator(".cw-timeline-item[data-new=true]")).toHaveCount(0);
  await expect(page.getByText("Motion test call",{exact:true})).toHaveCount(1);
});
test("failure preserves draft, tooltip dismisses, dialog exits and focus returns",async({page})=>{
  await page.goto(url);
  await expect(page.getByRole("heading",{name:/Priya Anjali Kapoor/})).toBeVisible();
  const copy=page.getByRole("button",{name:"Copy Email",exact:true});
  await copy.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Copy Email");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("button",{name:"Log a call",exact:true}).click();
  await page.getByLabel("Subject / outcome").fill("Failed call");
  await page.getByLabel("Call notes").fill("Keep these notes");
  await page.getByRole("button",{name:"Fail next write",exact:true}).click();
  await page.getByRole("button",{name:"Save call",exact:true}).click();
  await expect(page.getByText("Simulated preview failure. Your data was not changed.")).toBeVisible();
  await expect(page.getByLabel("Call notes")).toHaveValue("Keep these notes");
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  const edit=page.getByRole("button",{name:"Edit contact",exact:true});
  await edit.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
});
test("mobile, loading and reduced motion",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(url);
  await expect(page.getByRole("heading",{name:/Priya Anjali Kapoor/})).toBeVisible();
  await page.getByText("Slow requests",{exact:true}).click();
  await page.getByRole("button",{name:"Long content",exact:true}).click();
  await expect(page.getByText("Loading contact…",{exact:true})).toBeAttached();
  await expect(page.locator(".cw-skeleton-avatar")).toHaveCSS("animation-name","none");
  await expect(page.getByRole("heading",{name:/Montgomery-Richardson/})).toBeVisible();
  await expect(page.locator(".cw-main-tabs .cw-sliding-indicator")).toHaveCSS("transition-duration","0s");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.getByRole("button",{name:"View all contact details",exact:true}).click();
  await page.getByRole("button",{name:"Professional information",exact:true}).click();
  await expect(page.getByText("Executive Vice President of International Operations and Strategic Partnerships",{exact:true})).toBeVisible();
});

for (const reducedMotion of ["no-preference","reduce"]) {
  test(`dialog dismissal restores the real opener (${reducedMotion})`,async({page})=>{
    await page.emulateMedia({reducedMotion});
    await page.goto(url);
    await expect(page.getByRole("heading",{name:/Priya Anjali Kapoor/})).toBeVisible();
    const edit=page.getByRole("button",{name:"Edit contact",exact:true});
    const more=page.getByRole("button",{name:"More contact actions",exact:true});
    const dialog=page.getByRole("dialog");

    await edit.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(edit).toBeFocused();

    await edit.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button",{name:"Close dialog",exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(edit).toBeFocused();

    await more.click();
    await page.getByRole("menuitem",{name:"Add to campaign",exact:true}).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();

    await more.click();
    await page.getByRole("menuitem",{name:"Delete contact",exact:true}).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();
  });
}
