import { projects, categories, parseCommand } from "./projects.js";
const $ = (s) => document.querySelector(s);
const requested = new URLSearchParams(location.search).get("view");
const view = ["arcade", "terminal", "workbench"].includes(requested)
  ? requested
  : "arcade";
document.body.dataset.view = view;
document
  .querySelector(`.switcher [data-view="${view}"]`)
  .setAttribute("aria-current", "page");
const modes = {
  arcade: [
    "01 / SELECT A CARTRIDGE",
    "Small shelf. Deep rabbit holes.",
    "Pick a project to inspect its decisions, evidence and playable parts.",
  ],
  terminal: [
    "02 / MICHAEL@PORTFOLIO",
    "A shell for the curious.",
    "Use commands or the project buttons. No terminal knowledge required.",
  ],
  workbench: [
    "03 / PROJECT WORKBENCH",
    "Open it up. See how it works.",
    "Select a project on the left; inspect the engineering story on the right.",
  ],
};
$("#mode-label").textContent = modes[view][0];
$("#mode-title").textContent = modes[view][1];
$("#mode-description").textContent = modes[view][2];
let active = projects[0].id;
let category = "All projects";
let history = [],
  historyIndex = 0;
const filtered = () =>
  projects.filter(
    (p) => category === "All projects" || p.category === category,
  );
