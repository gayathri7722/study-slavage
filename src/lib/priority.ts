/**
 * Rule-based prioritization engine. Pure functions, no AI: every score is
 * computed from the student's own inputs so it can be explained line by line.
 */

export type Importance = 1 | 2 | 3 | 4; // Low, Medium, High, Critical
export type Difficulty = 1 | 2 | 3; // Easy, Medium, Hard
export type TaskStatus = "todo" | "doing" | "done";
export type PriorityTier = "must" | "should" | "low";

export type TopicInput = {
  id: string;
  subject: string;
  name: string;
  examDate: string; // yyyy-mm-dd
  importance: Importance;
  prep: number; // 0-100
  difficulty: Difficulty;
  estHours: number; // hours to fully learn from zero-ish
};

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

export const TIER_INFO: Record<PriorityTier, { label: string; emoji: string; tone: "primary" | "warning" | "muted"; klass: string; dot: string }> = {
  must: { label: "MUST KNOW", emoji: "🔴", tone: "primary", klass: "border-primary/40 bg-primary/10", dot: "bg-primary" },
  should: { label: "SHOULD KNOW", emoji: "🟡", tone: "warning", klass: "border-warning/40 bg-warning/10", dot: "bg-warning" },
  low: { label: "LOW PRIORITY", emoji: "⚪", tone: "muted", klass: "border-border bg-surface", dot: "bg-muted-foreground" },
};

export const WEIGHTS = {
  urgency: 0.25,
  importance: 0.25,
  gap: 0.2,
  difficulty: 0.1,
  timeFit: 0.2,
};

export type ScoredTopic = TopicInput & {
  days: number | null;
  needMin: number; // minutes still required
  factors: { urgency: number; importance: number; gap: number; difficulty: number; timeFit: number };
  score: number; // 0-100
  tier: PriorityTier;
  why: string;
  status: TaskStatus;
};

export type PlanBlock = {
  topicId: string | null;
  title: string;
  minutes: number;
  kind: "recall" | "learn" | "practice" | "review";
  note: string;
  partial?: boolean;
};

export type Analysis = {
  availableMin: number;
  mode: "emergency" | "compressed" | "detailed";
  topics: ScoredTopic[];
  totalNeedMin: number;
  remainingNeedMin: number;
  shortageMin: number;
  blocks: PlanBlock[];
  plannedMin: number;
  dropped: ScoredTopic[];
  readiness: number; // 0-100 recovery progress
  top: ScoredTopic | null;
  nearestDays: number | null;
};

export const newTopicId = () => `t_${Math.random().toString(36).slice(2, 9)}`;

