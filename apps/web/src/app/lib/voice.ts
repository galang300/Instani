type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = EventTarget & {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

export function createSpeechRecognition() {
  if (typeof window === "undefined") return null;

  const recognitionClass = (window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }).SpeechRecognition ?? (window as Window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }).webkitSpeechRecognition;

  if (!recognitionClass) return null;

  const recognition = new recognitionClass();
  recognition.lang = "id-ID";
  recognition.interimResults = false;
  return recognition;
}

export function extractFirstNumber(text: string) {
  const match = text.replace(/\./g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}