function art(p) {
  return `<div class="project-art art-${p.id}" aria-hidden="true"><span class="art-grid"></span><span class="art-glyph">${p.glyph}</span><span class="art-code">${p.flow[0]}<br>↓<br>${p.flow[2]}</span><span class="art-caption">MZ / ${p.id.toUpperCase()}</span></div>`;
}
function links(p) {
  return `<div class="actions">${p.demo ? `<a class="button primary" href="${p.demo}">${p.demoLabel} ↗</a>` : '<span class="availability">No public demo linked</span>'}<a class="button" href="${p.source}">${p.sourceLabel} ↗</a>${p.extra ? `<a href="${p.extra}">${p.extraLabel} ↗</a>` : ""}</div>`;
}
function detail(p, modal = false) {
  return `<article class="case" style="--project:${p.color}"><p class="eyebrow">${p.category} / ${p.id.toUpperCase()}</p><h2 ${modal ? 'id="case-title"' : ""}>${p.title}</h2><p class="case-subtitle">${p.subtitle}</p>${links(p)}<div class="flow" aria-label="System flow">${p.flow.map((s, i) => `<span>${s}</span>${i < 2 ? '<b aria-hidden="true">→</b>' : ""}`).join("")}</div><div class="case-grid"><section><h3>01 / My contribution</h3><p>${p.ownership}</p></section><section><h3>02 / A design decision</h3><p>${p.decision}</p></section><section><h3>03 / Evidence & impact</h3><p>${p.evidence}</p></section><section><h3>04 / The honest limits</h3><p>${p.limit}</p></section></div><p class="tags">${p.tags.join(" / ")}</p></article>`;
}
function openProject(id) {
  const p = projects.find((p) => p.id === id);
  active = id;
  if (view === "workbench") {
    render();
    return;
  }
  $("#case-content").innerHTML = detail(p, true);
  $("#case-dialog").showModal();
}
$("#case-dialog .close").addEventListener("click", () =>
  $("#case-dialog").close(),
);
$("#case-dialog").addEventListener("click", (e) => {
  if (e.target === $("#case-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
function filter(next) {
  category = next;
  render();
}
function render() {
  const list = filtered();
  if (!list.some((p) => p.id === active)) active = list[0]?.id;
  $("#count").textContent = `${String(list.length).padStart(2, "0")} PROJECTS`;
  $("#filters").innerHTML = categories
    .map(
      (c) =>
        `<button type="button" aria-pressed="${category === c}">${c}</button>`,
    )
    .join("");
  $("#filters")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        filter(b.textContent);
        [...$("#filters").children]
          .find((n) => n.textContent === category)
          ?.focus();
      }),
    );
  if (view === "arcade")
    $("#stage").innerHTML =
      `<div class="shelf">${list.map((p, i) => `<button class="cartridge" data-project="${p.id}" style="--project:${p.color}"><span class="cart-top"><span>0${i + 1} / ${p.category}</span><span>↗</span></span>${art(p)}<span class="cart-body"><strong>${p.title}</strong><span>${p.subtitle}</span><small>${p.demo ? "PLAYABLE + CASE STUDY" : "CASE STUDY / PORTFOLIO EVIDENCE"}</small></span><span class="pins" aria-hidden="true"></span></button>`).join("")}</div>`;
  if (view === "workbench")
    $("#stage").innerHTML =
      `<div class="workbench"><nav class="project-list" aria-label="Choose case study">${list.map((p) => `<button data-project="${p.id}" aria-pressed="${p.id === active}" style="--project:${p.color}"><span>${p.glyph}</span><strong>${p.title}</strong><small>${p.category}</small></button>`).join("")}</nav><div class="work-detail" aria-live="polite">${detail(projects.find((p) => p.id === active))}</div></div>`;
  if (view === "terminal") {
    $("#stage").innerHTML =
      `<div class="terminal-layout"><div class="terminal"><div class="window-bar"><span>● ● ●</span><span>portfolio.sh — visitor session</span></div><div id="transcript" role="log" aria-label="Command output"><p class="terminal-welcome">Welcome, curious human.<br>Five projects mounted. Nothing to install.</p><p>Try <b>help</b>, <b>open race</b>, or <b>filter tools</b>.</p></div><form id="command-form"><label for="command">visitor@mz:~$</label><input id="command" name="command" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="help" aria-describedby="terminal-hint"><button>Run ↵</button></form><p id="terminal-hint">↑ ↓ command history · commands are local to this page</p></div><nav class="terminal-projects" aria-label="Clickable project shortcuts"><p class="eyebrow">OR JUST CLICK SOMETHING</p>${list.map((p) => `<button data-project="${p.id}" style="--project:${p.color}"><span>${p.glyph}</span><strong>${p.title}</strong><small>open ${p.id} ↗</small></button>`).join("")}</nav></div>`;
    bindTerminal();
  }
  $("#stage")
    .querySelectorAll("[data-project]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.project;
        openProject(id);
        if (view === "workbench")
          document.querySelector(`[data-project="${id}"]`).focus();
      }),
    );
}
function output(text, href, label) {
  const p = document.createElement("p");
  p.textContent = text;
  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    p.append(" ", a);
  }
  $("#transcript").append(p);
  $("#transcript").scrollTop = $("#transcript").scrollHeight;
}
function bindTerminal() {
  $("#command-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#command"),
      raw = input.value.trim();
    if (!raw) return;
    history.push(raw);
    historyIndex = history.length;
    input.value = "";
    output(`visitor@mz:~$ ${raw}`);
    const result = parseCommand(raw),
      p = projects.find((p) => p.id === result.value);
    switch (result.command) {
      case "help":
        output(
          "help · ls · open <id> · demo <id> · source <id> · filter all|ai|tools|data · coffee · clear",
        );
        break;
      case "ls":
        output(
          filtered()
            .map((p) => `${p.id} — ${p.title}`)
            .join("\n"),
        );
        break;
      case "open":
        output(`Opening ${p.title}.`);
        input.focus();
        openProject(p.id);
        break;
      case "demo":
        output(
          p.demo
            ? "Launch this project:"
            : "No public demo linked for this project.",
          p.demo,
          p.demoLabel,
        );
        break;
      case "source":
        output("Project evidence:", p.source, p.sourceLabel);
        break;
      case "coffee":
        output(
          "Your espresso is waiting in the original world.",
          "../index.html#espresso-canvas",
          "Visit the coffee bar ↗",
        );
        break;
      case "clear":
        $("#transcript").replaceChildren();
        break;
      case "filter":
        filter(
          {
            all: "All projects",
            ai: "AI & evaluation",
            tools: "Developer tools",
            data: "Data systems",
          }[result.value],
        );
        output(`Showing ${category.toLowerCase()}.`);
        $("#command").focus();
        break;
      default:
        output(
          "Command not found. Try help. Project IDs: race, vim, playground, benchmark, amdahl.",
        );
    }
  });
  $("#command").addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      historyIndex = Math.max(
        0,
        Math.min(history.length, historyIndex + (e.key === "ArrowUp" ? -1 : 1)),
      );
      e.target.value = history[historyIndex] || "";
    }
  });
}
render();
