import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { generateStudyPlan } from "./plan.functions";
import type { StudyPlan } from "./plan-types";
import { EXPLAIN_STYLES, MIRACLE_STEPS, PHASES, TOPICS } from "./mock";

export type Assessment = {
  situations: string[];
  time: string;
  subject: string;
  examName: string;
  deadline: string;
  progress: number;
  targetGrade: string;
  topics: string;
  difficulty: string;
  hours: string;
  fileName: string;
  mistakes: string[];
};

export const blankAssessment: Assessment = {
  situations: [],
  time: "",
  subject: "",
  examName: "",
  deadline: "",
  progress: 0,
  targetGrade: "Pass comfortably (65%+)",
  topics: "",
  difficulty: "Hard",
  hours: "",
  fileName: "",
  mistakes: [],
};

export type PlanStatus = "idle" | "loading" | "ready" | "error";

/** One self-contained emergency: its own assessment, plan, missions and progress. */
export type EmergencyRecord = {
  id: string;
  createdAt: number;
  isDemo: boolean;
  assessment: Assessment;
  plan: StudyPlan | null;
  planStatus: PlanStatus;
  planError: string | null;
  missionsDone: number;
};

/** Card shape consumed by the dashboard. */
export type Emergency = {
  id: string;
  subject: string;
  title: string;
  timeLeft: string;
  recovery: number;
  severity: "critical" | "high" | "medium";
  isDemo: boolean;
};

type PersistedState = {
  name: string;
  activeId: string | null;
  records: EmergencyRecord[];
};

const STORAGE_KEY = "aer.state.v1";

/**
 * Single storage boundary. Today it's the browser; swapping in a database later
 * only means replacing these two functions with server calls.
 */
function loadState(): PersistedState {
  if (typeof window === "undefined") return { name: "", activeId: null, records: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { name: "", activeId: null, records: [] };
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      activeId: parsed.activeId ?? null,
      records: Array.isArray(parsed.records)
        ? parsed.records.map((r) => ({
            ...r,
            // never restore a transient state
            planStatus: r.plan ? "ready" : "idle",
            planError: null,
          }))
        : [],
    };
  } catch {
    return { name: "", activeId: null, records: [] };
  }
}

function saveState(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — app still works in memory */
  }
}

