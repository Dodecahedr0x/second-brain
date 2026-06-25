import {
  App,
  FileSystemAdapter,
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SuggestModal,
  WorkspaceLeaf,
} from "obsidian";
import { spawn, ChildProcess } from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

const VIEW_TYPE_OUTPUT = "second-brain-output";

/**
 * A single workflow exposed as a command. `spec` is the path passed to
 * `scripts/run.sh` ($1), relative to `.agents/`. `undefined` => default loop.
 */
interface Workflow {
  id: string;
  label: string;
  script: "run.sh" | "retry-failed.sh";
  spec?: string;
  needsUrl?: boolean;
}

const WORKFLOWS: Workflow[] = [
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
  { id: "retry-failed", label: "Retry failed items", script: "retry-failed.sh" },
];

interface SBSettings {
  repoPath: string;
  claudePath: string;
  extraPath: string;
  extraClaudeArgs: string;
  confirmBeforeRun: boolean;
  autoOpenPanel: boolean;
  showRibbon: boolean;
  notifications: boolean;
  timeoutMinutes: number;
  enabled: Record<string, boolean>;
}

function defaultEnabled(): Record<string, boolean> {
  const e: Record<string, boolean> = {};
  for (const w of WORKFLOWS) e[w.id] = true;
  return e;
}

const DEFAULT_SETTINGS: SBSettings = {
  repoPath: "",
  claudePath: path.join(os.homedir(), ".local", "bin", "claude"),
  extraPath: `${path.join(os.homedir(), ".local", "bin")}:/opt/homebrew/bin:/usr/local/bin`,
  extraClaudeArgs: "",
  confirmBeforeRun: false,
  autoOpenPanel: true,
  showRibbon: true,
  notifications: true,
  timeoutMinutes: 0,
  enabled: defaultEnabled(),
};

