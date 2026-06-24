import { useEffect, useRef, useState } from "react";
import { broker } from "../lib/broker.js";

// Faz polling do estado do canal a cada `intervalMs`.
// Retorna { state, online, error } — online indica se o broker respondeu.
export function useBrokerState(intervalMs = 1000) {
  const [state, setState] = useState({ channel: null, reply: null, log: [] });
  const [online, setOnline] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const s = await broker.getState();
        if (!alive) return;
        setState(s);
        setOnline(true);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setOnline(false);
        setError(e.message);
      }
    }
    tick();
    timer.current = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer.current);
    };
  }, [intervalMs]);

  return { state, online, error };
}
