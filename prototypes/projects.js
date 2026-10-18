// Content provenance and the limits of each claim are documented in README.md.
const repo =
  "https://github.com/MichaelZhou05/michaelzhou05.github.io/blob/main/";
export const projects = [
  {
    id: "race",
    title: "Nordschleife eval",
    category: "AI & evaluation",
    color: "#b6a0ff",
    glyph: "↗",
    subtitle: "Don’t trust the leaderboard. Drive it.",
    tags: ["JavaScript", "Simulation", "Agent evaluation"],
    summary:
      "Race recorded agent laps through a hand-drawn Nürburgring. Inspect the harness behind the clock.",
    ownership:
      "Portfolio implementation: browser race, shared simulation, recorded input replays and a published methodology.",
    decision:
      "One physics module runs both keyboard input and the offline harness. Replay the actions instead of inventing an opponent’s pace.",
    evidence:
      "Playable race and source are public. Simulation time and inference latency are different measurements; current control configurations are not a matched model comparison.",
    limit:
      "The track is an approximation. This is an inspectable experiment, not a general model ranking.",
    flow: ["KEYS / AGENT", "SHARED PHYSICS", "RECORDED LAP"],
    demo: "../index.html#race",
    demoLabel: "Drive a lap",
    source: repo + "race-sim.js",
    sourceLabel: "Inspect shared physics",
    extra: "../race-method.html",
    extraLabel: "Read methodology",
  },
  {
    id: "vim",
    title: "learn NvChad",
    category: "Developer tools",
    color: "#b4de85",
    glyph: ":w",
    subtitle: "Build muscle memory in a real little codebase.",
    tags: ["TypeScript", "Editor state", "Learning tools"],
    summary:
      "A browser trainer with a virtual Python project, persistent buffers and section quizzes. Plus a twelve-mark Vim sprint.",
    ownership:
      "Personal trainer project and the portfolio’s native Vim race. The linked repository documents the trainer implementation.",
    decision:
      "Keep drills in one editing session: each round changes the goal, while cursor position and prior repairs stay intact.",
    evidence:
      "Public trainer and repository. The portfolio race supports counted motions, finds, edits and undo on a fixed course.",
    limit:
      "The browser simulates editor and plugin behavior; it is not a full Neovim runtime. The embedded race needs a keyboard.",
    flow: ["FIND A FILE", "EDIT THE BUFFER", "CHECK THE GOAL"],
    demo: "https://michaelzhou05.github.io/learnNvim/",
    demoLabel: "Open the trainer",
    source: "https://github.com/MichaelZhou05/learnNvim",
    sourceLabel: "Explore the repository",
    extra: "../index.html#projects",
    extraLabel: "Race me in Vim",
  },
  {
    id: "playground",
    title: "Playground AI",
    category: "AI & evaluation",
    color: "#7bd4dd",
    glyph: "◎",
    subtitle: "Course documents → answers you can trace.",
    tags: ["Python", "Flask", "Terraform", "RAG"],
    summary:
      "An AI learning environment for Canvas, with citation-backed answers and curriculum gap mapping.",
    ownership:
      "Existing portfolio describes engineering the learning environment, document retrieval and repeatable infrastructure deployment.",
    decision:
      "Return citations with answers, and deploy through infrastructure as code so the environment can be recreated.",
    evidence:
      "The existing portfolio reports Duke OIT procurement and a design target of 1,000+ users. That is a capacity target, not verified adoption.",
    limit:
      "No project-specific public repository or live demo is linked in the current portfolio.",
    flow: ["COURSE DOCUMENTS", "RETRIEVE CONTEXT", "CITED ANSWER"],
    source: "../index.html#projects",
    sourceLabel: "Read original project entry",
  },
  {
    id: "benchmark",
    title: "Everyday dev benchmark",
    category: "AI & evaluation",
    color: "#ffbf69",
    glyph: "▥",
    subtitle: "Which model, for this particular job?",
    tags: ["Python", "Docker", "Playwright", "React"],
    summary:
      "Per-task model comparisons, with an in-house harness for gaps in public leaderboards.",
    ownership:
      "Existing portfolio describes an in-house evaluation harness, combining public boards with internally measured categories.",
    decision:
      "Separate categories rather than blend them into one score. Leave missing measurements empty instead of estimating.",
    evidence:
      "Portfolio reports eight categories and three measured by in-house evals. The repository is private because it contains hidden test sets.",
    limit:
      "No public results artifact is linked here. The old decorative chart is deliberately not reused as measured evidence.",
    flow: ["AGENT IN DOCKER", "HEADLESS CHECKS", "PER-TASK RESULTS"],
    source: "../index.html#projects",
    sourceLabel: "Read original project entry",
  },
  {
    id: "amdahl",
    title: "Amdahl",
    category: "Data systems",
    color: "#f49bb6",
    glyph: "≡",
    subtitle: "Make a mountain of records queryable.",
    tags: ["LangChain", "ChromaDB", "Google Cloud"],
    summary:
      "Document extraction and metadata standardization for mixed-format government records.",
    ownership:
      "Existing portfolio describes automating document extraction and standardizing metadata for retention analysis.",
    decision:
      "Normalize extracted metadata across mixed formats so downstream analysis can use a consistent representation.",
    evidence:
      "Existing portfolio reports 10,000+ pages and an 85% reduction in manual analysis time. No independent measurement artifact is linked.",
    limit:
      "These are portfolio-reported outcomes; a public demo and implementation write-up are still missing.",
    flow: ["MIXED RECORDS", "EXTRACT + NORMALIZE", "RETENTION ANALYSIS"],
    source: "../index.html#projects",
    sourceLabel: "Read original project entry",
  },
];
export const categories = [
  "All projects",
  ...new Set(projects.map((p) => p.category)),
];
export function parseCommand(raw) {
  const [command = "", ...args] = raw.trim().toLowerCase().split(/\s+/);
  const value = args.join(" ");
  if (["help", "ls", "clear", "coffee"].includes(command) && !value)
    return { command };
  if (
    ["open", "demo", "source"].includes(command) &&
    projects.some((p) => p.id === value)
  )
    return { command, value };
  if (command === "filter" && ["all", "ai", "tools", "data"].includes(value))
    return { command, value };
  return { command: "error" };
}