export function daysUntil(date: string, now = new Date()): number | null {
  if (!date) return null;
  const d = new Date(date + "T23:59:00");
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function urgencyOf(days: number | null) {
  if (days === null) return 0.5;
  if (days <= 1) return 1;
  if (days <= 3) return 0.8;
  if (days <= 7) return 0.55;
  if (days <= 14) return 0.35;
  return 0.2;
}

export function formatMin(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function daysText(days: number | null) {
  if (days === null) return "no date set";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function needMinutes(t: TopicInput) {
  return Math.max(10, Math.round(t.estHours * 60 * (1 - t.prep / 100)));
}

function explain(t: ScoredTopic, scarce: boolean): string {
  const r: string[] = [];
  if (t.days !== null && t.days <= 3) r.push(`your exam is ${daysText(t.days)}`);
  if (t.prep <= 40) r.push(`preparation is only ${t.prep}%`);
  if (t.importance >= 3) r.push(`this topic has ${IMPORTANCE_LABEL[t.importance].toLowerCase()} importance`);
  if (t.difficulty === 3) r.push("it's a hard topic that needs time to land");
  if (scarce && t.needMin <= 45) r.push(`it only needs about ${formatMin(t.needMin)} — a fast win`);
  if (r.length === 0) r.push(`it scores ${t.score}/100 on deadline, importance and preparation gap`);
  const label = t.tier === "must" ? "Must Know" : t.tier === "should" ? "Should Know" : "Low Priority";
  const joined = r.length > 1 ? `${r.slice(0, -1).join(", ")}, and ${r[r.length - 1]}` : r[0];
  return `${label} because ${joined}.`;
}

export function analyze(
  items: TopicInput[],
  availableHours: number,
  statuses: Record<string, TaskStatus> = {},
): Analysis {
  const availableMin = Math.max(0, Math.round(availableHours * 60));
  const base = items.filter((t) => t.name.trim());
  const totalNeedMin = base.reduce((s, t) => s + needMinutes(t), 0);
  const scarce = totalNeedMin > availableMin;

  const topics: ScoredTopic[] = base
    .map((t) => {
      const days = daysUntil(t.examDate);
      const needMin = needMinutes(t);
      const factors = {
        urgency: urgencyOf(days),
        importance: t.importance / 4,
        gap: (100 - t.prep) / 100,
        difficulty: t.difficulty / 3,
        // Fits comfortably in the time you have → higher. Matters most when time is scarce.
        timeFit: availableMin > 0 ? 1 - Math.min(1, needMin / availableMin) : 0,
      };
      const score = Math.round(
        100 *
          (WEIGHTS.urgency * factors.urgency +
            WEIGHTS.importance * factors.importance +
            WEIGHTS.gap * factors.gap +
            WEIGHTS.difficulty * factors.difficulty +
            WEIGHTS.timeFit * factors.timeFit),
      );
      const tier: PriorityTier = score >= 62 ? "must" : score >= 45 ? "should" : "low";
      const s: ScoredTopic = { ...t, days, needMin, factors, score, tier, why: "", status: statuses[t.id] ?? "todo" };
      s.why = explain(s, scarce);
      return s;
    })
    .sort((a, b) => b.score - a.score);

  // Guarantee at least one Must Know so the student always has a starting point.
  if (topics.length && !topics.some((t) => t.tier === "must")) {
    topics[0].tier = "must";
    topics[0].why = explain(topics[0], scarce);
  }

  const mode: Analysis["mode"] = availableMin <= 30 ? "emergency" : availableMin <= 180 ? "compressed" : "detailed";
  const open = topics.filter((t) => t.status !== "done");
  const blocks: PlanBlock[] = [];
  const dropped: ScoredTopic[] = [];

  if (mode === "emergency") {
    const t = open[0];
    if (t && availableMin > 0) {
      const total = availableMin;
      const recall = Math.max(2, Math.round(total * 0.2));
      const review = Math.max(2, Math.round(total * 0.15));
      const practice = Math.max(3, Math.round(total * 0.3));
      const learn = Math.max(3, total - recall - review - practice);
      blocks.push(
        { topicId: t.id, title: `Brain dump: ${t.name}`, minutes: recall, kind: "recall", note: "Write everything you already know. No notes." },
        { topicId: t.id, title: `Core idea of ${t.name}`, minutes: learn, kind: "learn", note: "Only the definition/formula most likely to be examined.", partial: true },
        { topicId: t.id, title: `One exam-style question on ${t.name}`, minutes: practice, kind: "practice", note: "Attempt it closed-book, then check." },
        { topicId: t.id, title: "3-line summary", minutes: review, kind: "review", note: "What you'll write first in the exam." },
      );
      dropped.push(...open.slice(1));
    }
  } else {
    const reviewMin = mode === "detailed" ? Math.round(availableMin * 0.1) : Math.min(15, Math.round(availableMin * 0.08));
    const practiceShare = mode === "detailed" ? 0.25 : 0.15;
    let left = availableMin - reviewMin;
    // Compressed plans skip low-priority topics entirely and cover core-only depth.
    const candidates = mode === "compressed" ? open.filter((t) => t.tier !== "low") : open;
    const depth = mode === "compressed" ? 0.65 : 1;
    for (const t of candidates) {
      if (left < 10) {
        dropped.push(t);
        continue;
      }
      const want = Math.max(10, Math.round(t.needMin * depth));
      const give = Math.min(want, left);
      const partial = give < t.needMin;
      const practice = give >= 30 ? Math.round(give * practiceShare) : 0;
      blocks.push({
        topicId: t.id,
        title: `${t.name}${t.subject ? ` · ${t.subject}` : ""}`,
        minutes: give - practice,
        kind: "learn",
        note: partial
          ? mode === "compressed"
            ? "Core concepts only — skip edge cases and long derivations."
            : "Partial coverage: highest-yield subsections first."
          : "Full coverage.",
        partial,
      });
      if (practice) blocks.push({ topicId: t.id, title: `Practice: ${t.name}`, minutes: practice, kind: "practice", note: "Past-paper style questions, timed." });
      left -= give;
    }
    if (mode === "compressed") dropped.push(...open.filter((t) => t.tier === "low"));
    if (blocks.length) blocks.push({ topicId: null, title: "Final review of Must Know topics", minutes: reviewMin + Math.max(0, left), kind: "review", note: "Flashcard yourself on formulas and definitions." });
  }

  const plannedMin = blocks.reduce((s, b) => s + b.minutes, 0);
  const remainingNeedMin = topics.reduce(
    (s, t) => s + (t.status === "done" ? 0 : t.status === "doing" ? t.needMin / 2 : t.needMin),
    0,
  );
  const estSum = topics.reduce((s, t) => s + t.estHours, 0) || 1;
  const readiness = Math.round(
    topics.reduce((s, t) => {
      const p = t.status === "done" ? 100 : t.status === "doing" ? (t.prep + 100) / 2 : t.prep;
      return s + t.estHours * p;
    }, 0) / estSum,
  );
  const dayList = topics.map((t) => t.days).filter((d): d is number => d !== null);

  return {
    availableMin,
    mode,
    topics,
    totalNeedMin,
    remainingNeedMin: Math.round(remainingNeedMin),
    shortageMin: Math.max(0, Math.round(remainingNeedMin) - availableMin),
    blocks,
    plannedMin,
    dropped,
    readiness: topics.length ? readiness : 0,
    top: open[0] ?? null,
    nearestDays: dayList.length ? Math.min(...dayList) : null,
  };
}
