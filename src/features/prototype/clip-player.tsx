import { useEffect, useState } from "react";
import { loadClip } from "./audio-store";

/** Plays a recording stored in this browser; explains when it is not available here. */
export function ClipPlayer({ audioId, label }: { audioId: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    loadClip(audioId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioId]);
  if (missing)
    return (
      <p className="record-caption">
        Nagranie nie jest dostępne w tej przeglądarce (nagrania nie trafiają do eksportu danych).
      </p>
    );
  if (!url) return null;
  return <audio className="voice-player" controls src={url} aria-label={label} />;
}
