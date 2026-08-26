import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pause, Play, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Bar, Btn, Chip, Panel } from "@/components/ui-kit";
import { useApp } from "@/lib/store";
import { useEnsurePlan } from "@/lib/use-plan";
import { NoEmergency } from "@/components/NoEmergency";

export const Route = createFileRoute("/mission")({
  head: () => ({
    meta: [
      { title: "Survival Mode Timer — Academic Emergency Room" },
      {
        name: "description",
        content: "A focused countdown tied to one mission: start, pause, get unstuck, or mark it done.",
      },
      { property: "og:title", content: "Survival Mode — AER" },
      { property: "og:description", content: "One topic, one timer, no tabs." },
    ],
  }),
  component: Mission,
});

function Mission() {
  const { assessment, setStuckOpen, completeMission } = useApp();
  const { plan, hasEmergency, hydrated } = useEnsurePlan();
  const navigate = useNavigate();
  const total = (plan?.missionMinutes ?? 30) * 60;
  const [left, setLeft] = useState(total);
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!started) setLeft(total);
  }, [total, started]);


  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  if (hydrated && !hasEmergency) return <NoEmergency title="No mission to run yet" />;

  const finish = () => {
    setRunning(false);
    setDone(true);
    completeMission();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl animate-rise text-center">
        <Chip tone="primary">
          SURVIVAL MODE · PHASE 1 {plan?.phases[0]?.name?.toUpperCase() ?? "STABILIZE"}
        </Chip>
        <h1 className="mt-5 text-3xl font-bold">{assessment.subject}</h1>
        <p className="mt-1 text-muted-foreground">
          Mission: {plan?.missionFocus ?? "lock in your Must Know list"} first.
        </p>


        <Panel className="mt-8">
          <p className="font-display text-7xl font-bold tabular-nums sm:text-8xl">
            {mm}:{ss}
          </p>
          <Bar className="mt-6" value={((total - left) / total) * 100} tone="success" />
          <p className="mt-3 text-xs text-muted-foreground">
            {running ? "Running. Phone face down." : left === 0 ? "Time's up." : "Paused"}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Btn
              size="lg"
              onClick={() => {
                setStarted(true);
                setRunning((r) => !r);
              }}
              disabled={left === 0}
            >

              {running ? <Pause className="size-5" /> : <Play className="size-5" />}
              {running ? "Pause" : "Start"}
            </Btn>
            <Btn tone="ai" size="lg" onClick={() => setStuckOpen(true)}>
              I'm Stuck
            </Btn>
            <Btn tone="success" size="lg" onClick={finish}>
              I'm Done
            </Btn>
          </div>

          <button
            onClick={() => {
              setStarted(false);
              setLeft(total);
              setRunning(false);

              setDone(false);
            }}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset timer
          </button>
        </Panel>

        {done && (
          <Panel className="mt-4 border-success/40 bg-success/10">
            <p className="font-bold text-success">Mission logged. +120 XP</p>
            <p className="mt-1 text-sm text-muted-foreground">
              That's one phase down. Momentum is the whole game.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Btn tone="outline" onClick={() => navigate({ to: "/plan" })}>
                Back to plan
              </Btn>
              <Btn tone="success" onClick={() => navigate({ to: "/progress" })}>
                See progress
              </Btn>
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
