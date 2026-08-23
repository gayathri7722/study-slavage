import { useEffect } from "react";

import { useApp } from "./store";

/** Ensures the active emergency has a generated plan. */
export function useEnsurePlan() {
  const { plan, planStatus, planError, buildPlan, hasEmergency, activeEmergency, hydrated } =
    useApp();

  useEffect(() => {
    if (activeEmergency && planStatus === "idle") void buildPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planStatus, activeEmergency?.id]);

  return {
    plan,
    planStatus,
    planError,
    hasEmergency,
    hydrated,
    retry: () => buildPlan(),
  };
}
