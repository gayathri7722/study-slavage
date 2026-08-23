import { Link } from "@tanstack/react-router";
import { Siren } from "lucide-react";

import { AppShell } from "./AppShell";
import { Btn, Panel } from "./ui-kit";

export function NoEmergency({
  title = "You don't have an active academic emergency yet",
  body = "Start your first emergency and we'll build a personalized recovery plan from your own subject and topics.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="grid size-16 place-items-center rounded-full border border-primary/40 bg-primary/10">
          <Siren className="size-7 text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{body}</p>
        <Panel className="mt-7 w-full">
          <Link to="/emergency">
            <Btn size="lg" className="w-full">
              Start a new emergency
            </Btn>
          </Link>
        </Panel>
      </div>
    </AppShell>
  );
}
