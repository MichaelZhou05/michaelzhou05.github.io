const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const base = process.env.PORTFOLIO_URL || "http://127.0.0.1:4173";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ["arcade", "terminal", "workbench"]) {
      await page.goto(`${base}/prototypes/?view=${view}`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("[data-project]").count(), 5);
      assert.equal(
        await page.locator(".switcher [aria-current=page]").count(),
        1,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(tmpdir(), `portfolio-${view}-${width}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Data systems", exact: true })
        .click();
      assert.equal(await page.locator("[data-project]").count(), 1);
      await page
        .getByRole("button", { name: "All projects", exact: true })
        .click();
      await page.locator('[data-project="vim"]').click();
      if (view !== "workbench") {
        assert(await page.locator("dialog").evaluate((el) => el.open));
        await page.keyboard.press("Escape");
        assert(!(await page.locator("dialog").evaluate((el) => el.open)));
      } else
        assert(
          (await page.locator(".work-detail").innerText()).includes(
            "learn NvChad",
          ),
        );
    }
  }
  await page.goto(`${base}/prototypes/?view=terminal`);
  for (const command of [
    "help",
    "ls",
    "demo playground",
    "source vim",
    "nonsense",
    "<script>bad</script>",
  ]) {
    await page.locator("#command").fill(command);
    await page.getByRole("button", { name: "Run" }).click();
  }
  assert(
    (await page.locator("#transcript").innerText()).includes("No public demo"),
  );
  await page.locator("#command").press("ArrowUp");
  assert.equal(
    await page.locator("#command").inputValue(),
    "<script>bad</script>",
  );
  await page.locator("#command").fill("filter tools");
  await page.getByRole("button", { name: "Run" }).click();
  assert.equal(await page.locator("[data-project]").count(), 1);
  await page.locator("#command").fill("open vim");
  await page.getByRole("button", { name: "Run" }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement.id), "command");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/prototypes/`);
  assert.equal(
    await page
      .locator(".cartridge")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  await page.goto(`${base}/index.html#espresso-canvas`);
  assert.equal(await page.locator("#espresso-canvas").count(), 1);
  assert.equal(await page.locator("#race-canvas").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 3 layouts × desktop/mobile; filtering, modal Escape/focus, terminal/history, reduced motion, original games; no JS errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
