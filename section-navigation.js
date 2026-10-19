// Opt-in prototypes on the original page: ?nav=ui or ?nav=shell.
// Existing content and game nodes stay mounted, preserving their state.
const mode = new URLSearchParams(location.search).get("nav");
if (mode === "ui" || mode === "shell") initNavigation(mode);

function initNavigation(mode) {
  const main = document.querySelector("main");
  const sections = [...main.querySelectorAll(":scope > section[id]")];
  const names = {
    about: "About me",
    projects: "Projects",
    experience: "Work experience",
    race: "Race the agents",
    contact: "Contact",
  };
  const children = {
    projects: ["vim", "playground", "benchmark", "amdahl"],
    experience: ["draftkings", "duke", "army", "gmu"],
  };
  const demo =
    "https://development.playground-learning.space/workspace/yWG2GPqOIy7KqxWbWNbI";
  const projectDetails = [];
  document.body.classList.add("section-navigation");
  // Wrap existing articles rather than clone the games or duplicate their IDs.
  main.querySelectorAll("#projects > .work").forEach((article, i) => {
    const details = document.createElement("details");
    details.className = "project-folder";
    details.dataset.folder = children.projects[i];
    const summary = document.createElement("summary");
    summary.textContent = article
      .querySelector("h3")
      .textContent.replace(/\/\/.*$/, "")
      .trim();
    details.append(summary);
    article.before(details);
    details.append(article);
    projectDetails.push(details);
    if (i === 1) {
      const link = article.querySelector(".arrow-link");
      link.href = demo;
      link.textContent = "→ try Playground";
    }
  });
  const workDetails = [...main.querySelectorAll("#experience .log")];
  const nav = document.createElement("section");
  nav.className = "section-browser";
  nav.setAttribute("aria-label", "Explore this website");
  nav.innerHTML = `<div class="browser-bar"><span>michael@home <span aria-hidden="true">▮</span></span><div><a href="?nav=ui${location.hash}" ${mode === "ui" ? 'aria-current="page"' : ""}>Click to explore</a><a href="?nav=shell${location.hash}" ${mode === "shell" ? 'aria-current="page"' : ""}>Terminal</a><a href="./index.html">Long page ↗</a></div></div><nav class="folder-links" aria-label="Sections">${Object.entries(
    names,
  )
    .map(
      ([id, name]) =>
        `<a href="#${id}" data-directory="${id}"><span aria-hidden="true">▤</span> ${name}</a>`,
    )
    .join(
      "",
    )}</nav><div class="browser-location"><a href="#about">~</a><span id="directory-path"></span></div>${mode === "shell" ? '<div class="directory-terminal"><p id="shell-output" role="status">Try cd projects, cd experience, ls, or help. The folders above work too.</p><form id="directory-form"><label for="directory-command">michael:~ $</label><input id="directory-command" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Portfolio shell command" placeholder="cd experience"><button type="submit">Enter ↵</button></form></div>' : ""}`;
  main.prepend(nav);
  let current = "about";
  const commands = [];
  let historyIndex = 0;
  const say = (text) => {
    const output = document.getElementById("shell-output");
    if (output) output.textContent = text;
  };
  function resolve(path) {
    const base =
      path.startsWith("/") || path.startsWith("~")
        ? []
        : current === "about"
          ? []
          : current.split("/");
    for (const part of path.replace(/^~/, "").split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") base.pop();
      else base.push(part);
    }
    const resolved = base.join("/") || "about";
    const [section, child, ...rest] = resolved.split("/");
    return names[section] &&
      !rest.length &&
      (!child || children[section]?.includes(child))
      ? resolved
      : null;
  }
  function show(path, focus = false) {
    const [section, child] = path.split("/");
    current = path;
    nav.querySelectorAll('.browser-bar a[href^="?nav="]').forEach((link) => {
      link.hash = path;
    });
    for (const el of sections) el.hidden = el.id !== section;
    projectDetails.forEach(
      (el, i) =>
        (el.open = section === "projects" && child === children.projects[i]),
    );
    workDetails.forEach(
      (el, i) =>
        (el.open =
          section === "experience" && child === children.experience[i]),
    );
    document.getElementById("directory-path").textContent =
      section === "about" ? " / about" : ` / ${path.replaceAll("/", " / ")}`;
    document
      .querySelectorAll("[data-directory], #site-index a")
      .forEach((link) => {
        if (link.getAttribute("href") === `#${section}`)
          link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    const label = document.querySelector("#directory-form label");
    if (label)
      label.textContent = `michael:~${section === "about" ? "" : "/" + path} $`;
    const selected = sections.find((el) => el.id === section);
    if (focus) {
      selected.tabIndex = -1;
      selected.focus({ preventScroll: true });
    }
    // Scroll only the reading column's beginning into view, never the target
    // section's old position in the long document. Sidebar nodes are untouched.
    if (focus && nav.getBoundingClientRect().top < 0)
      nav.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function navigate(path, focus = false) {
    if (location.hash.slice(1) !== path)
      history.pushState(null, "", `#${path}`);
    show(path, focus);
    say(
      `Opened ~${path === "about" ? "" : "/" + path}. ${children[path] ? "Folders: " + children[path].join("  ") : ""}`,
    );
  }
  function readHash() {
    let value;
    try {
      value = decodeURIComponent(location.hash.slice(1));
    } catch {
      value = "about";
    }
    return resolve("/" + value) || "about";
  }
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const path = resolve("/" + link.getAttribute("href").slice(1));
    if (path) {
      e.preventDefault();
      navigate(path, true);
    }
  });
  window.addEventListener("popstate", () => show(readHash(), true));
  window.addEventListener("hashchange", () => show(readHash(), true));
  show(readHash());
  const form = document.getElementById("directory-form");
  if (!form) return;
  const input = document.getElementById("directory-command");
  input.addEventListener("keydown", (e) => {
    // Typing shell commands must not trigger the race or global easter eggs.
    e.stopPropagation();
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      historyIndex = Math.max(
        0,
        Math.min(
          commands.length,
          historyIndex + (e.key === "ArrowUp" ? -1 : 1),
        ),
      );
      input.value = commands[historyIndex] || "";
    }
  });
  input.addEventListener("keyup", (e) => e.stopPropagation());
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    commands.push(raw);
    historyIndex = commands.length;
    input.value = "";
    const [command, ...args] = raw.split(/\s+/);
    const arg = args.join(" ");
    if (command === "cd") {
      // Top-level names also work from any directory for quick discovery.
      const target = !arg ? "about" : names[arg] ? arg : resolve(arg);
      if (target) navigate(target);
      else say(`No such folder: ${arg}. Try ls or cd ..`);
    } else if (command === "ls" && !arg)
      say(
        (children[current] || Object.keys(names))
          .map((x) => x + "/")
          .join("   "),
      );
    else if (command === "pwd" && !arg)
      say(current === "about" ? "~/" : "~/" + current);
    else if (command === "help" && !arg)
      say(
        "cd projects · cd experience · cd race · cd .. · cd / · ls · pwd · clear. Inside projects: cd playground. ↑/↓ recalls commands.",
      );
    else if (command === "clear" && !arg) say("");
    else
      say(
        `Unknown command: ${raw}. Type help. This shell only navigates the portfolio.`,
      );
  });
}
