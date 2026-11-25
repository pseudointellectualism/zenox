import "server-only";
import fs from "fs";
import path from "path";

/**
 * Redeploy coordination.
 *
 * The application cannot deploy itself. It runs as the unprivileged `zenox`
 * user under a unit with `NoNewPrivileges=yes`, so `sudo` and `systemctl` are
 * unavailable to it by design — and that hardening is worth keeping, because a
 * web process that can escalate is a web process that can be escalated through.
 *
 * So the trigger is a file, not a command. This module drops an EMPTY marker in
 * the data directory; a root-owned systemd path unit watches for it and runs
 * the deploy. Nothing the panel writes is ever read back by the root side, so
 * there is no channel through which a request could smuggle instructions: the
 * privileged script takes no arguments and has exactly one thing it knows how
 * to do.
 *
 * Ownership of each file is single-writer, which is what keeps the two
 * processes from racing:
 *
 *   deploy.request     written here, deleted by the root runner
 *   deploy-state.json  written ONLY by the root runner, read here
 *   deploy.log         written ONLY by the root runner, read here
 *   deploy-meta.json   written and read here, never touched by root
 */

export type DeployStatus = "idle" | "queued" | "deploying" | "success" | "failed";

const APP_ROOT = process.cwd();
const DATA_DIR = path.join(APP_ROOT, "data");

const REQUEST_FILE = path.join(DATA_DIR, "deploy.request");
const STATE_FILE = path.join(DATA_DIR, "deploy-state.json");
const LOG_FILE = path.join(DATA_DIR, "deploy.log");
const META_FILE = path.join(DATA_DIR, "deploy-meta.json");

/**
 * How long a request may sit unclaimed before we stop believing in it. The path
 * unit fires within milliseconds when it is installed, so anything past this
 * means it is not installed, not enabled, or not running.
 */
const QUEUE_STALE_MS = 120_000;

/** Ceiling on a single run. Dependencies plus a Next build take minutes, not tens of them. */
const DEPLOY_STALE_MS = 30 * 60_000;

/** Only the tail is sent to the browser; a failed build can produce megabytes. */
const LOG_TAIL_BYTES = 64 * 1024;

/** Shape written by the root runner. Every field is a primitive we control. */
interface RunnerState {
  status?: string;
  runId?: string;
  startedAt?: number;
  finishedAt?: number;
  exitCode?: number;
  commit?: string;
  previousCommit?: string;
}

interface RequestMeta {
  requestedBy?: string;
  requestedAt?: number;
}

export interface DeployState {
  status: DeployStatus;
  runId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  exitCode: number | null;
  /** Commit the last completed run landed on. */
  commit: string | null;
  previousCommit: string | null;
  requestedBy: string | null;
  requestedAt: number | null;
  /** True while a run is queued or in flight, so the UI can disable the button. */
  busy: boolean;
  /**
   * Set when a request has gone unclaimed past QUEUE_STALE_MS, which in
   * practice means the systemd hook is missing on this host.
   */
  hookUnresponsive: boolean;
}

function readJson<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
}

function requestedAtMs(): number | null {
  try {
    return fs.statSync(REQUEST_FILE).mtimeMs;
  } catch {
    return null;
  }
}

function normaliseStatus(value: string | undefined): DeployStatus {
  if (value === "deploying" || value === "success" || value === "failed" || value === "queued") {
    return value;
  }
  return "idle";
}

/**
 * Current state, reconciled from the two independent writers.
 *
 * A pending marker outranks a finished run: the marker is only ever removed by
 * the runner as it starts, so while it is still on disk the previous result is
 * stale news.
 */
