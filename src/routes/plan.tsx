import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Btn, Chip, Panel } from "@/components/ui-kit";
import { TIER_META, type Tier } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { useEnsurePlan } from "@/lib/use-plan";
import { NoEmergency } from "@/components/NoEmergency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Recovery Plan — Academic Emergency Room" },
      {
        name: "description",
        content:
          "A five-phase recovery plan plus a Don't Study Everything topic triage: must know, should know, ignore.",
      },
      { property: "og:title", content: "Your five-phase recovery plan" },
      { property: "og:description", content: "Stabilize, Priority Surgery, Practice, Simulation, Final Check." },
    ],
  }),
  component: PlanPage,
});

const TIERS: Tier[] = ["must", "should", "maybe", "ignore"];

function PlanPage() {
  const { assessment } = useApp();
  const { plan, planStatus, planError, retry, hasEmergency, hydrated } = useEnsurePlan();

  if (hydrated && !hasEmergency) return <NoEmergency title="No recovery plan yet" />;

  if (!plan) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          {planStatus === "error" ? (
            <>
              <h1 className="text-2xl font-bold">Couldn't build your plan</h1>
              <p className="mt-2 max-w-md text-muted-foreground">{planError}</p>
              <Btn className="mt-5" onClick={() => void retry()}>
                Try again
              </Btn>
            </>
          ) : (
            <>
              <Loader2 className="size-8 animate-spin text-primary" />
              <h1 className="mt-6 text-2xl font-bold">Creating your personalized {assessment.subject} recovery plan...</h1>
              <p className="mt-2 text-muted-foreground">Ranking your topics by what earns marks.</p>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="animate-rise">
        <Chip tone="success">RECOVERY PLAN</Chip>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          {plan.subject} — five phases, no filler
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Built from your answers: {assessment.examName || "your assessment"} ·{" "}
          {assessment.time || "limited time"} · {assessment.difficulty || "unknown"} difficulty. Work
          top to bottom.
        </p>

        <div className="mt-8 space-y-4">
          {plan.phases.map((p, i) => (
            <Panel key={p.name + i}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-surface-2 font-display font-bold">
                  {i + 1}
                </span>
                <h2 className="text-xl font-bold">{p.name}</h2>
                <Chip
                  tone={
                    p.color === "primary"
                      ? "primary"
                      : p.color === "warning"
                        ? "warning"
                        : p.color === "ai"
                          ? "ai"
                          : "success"
                  }
                >
                  {p.duration}
                </Chip>
              </div>
              <ul className="mt-4 space-y-2">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="text-foreground/85">{it}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-bold">Don't Study Everything</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your {plan.subject} topics, sorted by what actually earns marks in the time you have.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {TIERS.map((tier) => {
            const items = plan.topics.filter((t) => t.tier === tier);
            return (
              <Panel key={tier} className={cn("border", TIER_META[tier].klass)}>
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", TIER_META[tier].dot)} />
                  <h3 className="font-bold">{TIER_META[tier].label}</h3>
                </div>
                <ul className="mt-4 space-y-3">
                  {items.length === 0 && (
                    <li className="text-xs text-muted-foreground">Nothing in this tier.</li>
                  )}
                  {items.map((t) => (
                    <li key={t.name}>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.why}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/mission">
            <Btn size="lg">
              Start First Mission <ArrowRight className="size-5" />
            </Btn>
          </Link>
          <Link to="/miracle">
            <Btn tone="outline" size="lg">
              Only have 15 minutes?
            </Btn>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
