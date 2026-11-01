import test from "node:test";
import assert from "node:assert/strict";
import { projects, parseCommand } from "../prototypes/projects.js";
test("terminal accepts normalized commands and rejects unknown projects or extra arguments", () => {
  assert.deepEqual(parseCommand(" OPEN   VIM "), {
    command: "open",
    value: "vim",
  });
  for (const input of [
    "open missing",
    "help extra",
    "<script>alert(1)</script>",
    "filter unknown",
    "",
  ])
    assert.equal(parseCommand(input).command, "error");
  for (const p of projects)
    for (const command of ["open", "source", "demo"])
      assert.deepEqual(parseCommand(`${command} ${p.id}`), {
        command,
        value: p.id,
      });
});
test("every case study exposes evidence, limitations and a real source destination", () => {
  assert.equal(new Set(projects.map((p) => p.id)).size, projects.length);
  for (const p of projects) {
    assert.ok(p.evidence && p.limit && p.ownership && p.decision);
    assert.match(p.source, /^(https:\/\/|\.\.\/)/);
    assert.equal(p.flow.length, 3);
  }
  assert.equal(
    projects.find((p) => p.id === "playground").demo,
    "https://development.playground-learning.space/workspace/yWG2GPqOIy7KqxWbWNbI",
  );
});