export function getDeployState(): DeployState {
  const runner = readJson<RunnerState>(STATE_FILE) ?? {};
  const meta = readJson<RequestMeta>(META_FILE) ?? {};
  const pendingAt = requestedAtMs();
  const now = Date.now();

  let status = normaliseStatus(runner.status);
  let hookUnresponsive = false;

  if (status === "deploying") {
    const startedAt = runner.startedAt ?? 0;
    // A run that outlives the ceiling had its process killed, or the machine
    // rebooted mid-deploy. Either way nothing is coming, so release the lock
    // rather than leaving the panel wedged until someone signs in over SSH.
    if (startedAt > 0 && now - startedAt > DEPLOY_STALE_MS) {
      status = "failed";
    }
  } else if (pendingAt !== null) {
    status = "queued";
    hookUnresponsive = now - pendingAt > QUEUE_STALE_MS;
  }

  const busy = (status === "queued" && !hookUnresponsive) || status === "deploying";

  return {
    status,
    runId: typeof runner.runId === "string" ? runner.runId : null,
    startedAt: typeof runner.startedAt === "number" ? runner.startedAt : null,
    finishedAt: typeof runner.finishedAt === "number" ? runner.finishedAt : null,
    exitCode: typeof runner.exitCode === "number" ? runner.exitCode : null,
    commit: typeof runner.commit === "string" ? runner.commit : null,
    previousCommit: typeof runner.previousCommit === "string" ? runner.previousCommit : null,
    requestedBy: typeof meta.requestedBy === "string" ? meta.requestedBy : null,
    requestedAt: typeof meta.requestedAt === "number" ? meta.requestedAt : pendingAt,
    busy,
    hookUnresponsive,
  };
}

export type RequestOutcome =
  | { ok: true }
  | { ok: false; code: "busy" | "unwritable"; message: string };

/**
 * Queues a deploy by creating the marker file.
 *
 * The marker is empty on purpose. The root runner never reads it, so a caller
 * cannot influence what runs — only whether it runs.
 */
export function requestDeploy(requestedBy: string): RequestOutcome {
  const state = getDeployState();
  if (state.busy) {
    return {
      ok: false,
      code: "busy",
      message:
        state.status === "deploying"
          ? "A deployment is already running."
          : "A deployment is already queued.",
    };
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // Written first: if the marker landed and this did not, the panel would
    // show a deploy with no requester rather than a requester with no deploy.
    fs.writeFileSync(
      META_FILE,
      JSON.stringify({ requestedBy, requestedAt: Date.now() }, null, 2),
      "utf-8",
    );
    fs.writeFileSync(REQUEST_FILE, "", "utf-8");
    return { ok: true };
  } catch (err) {
    console.error("[DeployStore] Could not queue a deployment:", err);
    return {
      ok: false,
      code: "unwritable",
      message: "The server could not write the deploy request file.",
    };
  }
}

/** Tail of the current or most recent run output. Empty string when there is none. */
export function readDeployLog(): string {
  try {
    const stat = fs.statSync(LOG_FILE);
    const start = Math.max(0, stat.size - LOG_TAIL_BYTES);
    const fd = fs.openSync(LOG_FILE, "r");
    try {
      const length = stat.size - start;
      if (length <= 0) return "";
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, start);
      const text = buffer.toString("utf-8");
      // A mid-file start almost certainly lands inside a line; drop the fragment.
      return start > 0 ? text.slice(text.indexOf("\n") + 1) : text;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return "";
  }
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  branch: string;
}

/**
 * The commit this process is serving, read straight out of the git directory.
 *
 * Deliberately parsed rather than shelled out to: spawning git from a request
 * handler is a subprocess the app does not otherwise need, and the answer is
 * two small files away.
 */
export function readCurrentCommit(): CommitInfo | null {
  const gitDir = path.join(APP_ROOT, ".git");

  const describe = (hash: string, branch: string): CommitInfo | null => {
    if (!/^[0-9a-f]{40}$/.test(hash)) return null;
    return { hash, shortHash: hash.slice(0, 7), branch };
  };

  try {
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf-8").trim();

    if (!head.startsWith("ref: ")) {
      return describe(head, "detached");
    }

    const ref = head.slice(5).trim();
    const branch = ref.replace(/^refs\/heads\//, "");

    const loosePath = path.join(gitDir, ref);
    if (fs.existsSync(loosePath)) {
      return describe(fs.readFileSync(loosePath, "utf-8").trim(), branch);
    }

    // Falls back to packed-refs, where git parks refs after a garbage collect.
    const packed = fs.readFileSync(path.join(gitDir, "packed-refs"), "utf-8");
    for (const line of packed.split("\n")) {
      if (line.startsWith("#")) continue;
      const [hash, name] = line.trim().split(/\s+/);
      if (name === ref) return describe(hash, branch);
    }
    return null;
  } catch {
    return null;
  }
}