const newId = () => `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function demoRecord(): EmergencyRecord {
  const assessment: Assessment = {
    situations: ["exam-tomorrow", "behind-syllabus"],
    time: "4 hours",
    subject: "Calculus II",
    examName: "Midterm 2 — Integration",
    deadline: "Tomorrow, 9:00 AM",
    progress: 25,
    targetGrade: "Pass comfortably (65%+)",
    topics: "Integration by parts, definite integrals, u-substitution, partial fractions",
    difficulty: "Hard",
    hours: "6",
    fileName: "",
    mistakes: ["procrastinated", "underestimated"],
  };
  return {
    id: newId(),
    createdAt: Date.now(),
    isDemo: true,
    assessment,
    planStatus: "ready",
    planError: null,
    missionsDone: 0,
    plan: {
      subject: assessment.subject,
      headline: "Calculus II: severe, but survivable (sample)",
      summary:
        "This is sample data so you can explore the app. Start your own emergency for a plan built from your subject.",
      missionFocus: "Integration by parts",
      missionMinutes: 30,
      topics: TOPICS,
      phases: PHASES,
      miracleSteps: MIRACLE_STEPS,
      explanations: EXPLAIN_STYLES,
    },
  };
}

type Ctx = {
  hydrated: boolean;
  name: string;
  setName: (n: string) => void;
  /** Active emergency's assessment, or a blank one when there is none. */
  assessment: Assessment;
  activeEmergency: EmergencyRecord | null;
  hasEmergency: boolean;
  records: EmergencyRecord[];
  emergencies: Emergency[];
  setActiveEmergency: (id: string) => void;
  /** Creates a brand-new, isolated emergency and generates its plan. */
  createEmergency: (a: Assessment) => Promise<void>;
  deleteEmergency: (id: string) => void;
  loadSampleData: () => void;
  stuckOpen: boolean;
  setStuckOpen: (v: boolean) => void;
  missionsDone: number;
  completeMission: () => void;
  xp: number;
  plan: StudyPlan | null;
  planStatus: PlanStatus;
  planError: string | null;
  /** Regenerates the plan for the active emergency. */
  buildPlan: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [name, setNameState] = useState("");
  const [records, setRecords] = useState<EmergencyRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stuckOpen, setStuckOpen] = useState(false);
  const inflight = useRef<string | null>(null);

  useEffect(() => {
    const s = loadState();
    setNameState(s.name);
    setRecords(s.records);
    setActiveId(s.activeId && s.records.some((r) => r.id === s.activeId) ? s.activeId : null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ name, activeId, records });
  }, [hydrated, name, activeId, records]);

  const patch = useCallback((id: string, updates: Partial<EmergencyRecord>) => {
    setRecords((rs) => rs.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const activeEmergency = useMemo(
    () => records.find((r) => r.id === activeId) ?? null,
    [records, activeId],
  );

  const runPlan = useCallback(
    async (id: string, a: Assessment) => {
      if (inflight.current === id) return;
      inflight.current = id;
      patch(id, { planStatus: "loading", planError: null });
      try {
        const result = await generateStudyPlan({
          data: {
            subject: a.subject,
            examName: a.examName,
            deadline: a.deadline,
            time: a.time,
            topics: a.topics,
            difficulty: a.difficulty,
            hours: a.hours,
            targetGrade: a.targetGrade,
            progress: a.progress,
            situations: a.situations,
            mistakes: a.mistakes,
          },
        });
        patch(id, { plan: result, planStatus: "ready", planError: null });
      } catch (error) {
        console.error(error);
        patch(id, {
          planStatus: "error",
          planError:
            error instanceof Error ? error.message : "We couldn't build your plan right now.",
        });
      } finally {
        inflight.current = null;
      }
    },
    [patch],
  );

  const createEmergency = useCallback(
    async (a: Assessment) => {
      const id = newId();
      const record: EmergencyRecord = {
        id,
        createdAt: Date.now(),
        isDemo: false,
        assessment: a,
        plan: null,
        planStatus: "idle",
        planError: null,
        missionsDone: 0,
      };
      setRecords((rs) => [record, ...rs]);
      setActiveId(id);
      await runPlan(id, a);
    },
    [runPlan],
  );

  const buildPlan = useCallback(async () => {
    if (!activeEmergency) return;
    await runPlan(activeEmergency.id, activeEmergency.assessment);
  }, [activeEmergency, runPlan]);

  const deleteEmergency = useCallback((id: string) => {
    setRecords((rs) => rs.filter((r) => r.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const loadSampleData = useCallback(() => {
    const demo = demoRecord();
    setRecords((rs) => [demo, ...rs.filter((r) => !r.isDemo)]);
    setActiveId(demo.id);
  }, []);

  const completeMission = useCallback(() => {
    if (!activeEmergency) return;
    patch(activeEmergency.id, { missionsDone: activeEmergency.missionsDone + 1 });
  }, [activeEmergency, patch]);

  const emergencies = useMemo<Emergency[]>(
    () =>
      records.map((r) => {
        const severityScore = Math.min(
          96,
          100 - r.assessment.progress + r.assessment.situations.length * 4,
        );
        const recovery = Math.max(
          10,
          Math.round(r.assessment.progress + r.missionsDone * 8 + (r.plan ? 10 : 0)),
        );
        return {
          id: r.id,
          subject: r.assessment.subject || "Untitled subject",
          title: r.assessment.examName || "Unnamed assessment",
          timeLeft: r.assessment.deadline || r.assessment.time || "No deadline set",
          recovery: Math.min(99, recovery),
          severity: severityScore >= 80 ? "critical" : severityScore >= 55 ? "high" : "medium",
          isDemo: r.isDemo,
        };
      }),
    [records],
  );

  const missionsDone = activeEmergency?.missionsDone ?? 0;

  const value: Ctx = {
    hydrated,
    name,
    setName: setNameState,
    assessment: activeEmergency?.assessment ?? blankAssessment,
    activeEmergency,
    hasEmergency: records.length > 0,
    records,
    emergencies,
    setActiveEmergency: setActiveId,
    createEmergency,
    deleteEmergency,
    loadSampleData,
    stuckOpen,
    setStuckOpen,
    missionsDone,
    completeMission,
    xp: missionsDone * 120,
    plan: activeEmergency?.plan ?? null,
    planStatus: activeEmergency?.planStatus ?? "idle",
    planError: activeEmergency?.planError ?? null,
    buildPlan,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
