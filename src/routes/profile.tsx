import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Siren, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Btn, Chip, Panel } from "@/components/ui-kit";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Academic Emergency Room" },
      {
        name: "description",
        content: "Your demo profile: study name, current emergency settings and shortcuts back into recovery.",
      },
      { property: "og:title", content: "Profile — AER" },
      { property: "og:description", content: "Demo profile and recovery shortcuts." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { name, setName, assessment, setStuckOpen, xp } = useApp();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl animate-rise">
        <Chip>PROFILE</Chip>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{name ? `Hey, ${name}` : "Welcome"}</h1>
        <p className="mt-2 text-muted-foreground">
          Add your name and it's saved on this device along with your emergencies and plans.
        </p>

        <Panel className="mt-7">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase text-muted-foreground">
              Display name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label="Current emergency" value={assessment.subject ? `${assessment.subject} — ${assessment.examName || "unnamed"}` : "None yet"} />
            <Info label="Deadline" value={assessment.deadline || "—"} />
            <Info label="Target grade" value={assessment.targetGrade} />
            <Info label="Total XP" value={xp.toLocaleString()} />
          </div>
        </Panel>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link to="/emergency">
            <Btn tone="outline" className="w-full">
              <Siren className="size-4" /> New emergency
            </Btn>
          </Link>
          <Link to="/damage-control">
            <Btn tone="outline" className="w-full">
              <Target className="size-4" /> Damage control
            </Btn>
          </Link>
          <Btn tone="outline" className="w-full" onClick={() => setStuckOpen(true)}>
            <LifeBuoy className="size-4" /> Get unstuck
          </Btn>
        </div>

        <Panel className="mt-6">
          <p className="text-sm text-muted-foreground">
            You're not finished. You're just in academic emergency mode.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
