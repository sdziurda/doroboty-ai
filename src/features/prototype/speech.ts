/** Speech-recognition error messages and the rules that end a voice take. */
export const speechErrors: Record<string, string> = {
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

/** Recognition cannot continue after these errors, so the take has to end now. */
export function isBlockingSpeechError(error: string | undefined) {
  return !!error && blockingSpeechErrors.has(error);
}

/**
 * A take can be finished while it is active or while the recorder still records.
 * The recorder check keeps "stop" and the time limit working after recognition failed.
 */
export function canFinishTake(active: boolean, recorderState: string | undefined) {
  return active || recorderState === "recording";
}
