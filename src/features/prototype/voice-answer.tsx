import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteClip, saveClip } from "./audio-store";
import { MAX_RECORDING_SECONDS } from "./contribution";
import { ClipPlayer } from "./clip-player";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
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

export function recordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    recognitionConstructor() !== null
  );
}

export type VoiceValue = { audioId: string; transcript: string };

const speechErrors: Record<string, string> = {
  "no-speech": "Mikrofon nie wychwycił mowy. Mów bliżej mikrofonu.",
  "audio-capture":
    "Rozpoznawanie mowy nie ma dostępu do mikrofonu. Sprawdź, czy mikrofon nie jest zajęty przez inny program.",
  network: "Rozpoznawanie mowy w Chrome potrzebuje połączenia z internetem.",
  "not-allowed": "Przeglądarka nie zezwala na rozpoznawanie mowy na tej stronie.",
  "service-not-allowed": "Przeglądarka nie zezwala na rozpoznawanie mowy na tej stronie.",
  "language-not-supported": "Przeglądarka nie rozpoznaje mowy po polsku.",
};
const blockingSpeechErrors = new Set([
  "not-allowed",
  "service-not-allowed",
  "language-not-supported",
]);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Voice-only answer: one take of up to MAX_RECORDING_SECONDS while the browser's speech
 * recognition builds a transcript. No typing. A take whose transcript reaches minLength is
 * final; a retry is offered only when recognition failed.
 */
export function VoiceAnswer({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  minLength,
}: {
  id: string;
  label: string;
  minLength: number;
  value: VoiceValue;
  onChange: (next: VoiceValue) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState("");
  const [problem, setProblem] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const finalText = useRef("");
  const interimText = useRef("");
  const lastError = useRef("");
  const recognitionDone = useRef<Promise<void>>(Promise.resolve());
  const resolveRecognition = useRef<() => void>(() => {});
  const active = useRef(false);
  const timer = useRef<number | null>(null);
  const latest = useRef(value);
  latest.current = value;

  function cleanup() {
    active.current = false;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    recognition.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  }
  useEffect(() => () => cleanup(), []);

  async function start() {
    setProblem("");
    const Constructor = recognitionConstructor();
    if (!Constructor || typeof window.MediaRecorder === "undefined") {
      setProblem("Ta przeglądarka nie obsługuje nagrywania z zapisem. Użyj Chrome.");
      return;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setProblem("Brak dostępu do mikrofonu. Zezwól przeglądarce na mikrofon i spróbuj ponownie.");
      return;
    }
    stream.current = media;
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(media);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    mediaRecorder.onstop = async () => {
      // Speech recognition delivers its last results after stop(); wait for it (max 3 s).
      await Promise.race([
        recognitionDone.current,
        new Promise((resolve) => window.setTimeout(resolve, 3000)),
      ]);
      const transcript = `${finalText.current} ${interimText.current}`.replace(/\s+/g, " ").trim();
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
      const audioId = crypto.randomUUID();
      try {
        await saveClip(audioId, blob);
        if (latest.current.audioId) await deleteClip(latest.current.audioId).catch(() => {});
        onChange({ audioId, transcript });
        if (!transcript)
          setProblem(
            `Nie rozpoznano mowy. ${speechErrors[lastError.current] ?? "Nagraj odpowiedź ponownie, mówiąc wyraźnie i blisko mikrofonu."}`,
          );
      } catch {
        setProblem("Nie udało się zapisać nagrania w przeglądarce.");
      }
      setLive("");
    };
    recorder.current = mediaRecorder;

    finalText.current = "";
    interimText.current = "";
    lastError.current = "";
    recognitionDone.current = new Promise((resolve) => (resolveRecognition.current = resolve));
    const instance = new Constructor();
    instance.lang = "pl-PL";
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText.current = `${finalText.current} ${result[0].transcript}`;
        else interim += result[0].transcript;
      }
      interimText.current = interim;
      setLive(`${finalText.current} ${interim}`.trim());
    };
    // Chrome ends recognition after silence; keep it running while recording.
    instance.onend = () => {
      if (active.current) {
        // A session that ended keeps its unfinished words as final text.
        finalText.current = `${finalText.current} ${interimText.current}`;
        interimText.current = "";
        try {
          instance.start();
          return;
        } catch {
          /* fall through: recognition cannot restart */
        }
      }
      resolveRecognition.current();
    };
    instance.onerror = (event) => {
      lastError.current = event.error ?? "";
      if (event.error && blockingSpeechErrors.has(event.error)) {
        active.current = false;
        setProblem(speechErrors[event.error]);
      }
    };
    recognition.current = instance;

    active.current = true;
    mediaRecorder.start();
    instance.start();
    setElapsed(0);
    setRecording(true);
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) stop();
    }, 250);
  }

  function stop() {
    if (!active.current) return;
    cleanup();
    setRecording(false);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  const remaining = Math.max(0, MAX_RECORDING_SECONDS - elapsed);
  const final = !!value.audioId && value.transcript.trim().length >= minLength;
  return (
    <div className="voice-answer" aria-invalid={invalid || undefined} id={id} tabIndex={-1}>
      <div className="voice-controls">
        {recording ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stop}
            aria-describedby={`${id}-timer`}
          >
            <Square aria-hidden="true" />
            Zakończ nagrywanie
          </Button>
        ) : final ? null : (
          <Button
            type="button"
            size="sm"
            variant={value.audioId ? "outline" : "default"}
            disabled={disabled}
            aria-describedby={describedBy}
            onClick={() => void start()}
          >
            {value.audioId ? <RotateCcw aria-hidden="true" /> : <Mic aria-hidden="true" />}
            {value.audioId ? `Nagraj ponownie: ${label}` : `Nagraj: ${label}`}
          </Button>
        )}
        <span id={`${id}-timer`} className="voice-timer" aria-live="polite">
          {recording
            ? `Nagrywanie ${clock(elapsed)} · zostało ${clock(remaining)}`
            : final
              ? "Nagranie zapisane. Odpowiedź jest ostateczna."
              : value.audioId
                ? "Nie udało się rozpoznać odpowiedzi, możesz nagrać ją ponownie."
                : `Jedno podejście, limit: ${clock(MAX_RECORDING_SECONDS)}`}
        </span>
      </div>
      {recording && (
        <p className="voice-live" aria-live="polite">
          {live || "Słucham… rozpoznany tekst pojawi się tutaj."}
        </p>
      )}
      {!recording && value.audioId && (
        <div className="voice-result">
          <ClipPlayer audioId={value.audioId} label={`Twoje nagranie: ${label}`} />
          <p className="voice-transcript">
            <span>Zapis:</span> {value.transcript || "brak rozpoznanego tekstu"}
          </p>
        </div>
      )}
      {problem && (
        <p role="alert" className="error-message">
          {problem}
        </p>
      )}
    </div>
  );
}
