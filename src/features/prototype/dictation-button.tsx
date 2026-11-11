import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Browser dictation, offered only where the Web Speech API exists. Never required. */
export function DictationButton({
  onText,
  disabled,
  label,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const [supported] = useState(() => recognitionConstructor() !== null);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState("");
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => () => recognition.current?.stop(), []);
  if (!supported) return null;
  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const instance = new Constructor();
    instance.lang = "pl-PL";
    instance.interimResults = false;
    instance.continuous = true;
    instance.onresult = (event) => {
      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++)
        parts.push(event.results[i][0].transcript);
      const text = parts.join(" ").trim();
      if (text) onText(text);
    };
    instance.onerror = () => setProblem("Nie udało się rozpoznać mowy. Możesz wpisać odpowiedź.");
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setProblem("");
    try {
      instance.start();
      setListening(true);
    } catch {
      setProblem("Dyktowanie jest niedostępne. Możesz wpisać odpowiedź.");
    }
  }
  return (
    <span className="dictation">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? `Zatrzymaj dyktowanie: ${label}` : `Dyktuj: ${label}`}
        onClick={toggle}
      >
        {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
        {listening ? "Zatrzymaj dyktowanie" : "Dyktuj odpowiedź"}
      </Button>
      {problem && (
        <span role="alert" className="error-message">
          {problem}
        </span>
      )}
    </span>
  );
}
