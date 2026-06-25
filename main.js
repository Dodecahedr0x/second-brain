var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SecondBrainPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_child_process = require("child_process");
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var VIEW_TYPE_OUTPUT = "second-brain-output";
var WORKFLOWS = [
  { id: "process-inbox", label: "Process inbox (default loop)", script: "run.sh" },
  { id: "ingestion", label: "Ingest new content", script: "run.sh", spec: "specs/ingestion.md" },
  { id: "connection", label: "Connect existing notes", script: "run.sh", spec: "specs/connection.md" },
  { id: "generation", label: "Generate atomic notes", script: "run.sh", spec: "specs/generation.md" },
  { id: "daily-note", label: "Annotate daily note links", script: "run.sh", spec: "specs/daily-note.md" },
  { id: "daily-pipeline", label: "Run daily pipeline", script: "run.sh", spec: "specs/daily-pipeline.md" },
  { id: "source-note", label: "Create source note from URL", script: "run.sh", spec: "specs/source-note.md", needsUrl: true },
  { id: "knowledge-digest", label: "Knowledge digest", script: "run.sh", spec: "specs/knowledge-digest.md" },
  { id: "daily-suggestions", label: "Daily suggestions", script: "run.sh", spec: "specs/daily-suggestions.md" },
  { id: "weekly-review", label: "Weekly review", script: "run.sh", spec: "specs/weekly-review.md" },
  { id: "monthly-review", label: "Monthly review", script: "run.sh", spec: "specs/monthly-review.md" },
  { id: "retry-failed", label: "Retry failed items", script: "retry-failed.sh" }
];
function defaultEnabled() {
  const e = {};
  for (const w of WORKFLOWS) e[w.id] = true;
  return e;
}
var DEFAULT_SETTINGS = {
  repoPath: "",
  claudePath: path.join(os.homedir(), ".local", "bin", "claude"),
  extraPath: `${path.join(os.homedir(), ".local", "bin")}:/opt/homebrew/bin:/usr/local/bin`,
  extraClaudeArgs: "",
  confirmBeforeRun: false,
  autoOpenPanel: true,
  showRibbon: true,
  notifications: true,
  timeoutMinutes: 0,
  enabled: defaultEnabled()
};
var SecondBrainPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.child = null;
    this.runningLabel = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_OUTPUT, (leaf) => new OutputView(leaf, this));
    for (const wf of WORKFLOWS) {
      if (this.settings.enabled[wf.id] === false) continue;
      this.addCommand({
        id: wf.id,
        name: wf.label,
        callback: () => this.trigger(wf)
      });
    }
    if (this.settings.showRibbon) {
      this.addRibbonIcon("brain-circuit", "Second Brain workflows", () => {
        new WorkflowPicker(this.app, this).open();
      });
    }
    this.addSettingTab(new SBSettingTab(this.app, this));
  }
  async onunload() {
    this.killRun();
  }
  // ---- run orchestration -------------------------------------------------
  async trigger(wf) {
    if (this.child) {
      new import_obsidian.Notice(`A workflow is already running: ${this.runningLabel}`);
      return;
    }
    const err = this.preflight();
    if (err) {
      new import_obsidian.Notice(err, 8e3);
      return;
    }
    if (wf.needsUrl) {
      new UrlModal(this.app, await readClipboard(), (url) => {
        if (url) this.maybeConfirmAndRun(wf, url);
      }).open();
      return;
    }
    this.maybeConfirmAndRun(wf);
  }
  maybeConfirmAndRun(wf, extra) {
    if (this.settings.confirmBeforeRun) {
      new ConfirmModal(this.app, `Run "${wf.label}"?`, () => this.run(wf, extra)).open();
    } else {
      this.run(wf, extra);
    }
  }
  /** Returns an error string if the run cannot start, else null. */
  preflight() {
    const repo = this.settings.repoPath.trim();
    if (!repo) return "Set the repo path in Second Brain settings first.";
    if (!fs.existsSync(repo)) return `Repo path does not exist: ${repo}`;
    if (!fs.existsSync(path.join(repo, "scripts", "run.sh")))
      return `scripts/run.sh not found under repo path: ${repo}`;
    if (!fs.existsSync(path.join(repo, ".env.local")))
      return "No .env.local in the repo. Open Second Brain settings and click \u201CPoint at this vault\u201D.";
    return null;
  }
  async run(wf, extra) {
    var _a, _b, _c, _d;
    const repo = this.settings.repoPath.trim();
    const scriptPath = path.join(repo, "scripts", wf.script);
    const view = await this.ensureView();
    const env = { ...process.env };
    if (this.settings.extraPath.trim()) {
      env.PATH = `${this.settings.extraPath.trim()}:${(_a = env.PATH) != null ? _a : ""}`;
    }
    if (this.settings.claudePath.trim()) env.CLAUDE_BIN = this.settings.claudePath.trim();
    if (this.settings.extraClaudeArgs.trim()) env.CLAUDE_EXTRA_ARGS = this.settings.extraClaudeArgs.trim();
    const args = [scriptPath];
    if (wf.script === "run.sh") {
      args.push((_b = wf.spec) != null ? _b : "");
      if (extra) args.push(extra);
    }
    view.start(wf.label);
    view.append(`$ bash ${args.map(quote).join(" ")}

`);
    if (this.settings.notifications) new import_obsidian.Notice(`Started: ${wf.label}`);
    let child;
    try {
      child = (0, import_child_process.spawn)("bash", args, { cwd: repo, env, detached: true });
    } catch (e) {
      view.finish(-1, String(e));
      new import_obsidian.Notice(`Failed to start: ${String(e)}`, 8e3);
      return;
    }
    this.child = child;
    this.runningLabel = wf.label;
    let timer = null;
    if (this.settings.timeoutMinutes > 0) {
      timer = setTimeout(() => {
        view.append(`
[timeout after ${this.settings.timeoutMinutes} min \u2014 killing run]
`);
        this.killRun();
      }, this.settings.timeoutMinutes * 6e4);
    }
    (_c = child.stdout) == null ? void 0 : _c.on("data", (d) => view.append(d.toString()));
    (_d = child.stderr) == null ? void 0 : _d.on("data", (d) => view.append(d.toString()));
    child.on("error", (e) => view.append(`
[spawn error] ${String(e)}
`));
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      this.child = null;
      this.runningLabel = null;
      view.finish(code != null ? code : -1);
      if (this.settings.notifications) {
        new import_obsidian.Notice(code === 0 ? `Done: ${wf.label}` : `Failed (${code}): ${wf.label}`);
      }
    });
  }
  killRun() {
    if (!this.child || this.child.pid == null) return;
    try {
      process.kill(-this.child.pid, "SIGTERM");
    } catch (e) {
      try {
        this.child.kill("SIGTERM");
      } catch (e2) {
      }
    }
  }
  // ---- view helpers ------------------------------------------------------
  async ensureView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_OUTPUT)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_OUTPUT, active: true });
    }
    if (this.settings.autoOpenPanel) this.app.workspace.revealLeaf(leaf);
    return leaf.view;
  }
  vaultPath() {
    const adapter = this.app.vault.adapter;
    return adapter instanceof import_obsidian.FileSystemAdapter ? adapter.getBasePath() : "";
  }
  writeEnvLocal() {
    const repo = this.settings.repoPath.trim();
    if (!repo || !fs.existsSync(repo)) return "Set a valid repo path first.";
    const vp = this.vaultPath();
    if (!vp) return "Could not determine the vault path.";
    try {
      fs.writeFileSync(path.join(repo, ".env.local"), `VAULT_PATH=${vp}
`);
      return null;
    } catch (e) {
      return `Could not write .env.local: ${String(e)}`;
    }
  }
  async loadSettings() {
    var _a;
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.settings.enabled = Object.assign({}, defaultEnabled(), (_a = data == null ? void 0 : data.enabled) != null ? _a : {});
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
function quote(s) {
  if (s === "") return "''";
  return /[\s"'$]/.test(s) ? `'${s.replace(/'/g, "'\\''")}'` : s;
}
async function readClipboard() {
  try {
    const txt = await navigator.clipboard.readText();
    return /^https?:\/\//i.test(txt.trim()) ? txt.trim() : "";
  } catch (e) {
    return "";
  }
}
var OutputView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.started = 0;
    this.ticker = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_OUTPUT;
  }
  getDisplayText() {
    return "Second Brain output";
  }
  getIcon() {
    return "brain-circuit";
  }
  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("sb-output");
    const header = root.createDiv({ cls: "sb-header" });
    this.statusEl = header.createSpan({ cls: "sb-status", text: "Idle" });
    this.timerEl = header.createSpan({ cls: "sb-timer", text: "" });
    this.stopBtn = header.createEl("button", { cls: "sb-stop", text: "Stop" });
    this.stopBtn.disabled = true;
    this.stopBtn.onclick = () => this.plugin.killRun();
    this.pre = root.createEl("pre", { cls: "sb-log" });
  }
  async onClose() {
    if (this.ticker) clearInterval(this.ticker);
  }
  start(label) {
    this.pre.empty();
    this.started = Date.now();
    this.statusEl.setText(`Running: ${label}`);
    this.statusEl.removeClass("sb-ok", "sb-fail");
    this.statusEl.addClass("sb-running");
    this.stopBtn.disabled = false;
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = setInterval(() => this.tick(), 1e3);
    this.tick();
  }
  tick() {
    const s = Math.floor((Date.now() - this.started) / 1e3);
    const m = Math.floor(s / 60);
    this.timerEl.setText(`${m}m ${String(s % 60).padStart(2, "0")}s`);
  }
  append(text) {
    const atBottom = this.pre.scrollTop + this.pre.clientHeight >= this.pre.scrollHeight - 4;
    this.pre.appendText(text);
    if (atBottom) this.pre.scrollTop = this.pre.scrollHeight;
  }
  finish(code, errText) {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.stopBtn.disabled = true;
    this.statusEl.removeClass("sb-running");
    if (code === 0) {
      this.statusEl.addClass("sb-ok");
      this.statusEl.setText("Done \u2713");
    } else {
      this.statusEl.addClass("sb-fail");
      this.statusEl.setText(`Failed (exit ${code})`);
    }
    if (errText) this.append(`
${errText}
`);
  }
};
var UrlModal = class extends import_obsidian.Modal {
  constructor(app, prefill, onSubmit) {
    super(app);
    this.prefill = prefill;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.titleEl.setText("Create source note from URL");
    const input = this.contentEl.createEl("input", {
      type: "text",
      cls: "sb-url-input",
      placeholder: "https://\u2026"
    });
    input.value = this.prefill;
    input.style.width = "100%";
    input.focus();
    input.select();
    const submit = () => {
      const v = input.value.trim();
      this.close();
      this.onSubmit(v);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    const bar = this.contentEl.createDiv({ cls: "sb-modal-buttons" });
    const btn = bar.createEl("button", { cls: "mod-cta", text: "Run" });
    btn.onclick = submit;
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ConfirmModal = class extends import_obsidian.Modal {
  constructor(app, message, onYes) {
    super(app);
    this.message = message;
    this.onYes = onYes;
  }
  onOpen() {
    this.contentEl.createEl("p", { text: this.message });
    const bar = this.contentEl.createDiv({ cls: "sb-modal-buttons" });
    const yes = bar.createEl("button", { cls: "mod-cta", text: "Run" });
    yes.onclick = () => {
      this.close();
      this.onYes();
    };
    bar.createEl("button", { text: "Cancel" }).onclick = () => this.close();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WorkflowPicker = class extends import_obsidian.SuggestModal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.setPlaceholder("Run a second-brain workflow\u2026");
  }
  getSuggestions(query) {
    const q = query.toLowerCase();
    return WORKFLOWS.filter(
      (w) => this.plugin.settings.enabled[w.id] !== false && w.label.toLowerCase().includes(q)
    );
  }
  renderSuggestion(wf, el) {
    var _a;
    el.createEl("div", { text: wf.label });
    el.createEl("small", { text: (_a = wf.spec) != null ? _a : wf.script });
  }
  onChooseSuggestion(wf) {
    this.plugin.trigger(wf);
  }
};
var SBSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl, plugin } = this;
    containerEl.empty();
    containerEl.createEl("h3", { text: "Paths & execution" });
    new import_obsidian.Setting(containerEl).setName("Repo path").setDesc("Disk path to the second-brain repo (contains scripts/run.sh).").addText(
      (t) => t.setPlaceholder("/Users/you/Documents/ml/second-brain").setValue(plugin.settings.repoPath).onChange(async (v) => {
        plugin.settings.repoPath = v;
        await plugin.saveSettings();
      })
    ).addExtraButton(
      (b) => b.setIcon("checkmark").setTooltip("Test repo path").onClick(() => {
        const err = plugin.preflight();
        new import_obsidian.Notice(err != null ? err : "Repo path looks good \u2713", 6e3);
      })
    );
    new import_obsidian.Setting(containerEl).setName("Claude binary path").setDesc("Full path to the claude CLI (passed as CLAUDE_BIN). GUI Obsidian usually can't find it on PATH.").addText(
      (t) => t.setPlaceholder(path.join(os.homedir(), ".local/bin/claude")).setValue(plugin.settings.claudePath).onChange(async (v) => {
        plugin.settings.claudePath = v;
        await plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Extra PATH entries").setDesc("Colon-separated dirs prepended to PATH when running (so claude and its deps resolve).").addText(
      (t) => t.setValue(plugin.settings.extraPath).onChange(async (v) => {
        plugin.settings.extraPath = v;
        await plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Extra Claude args").setDesc("Appended to the claude invocation, e.g. --model claude-opus-4-8.").addText(
      (t) => t.setPlaceholder("--model claude-opus-4-8").setValue(plugin.settings.extraClaudeArgs).onChange(async (v) => {
        plugin.settings.extraClaudeArgs = v;
        await plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Vault wiring" });
    const envSetting = new import_obsidian.Setting(containerEl).setName(".env.local");
    this.refreshEnvDesc(envSetting);
    envSetting.addButton(
      (b) => b.setButtonText("Point at this vault").onClick(async () => {
        const err = plugin.writeEnvLocal();
        new import_obsidian.Notice(err != null ? err : `.env.local now points at ${plugin.vaultPath()}`, 6e3);
        this.refreshEnvDesc(envSetting);
      })
    );
    containerEl.createEl("h3", { text: "Behavior" });
    new import_obsidian.Setting(containerEl).setName("Confirm before running").setDesc("Show a confirmation dialog before each run.").addToggle(
      (t) => t.setValue(plugin.settings.confirmBeforeRun).onChange(async (v) => {
        plugin.settings.confirmBeforeRun = v;
        await plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Auto-open output panel").addToggle(
      (t) => t.setValue(plugin.settings.autoOpenPanel).onChange(async (v) => {
        plugin.settings.autoOpenPanel = v;
        await plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Show ribbon icon").setDesc("Adds a ribbon button that opens a workflow picker. Reload to apply.").addToggle(
      (t) => t.setValue(plugin.settings.showRibbon).onChange(async (v) => {
        plugin.settings.showRibbon = v;
        await plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Notifications").setDesc("Start/finish Notices.").addToggle(
      (t) => t.setValue(plugin.settings.notifications).onChange(async (v) => {
        plugin.settings.notifications = v;
        await plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Run timeout (minutes)").setDesc("Kill a run after this many minutes. 0 = no limit.").addText(
      (t) => t.setValue(String(plugin.settings.timeoutMinutes)).onChange(async (v) => {
        const n = Number(v);
        plugin.settings.timeoutMinutes = Number.isFinite(n) && n >= 0 ? n : 0;
        await plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Enabled commands" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Untick to hide a workflow from the command palette. Reload the plugin to apply."
    });
    for (const wf of WORKFLOWS) {
      new import_obsidian.Setting(containerEl).setName(wf.label).addToggle(
        (t) => t.setValue(plugin.settings.enabled[wf.id] !== false).onChange(async (v) => {
          plugin.settings.enabled[wf.id] = v;
          await plugin.saveSettings();
        })
      );
    }
  }
  refreshEnvDesc(setting) {
    var _a, _b;
    const repo = this.plugin.settings.repoPath.trim();
    const envPath = repo ? path.join(repo, ".env.local") : "";
    if (envPath && fs.existsSync(envPath)) {
      let vp = "";
      try {
        vp = (_b = ((_a = fs.readFileSync(envPath, "utf8").match(/VAULT_PATH=(.*)/)) != null ? _a : [])[1]) != null ? _b : "";
      } catch (e) {
      }
      setting.setDesc(`Present \u2014 VAULT_PATH=${vp || "(unreadable)"}`);
    } else {
      setting.setDesc("Missing \u2014 runs will abort until this is created.");
    }
  }
};