export default class SecondBrainPlugin extends Plugin {
  settings: SBSettings;
  child: ChildProcess | null = null;
  runningLabel: string | null = null;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_OUTPUT, (leaf) => new OutputView(leaf, this));

    for (const wf of WORKFLOWS) {
      if (this.settings.enabled[wf.id] === false) continue;
      this.addCommand({
        id: wf.id,
        name: wf.label,
        callback: () => this.trigger(wf),
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

  async trigger(wf: Workflow) {
    if (this.child) {
      new Notice(`A workflow is already running: ${this.runningLabel}`);
      return;
    }
    const err = this.preflight();
    if (err) {
      new Notice(err, 8000);
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

  maybeConfirmAndRun(wf: Workflow, extra?: string) {
    if (this.settings.confirmBeforeRun) {
      new ConfirmModal(this.app, `Run "${wf.label}"?`, () => this.run(wf, extra)).open();
    } else {
      this.run(wf, extra);
    }
  }

  /** Returns an error string if the run cannot start, else null. */
  preflight(): string | null {
    const repo = this.settings.repoPath.trim();
    if (!repo) return "Set the repo path in Second Brain settings first.";
    if (!fs.existsSync(repo)) return `Repo path does not exist: ${repo}`;
    if (!fs.existsSync(path.join(repo, "scripts", "run.sh")))
      return `scripts/run.sh not found under repo path: ${repo}`;
    if (!fs.existsSync(path.join(repo, ".env.local")))
      return "No .env.local in the repo. Open Second Brain settings and click “Point at this vault”.";
    return null;
  }

  async run(wf: Workflow, extra?: string) {
    const repo = this.settings.repoPath.trim();
    const scriptPath = path.join(repo, "scripts", wf.script);

    const view = await this.ensureView();

    const env: NodeJS.ProcessEnv = { ...process.env };
    if (this.settings.extraPath.trim()) {
      env.PATH = `${this.settings.extraPath.trim()}:${env.PATH ?? ""}`;
    }
    if (this.settings.claudePath.trim()) env.CLAUDE_BIN = this.settings.claudePath.trim();
    if (this.settings.extraClaudeArgs.trim()) env.CLAUDE_EXTRA_ARGS = this.settings.extraClaudeArgs.trim();

    const args: string[] = [scriptPath];
    if (wf.script === "run.sh") {
      args.push(wf.spec ?? ""); // $1 spec ("" => default loop)
      if (extra) args.push(extra); // $2 extra context
    }

    view.start(wf.label);
    view.append(`$ bash ${args.map(quote).join(" ")}\n\n`);
    if (this.settings.notifications) new Notice(`Started: ${wf.label}`);

    let child: ChildProcess;
    try {
      child = spawn("bash", args, { cwd: repo, env, detached: true });
    } catch (e) {
      view.finish(-1, String(e));
      new Notice(`Failed to start: ${String(e)}`, 8000);
      return;
    }

    this.child = child;
    this.runningLabel = wf.label;

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (this.settings.timeoutMinutes > 0) {
      timer = setTimeout(() => {
        view.append(`\n[timeout after ${this.settings.timeoutMinutes} min — killing run]\n`);
        this.killRun();
      }, this.settings.timeoutMinutes * 60_000);
    }

    child.stdout?.on("data", (d: Buffer) => view.append(d.toString()));
    child.stderr?.on("data", (d: Buffer) => view.append(d.toString()));
    child.on("error", (e) => view.append(`\n[spawn error] ${String(e)}\n`));
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      this.child = null;
      this.runningLabel = null;
      view.finish(code ?? -1);
      if (this.settings.notifications) {
        new Notice(code === 0 ? `Done: ${wf.label}` : `Failed (${code}): ${wf.label}`);
      }
    });
  }

  killRun() {
    if (!this.child || this.child.pid == null) return;
    try {
      // detached:true => child is a process-group leader; kill the whole group.
      process.kill(-this.child.pid, "SIGTERM");
    } catch {
      try {
        this.child.kill("SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }

  // ---- view helpers ------------------------------------------------------

  async ensureView(): Promise<OutputView> {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_OUTPUT)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: VIEW_TYPE_OUTPUT, active: true });
    }
    if (this.settings.autoOpenPanel) this.app.workspace.revealLeaf(leaf);
    return leaf.view as OutputView;
  }

  vaultPath(): string {
    const adapter = this.app.vault.adapter;
    return adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
  }

  writeEnvLocal(): string | null {
    const repo = this.settings.repoPath.trim();
    if (!repo || !fs.existsSync(repo)) return "Set a valid repo path first.";
    const vp = this.vaultPath();
    if (!vp) return "Could not determine the vault path.";
    try {
      fs.writeFileSync(path.join(repo, ".env.local"), `VAULT_PATH=${vp}\n`);
      return null;
    } catch (e) {
      return `Could not write .env.local: ${String(e)}`;
    }
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.settings.enabled = Object.assign({}, defaultEnabled(), data?.enabled ?? {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

function quote(s: string): string {
  if (s === "") return "''";
  return /[\s"'$]/.test(s) ? `'${s.replace(/'/g, "'\\''")}'` : s;
}

async function readClipboard(): Promise<string> {
  try {
    const txt = await navigator.clipboard.readText();
    return /^https?:\/\//i.test(txt.trim()) ? txt.trim() : "";
  } catch {
    return "";
  }
}

// ---- output panel --------------------------------------------------------

class OutputView extends ItemView {
  plugin: SecondBrainPlugin;
  private pre: HTMLElement;
  private statusEl: HTMLElement;
  private timerEl: HTMLElement;
  private stopBtn: HTMLButtonElement;
  private started = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: SecondBrainPlugin) {
    super(leaf);
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

  start(label: string) {
    this.pre.empty();
    this.started = Date.now();
    this.statusEl.setText(`Running: ${label}`);
    this.statusEl.removeClass("sb-ok", "sb-fail");
    this.statusEl.addClass("sb-running");
    this.stopBtn.disabled = false;
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = setInterval(() => this.tick(), 1000);
    this.tick();
  }

  private tick() {
    const s = Math.floor((Date.now() - this.started) / 1000);
    const m = Math.floor(s / 60);
    this.timerEl.setText(`${m}m ${String(s % 60).padStart(2, "0")}s`);
  }

  append(text: string) {
    const atBottom =
      this.pre.scrollTop + this.pre.clientHeight >= this.pre.scrollHeight - 4;
    this.pre.appendText(text);
    if (atBottom) this.pre.scrollTop = this.pre.scrollHeight;
  }

  finish(code: number, errText?: string) {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.stopBtn.disabled = true;
    this.statusEl.removeClass("sb-running");
    if (code === 0) {
      this.statusEl.addClass("sb-ok");
      this.statusEl.setText("Done ✓");
    } else {
      this.statusEl.addClass("sb-fail");
      this.statusEl.setText(`Failed (exit ${code})`);
    }
    if (errText) this.append(`\n${errText}\n`);
  }
}

// ---- modals --------------------------------------------------------------

class UrlModal extends Modal {
  constructor(app: App, private prefill: string, private onSubmit: (url: string) => void) {
    super(app);
  }
  onOpen() {
    this.titleEl.setText("Create source note from URL");
    const input = this.contentEl.createEl("input", {
      type: "text",
      cls: "sb-url-input",
      placeholder: "https://…",
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
}

class ConfirmModal extends Modal {
  constructor(app: App, private message: string, private onYes: () => void) {
    super(app);
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
}

class WorkflowPicker extends SuggestModal<Workflow> {
  constructor(app: App, private plugin: SecondBrainPlugin) {
    super(app);
    this.setPlaceholder("Run a second-brain workflow…");
  }
  getSuggestions(query: string): Workflow[] {
    const q = query.toLowerCase();
    return WORKFLOWS.filter(
      (w) => this.plugin.settings.enabled[w.id] !== false && w.label.toLowerCase().includes(q)
    );
  }
  renderSuggestion(wf: Workflow, el: HTMLElement) {
    el.createEl("div", { text: wf.label });
    el.createEl("small", { text: wf.spec ?? wf.script });
  }
  onChooseSuggestion(wf: Workflow) {
    this.plugin.trigger(wf);
  }
}

// ---- settings ------------------------------------------------------------

class SBSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SecondBrainPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl, plugin } = this;
    containerEl.empty();

    containerEl.createEl("h3", { text: "Paths & execution" });

    new Setting(containerEl)
      .setName("Repo path")
      .setDesc("Disk path to the second-brain repo (contains scripts/run.sh).")
      .addText((t) =>
        t
          .setPlaceholder("/Users/you/Documents/ml/second-brain")
          .setValue(plugin.settings.repoPath)
          .onChange(async (v) => {
            plugin.settings.repoPath = v;
            await plugin.saveSettings();
          })
      )
      .addExtraButton((b) =>
        b
          .setIcon("checkmark")
          .setTooltip("Test repo path")
          .onClick(() => {
            const err = plugin.preflight();
            new Notice(err ?? "Repo path looks good ✓", 6000);
          })
      );

    new Setting(containerEl)
      .setName("Claude binary path")
      .setDesc("Full path to the claude CLI (passed as CLAUDE_BIN). GUI Obsidian usually can't find it on PATH.")
      .addText((t) =>
        t
          .setPlaceholder(path.join(os.homedir(), ".local/bin/claude"))
          .setValue(plugin.settings.claudePath)
          .onChange(async (v) => {
            plugin.settings.claudePath = v;
            await plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Extra PATH entries")
      .setDesc("Colon-separated dirs prepended to PATH when running (so claude and its deps resolve).")
      .addText((t) =>
        t
          .setValue(plugin.settings.extraPath)
          .onChange(async (v) => {
            plugin.settings.extraPath = v;
            await plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Extra Claude args")
      .setDesc("Appended to the claude invocation, e.g. --model claude-opus-4-8.")
      .addText((t) =>
        t
          .setPlaceholder("--model claude-opus-4-8")
          .setValue(plugin.settings.extraClaudeArgs)
          .onChange(async (v) => {
            plugin.settings.extraClaudeArgs = v;
            await plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Vault wiring" });

    const envSetting = new Setting(containerEl).setName(".env.local");
    this.refreshEnvDesc(envSetting);
    envSetting.addButton((b) =>
      b.setButtonText("Point at this vault").onClick(async () => {
        const err = plugin.writeEnvLocal();
        new Notice(err ?? `.env.local now points at ${plugin.vaultPath()}`, 6000);
        this.refreshEnvDesc(envSetting);
      })
    );

    containerEl.createEl("h3", { text: "Behavior" });

    new Setting(containerEl)
      .setName("Confirm before running")
      .setDesc("Show a confirmation dialog before each run.")
      .addToggle((t) =>
        t.setValue(plugin.settings.confirmBeforeRun).onChange(async (v) => {
          plugin.settings.confirmBeforeRun = v;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Auto-open output panel")
      .addToggle((t) =>
        t.setValue(plugin.settings.autoOpenPanel).onChange(async (v) => {
          plugin.settings.autoOpenPanel = v;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show ribbon icon")
      .setDesc("Adds a ribbon button that opens a workflow picker. Reload to apply.")
      .addToggle((t) =>
        t.setValue(plugin.settings.showRibbon).onChange(async (v) => {
          plugin.settings.showRibbon = v;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Notifications")
      .setDesc("Start/finish Notices.")
      .addToggle((t) =>
        t.setValue(plugin.settings.notifications).onChange(async (v) => {
          plugin.settings.notifications = v;
          await plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Run timeout (minutes)")
      .setDesc("Kill a run after this many minutes. 0 = no limit.")
      .addText((t) =>
        t
          .setValue(String(plugin.settings.timeoutMinutes))
          .onChange(async (v) => {
            const n = Number(v);
            plugin.settings.timeoutMinutes = Number.isFinite(n) && n >= 0 ? n : 0;
            await plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Enabled commands" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Untick to hide a workflow from the command palette. Reload the plugin to apply.",
    });
    for (const wf of WORKFLOWS) {
      new Setting(containerEl).setName(wf.label).addToggle((t) =>
        t.setValue(plugin.settings.enabled[wf.id] !== false).onChange(async (v) => {
          plugin.settings.enabled[wf.id] = v;
          await plugin.saveSettings();
        })
      );
    }
  }

  private refreshEnvDesc(setting: Setting) {
    const repo = this.plugin.settings.repoPath.trim();
    const envPath = repo ? path.join(repo, ".env.local") : "";
    if (envPath && fs.existsSync(envPath)) {
      let vp = "";
      try {
        vp = (fs.readFileSync(envPath, "utf8").match(/VAULT_PATH=(.*)/) ?? [])[1] ?? "";
      } catch {
        /* ignore */
      }
      setting.setDesc(`Present — VAULT_PATH=${vp || "(unreadable)"}`);
    } else {
      setting.setDesc("Missing — runs will abort until this is created.");
    }
  }
}
