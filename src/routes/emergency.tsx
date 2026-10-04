import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Bar, Btn, Chip, Panel } from "@/components/ui-kit";
import { MISTAKES, SITUATIONS } from "@/lib/mock";
import {
  DIFFICULTY_LABEL,
  IMPORTANCE_LABEL,
  formatMin,
  newTopicId,
  type Difficulty,
  type Importance,
  type TopicInput,
} from "@/lib/priority";
import { blankAssessment, type Assessment } from "@/lib/store";
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
  "How much time do you have, and when is the exam?",
  "What are you trying to save?",
  "What went wrong? Be honest, we don't judge.",
];

const HOUR_PRESETS = [
  { h: 0.25, label: "15 min" },
  { h: 0.5, label: "30 min" },
  { h: 2, label: "2 hours" },
  { h: 4, label: "4 hours" },
  { h: 6, label: "6 hours" },
  { h: 8, label: "8 hours" },
];

const blankTopic = (examDate: string): TopicInput => ({
  id: newTopicId(),
  subject: "",
  name: "",
  examDate,
  importance: 3,
  prep: 30,
  difficulty: 2,
  estHours: 1,
});

function EmergencyWizard() {
  const navigate = useNavigate();
  const { createEmergency } = useApp();
  const [step, setStep] = useState(0);
  const [examDate, setExamDate] = useState("");
  const [draft, setDraft] = useState<Assessment>(() => ({ ...blankAssessment, items: [blankTopic("")] }));
  const upd = (id: string, u: Partial<TopicInput>) =>
    setDraft((d) => ({ ...d, items: d.items.map((t) => (t.id === id ? { ...t, ...u } : t)) }));

  const toggle = (key: "situations" | "mistakes", id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
    }));

  const canNext =
    (step === 0 && draft.situations.length > 0) ||
    (step === 1 && draft.availableHours > 0) ||
    (step === 2 &&
      draft.subject.trim().length > 0 &&
      draft.items.some((t) => t.name.trim()) &&
      draft.items.every((t) => !t.name.trim() || t.estHours > 0)) ||
    step === 3;

  const next = () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    const items = draft.items
      .filter((t) => t.name.trim())
      .map((t) => ({ ...t, name: t.name.trim(), subject: t.subject.trim() || draft.subject.trim() }));
    const avgPrep = Math.round(items.reduce((s, t) => s + t.prep, 0) / items.length);
    const maxDiff = Math.max(...items.map((t) => t.difficulty));
    const final: Assessment = {
      ...draft,
      items,
      time: formatMin(draft.availableHours * 60),
      hours: String(draft.availableHours),
      deadline: examDate ? new Date(examDate + "T00:00").toDateString() : "",
      topics: items.map((t) => t.name).join(", "),
      progress: avgPrep,
      difficulty: maxDiff === 3 ? "Brutal" : maxDiff === 2 ? "Hard" : "Manageable",
    };
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
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {HOUR_PRESETS.map((p) => (
                  <button
                    key={p.h}
                    onClick={() => setDraft((d) => ({ ...d, availableHours: p.h }))}
                    aria-pressed={draft.availableHours === p.h}
                    className={cn(
                      "rounded-2xl border px-3 py-5 text-sm font-bold transition-colors",
                      draft.availableHours === p.h
                        ? "border-warning bg-warning/10 text-warning"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Available study hours (exact)">
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={draft.availableHours || ""}
                    onChange={(e) => setDraft({ ...draft, availableHours: Number(e.target.value) })}
                    placeholder="e.g. 3.5"
                    className={inputCls}
                  />
                </Field>
                <Field label="Exam / deadline date">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExamDate(v);
                      setDraft((d) => ({
                        ...d,
                        items: d.items.map((t) => (t.examDate && t.examDate !== examDate ? t : { ...t, examDate: v })),
                      }));
                    }}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Main subject">
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
              </div>

              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Topics / chapters — one row each
              </p>
              {draft.items.map((t, i) => (
                <Panel key={t.id} className="grid gap-3 sm:grid-cols-6">
                  <Field label="Topic" className="sm:col-span-2">
                    <input value={t.name} onChange={(e) => upd(t.id, { name: e.target.value })} placeholder="e.g. Aldol reactions" className={inputCls} />
                  </Field>
                  <Field label="Subject" className="sm:col-span-2">
                    <input value={t.subject} onChange={(e) => upd(t.id, { subject: e.target.value })} placeholder={draft.subject || "Subject"} className={inputCls} />
                  </Field>
                  <Field label="Exam date" className="sm:col-span-2">
                    <input type="date" value={t.examDate} onChange={(e) => upd(t.id, { examDate: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Importance" className="sm:col-span-2">
                    <select value={t.importance} onChange={(e) => upd(t.id, { importance: Number(e.target.value) as Importance })} className={inputCls}>
                      {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{IMPORTANCE_LABEL[v as Importance]}</option>)}
                    </select>
                  </Field>
                  <Field label="Difficulty" className="sm:col-span-2">
                    <select value={t.difficulty} onChange={(e) => upd(t.id, { difficulty: Number(e.target.value) as Difficulty })} className={inputCls}>
                      {[1, 2, 3].map((v) => <option key={v} value={v}>{DIFFICULTY_LABEL[v as Difficulty]}</option>)}
                    </select>
                  </Field>
                  <Field label="Est. study hours" className="sm:col-span-2">
                    <input type="number" min={0.25} step={0.25} value={t.estHours || ""} onChange={(e) => upd(t.id, { estHours: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label={`Preparation: ${t.prep}%`} className="sm:col-span-5">
                    <input type="range" min={0} max={100} step={5} value={t.prep} onChange={(e) => upd(t.id, { prep: Number(e.target.value) })} className="w-full accent-[oklch(0.59_0.235_27.5)]" />
                  </Field>
                  <div className="flex items-end sm:col-span-1">
                    <Btn tone="ghost" size="sm" disabled={draft.items.length === 1} onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((x) => x.id !== t.id) }))}>
                      <Trash2 className="size-4" /> {i >= 0 ? "Remove" : ""}
                    </Btn>
                  </div>
                </Panel>
              ))}
              <Btn tone="outline" onClick={() => setDraft((d) => ({ ...d, items: [...d.items, blankTopic(examDate)] }))}>
                <Plus className="size-4" /> Add topic
              </Btn>
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
