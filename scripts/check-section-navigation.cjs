const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.PORTFOLIO_URL || "http://127.0.0.1:4174";
  for (const width of [1280, 390])
    for (const mode of ["ui", "shell"]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${base}/?nav=${mode}`);
      await page.locator(".section-browser").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("#main > .panel:visible").count(), 1);
      assert(await page.locator("#about").isVisible());
      await page.screenshot({
        path: join(tmpdir(), `section-${mode}-${width}.png`),
        fullPage: true,
      });
      await page.locator('.folder-links [href="#experience"]').click();
      assert(await page.locator("#experience").isVisible());
      assert(!(await page.locator("#about").isVisible()));
      await page.locator("#experience summary").first().click();
      assert(
        (await page
          .locator("#experience details")
          .first()
          .getAttribute("open")) !== null,
      );
      await page.goBack();
      assert(await page.locator("#about").isVisible());
      await page.goForward();
      assert(await page.locator("#experience").isVisible());
      await page.reload();
      assert(await page.locator("#experience").isVisible());
      await page.locator('#site-index [href="#projects"]').click();
      assert.equal(await page.locator(".project-folder").count(), 4);
      await page.locator(".project-folder > summary").nth(1).click();
      assert.equal(
        await page
          .locator(".project-folder")
          .nth(1)
          .locator(".arrow-link")
          .getAttribute("href"),
        "https://development.playground-learning.space/workspace/yWG2GPqOIy7KqxWbWNbI",
      );
      assert(await page.locator("#espresso-canvas").isVisible());
      assert.equal(await page.locator(".sidebar").count(), 1);
      if (mode === "shell") {
        const run = async (command) => {
          await page.locator("#directory-command").fill(command);
          await page.locator("#directory-command").press("Enter");
        };
        await run("cd /projects/playground");
        assert(
          await page
            .locator(".project-folder")
            .nth(1)
            .evaluate((e) => e.open),
        );
        await run("cd ..");
        assert.equal(new URL(page.url()).hash, "#projects");
        await run("cd experience");
        await run("cd duke");
        assert(
          await page
            .locator("#experience details")
            .nth(1)
            .evaluate((e) => e.open),
        );
        await run("cd /");
        assert(await page.locator("#about").isVisible());
        await run("cd missing");
        assert(
          (await page.locator("#shell-output").innerText()).includes(
            "No such folder",
          ),
        );
        await page.locator("#directory-command").press("ArrowUp");
        assert.equal(
          await page.locator("#directory-command").inputValue(),
          "cd missing",
        );
        await run("cd race");
        assert(await page.locator("#race-canvas").isVisible());
        await page.locator("#start-race").click();
        await run("cd about");
        await run("cd race");
        assert(await page.locator("#race-canvas").isVisible());
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
  await page.goto(base);
  assert.equal(await page.locator("#main > .panel:visible").count(), 5);
  assert.equal(await page.locator(".section-browser").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: original page intact; both navigation modes desktop/mobile; section routing, child folders, history/reload, game start, sidebar, no JS errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
