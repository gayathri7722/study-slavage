import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, FileUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Bar, Btn, Chip, Panel } from "@/components/ui-kit";
import { MISTAKES, SITUATIONS, TIME_OPTIONS } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Assessment — Academic Emergency Room" },
      {
        name: "description",
        content:
          "Four quick steps: what's happening, how much time you have, what you're saving, and what went wrong.",
      },
      { property: "og:title", content: "Emergency Assessment — AER" },
      { property: "og:description", content: "Triage your academic crisis in four short steps." },
    ],
  }),
  component: EmergencyWizard,
});

const STEP_TITLES = [
  "What's happening?",
  "How much time do you have?",
  "What are you trying to save?",
  "What went wrong? Be honest, we don't judge.",
];

const blankAssessment = {
  situations: [] as string[],
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
  mistakes: [] as string[],
};

function EmergencyWizard() {
  const navigate = useNavigate();
  const { createEmergency } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ ...blankAssessment });
  const [customTime, setCustomTime] = useState("");

  const toggle = (key: "situations" | "mistakes", id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }));

  const canNext =
    (step === 0 && draft.situations.length > 0) ||
    (step === 1 && (draft.time.length > 0 || customTime.length > 0)) ||
    (step === 2 && draft.subject.trim().length > 0) ||
    step === 3;

  const next = () => {
    if (step === 1 && customTime) setDraft((d) => ({ ...d, time: customTime }));
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    const final = step === 1 && customTime ? { ...draft, time: customTime } : draft;
    createEmergency(final);
    navigate({ to: "/diagnosis" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl animate-rise">
        <Chip tone="primary">STEP {step + 1} OF 4</Chip>
        <div className="mt-4">
          <Bar value={((step + 1) / 4) * 100} />
        </div>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{STEP_TITLES[step]}</h1>

        <div className="mt-8">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {SITUATIONS.map((s) => {
                const on = draft.situations.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle("situations", s.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors",
                      on
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                    {on && <Check className="ml-auto size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setDraft((d) => ({ ...d, time: t }));
                      setCustomTime("");
                    }}
                    aria-pressed={draft.time === t && !customTime}
                    className={cn(
                      "rounded-2xl border px-3 py-5 text-sm font-bold transition-colors",
                      draft.time === t && !customTime
                        ? "border-warning bg-warning/10 text-warning"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Field label="Or type exactly how long you've got">
                <input
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="e.g. 3 hours 20 minutes"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject">
                <input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  placeholder="e.g. Organic Chemistry"
                  className={inputCls}
                />
              </Field>
              <Field label="Exam / assignment name">
                <input
                  value={draft.examName}
                  onChange={(e) => setDraft({ ...draft, examName: e.target.value })}
                  placeholder="e.g. Midterm 2"
                  className={inputCls}
                />
              </Field>
              <Field label="Deadline">
                <input
                  value={draft.deadline}
                  onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                  placeholder="e.g. Tomorrow, 9:00 AM"
                  className={inputCls}
                />
              </Field>
              <Field label="Target grade">
                <select
                  value={draft.targetGrade}
                  onChange={(e) => setDraft({ ...draft, targetGrade: e.target.value })}
                  className={inputCls}
                >
                  <option>Just pass (50%)</option>
                  <option>Pass comfortably (65%+)</option>
                  <option>Strong grade (75%+)</option>
                  <option>Top of the class (85%+)</option>
                </select>
              </Field>
              <Field label={`Current progress: ${draft.progress}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.progress}
                  onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
                  className="w-full accent-[oklch(0.59_0.235_27.5)]"
                />
              </Field>
              <Field label="Difficulty">
                <select
                  value={draft.difficulty}
                  onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
                  className={inputCls}
                >
                  <option>Manageable</option>
                  <option>Hard</option>
                  <option>Brutal</option>
                </select>
              </Field>
              <Field label="Topics to cover" className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={draft.topics}
                  onChange={(e) => setDraft({ ...draft, topics: e.target.value })}
                  placeholder="List the topics you need to cover"
                  className={inputCls}
                />
              </Field>
              <Field label="Hours you can realistically study">
                <input
                  value={draft.hours}
                  onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
                  placeholder="e.g. 6"
                  className={inputCls}
                />
              </Field>
              <Field label="Syllabus / notes (demo only)">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground hover:border-ai/60">
                  <FileUp className="size-4 text-ai" />
                  {draft.fileName || "Drop a file or click to pick one"}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) =>
                      setDraft({ ...draft, fileName: e.target.files?.[0]?.name ?? "" })
                    }
                  />
                </label>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {MISTAKES.map((m) => {
                const on = draft.mistakes.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle("mistakes", m.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-colors",
                      on ? "border-ai bg-ai/10" : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    {m.label}
                    {on && <Check className="ml-auto size-4 text-ai" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Panel className="mt-8 flex items-center justify-between gap-3">
          <Btn
            tone="ghost"
            onClick={() => (step === 0 ? navigate({ to: "/dashboard" }) : setStep(step - 1))}
          >
            <ArrowLeft className="size-4" /> {step === 0 ? "Cancel" : "Back"}
          </Btn>
          <Btn onClick={next} disabled={!canNext}>
            {step === 3 ? "Run diagnosis" : "Continue"} <ArrowRight className="size-4" />
          </Btn>
        </Panel>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-primary";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
