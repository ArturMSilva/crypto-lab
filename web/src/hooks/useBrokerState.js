import { useEffect, useRef, useState } from "react";
import { broker } from "../lib/broker.js";

// Faz polling do estado do canal a cada `intervaloMs`.
// Retorna { estado, online, erro } — online indica se o broker respondeu.
export function useEstadoBroker(intervaloMs = 1000) {
  const [estado, setEstado] = useState({ channel: null, reply: null, log: [] });
  const [online, setOnline] = useState(false);
  const [erro, setErro] = useState(null);
  const temporizador = useRef(null);

  useEffect(() => {
    let ativo = true;
    async function atualizar() {
      try {
        const s = await broker.obterEstado();
        if (!ativo) return;
        setEstado(s);
        setOnline(true);
        setErro(null);
      } catch (e) {
        if (!ativo) return;
        setOnline(false);
        setErro(e.message);
      }
    }
    atualizar();
    temporizador.current = setInterval(atualizar, intervaloMs);
    return () => {
      ativo = false;
      clearInterval(temporizador.current);
    };
  }, [intervaloMs]);

  return { estado, online, erro };
}
