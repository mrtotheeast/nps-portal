import { useState, useCallback } from "react";

/**
 * Returns { state, run } where:
 *   state: "idle" | "loading" | "success" | "error"
 *   run(asyncFn): wraps an async function with loading → success/error → idle (after 3s) lifecycle
 */
export function useActionButton() {
  const [state, setState] = useState("idle");

  const run = useCallback(async (asyncFn) => {
    setState("loading");
    try {
      await asyncFn();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
      throw err; // re-throw so caller can handle toast
    }
  }, []);

  return { state, run };
}