export type PetaniUser = {
  id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  contactMethod: "PHONE" | "EMAIL";
  contact: string;
  role: "PETANI" | "TENGKULAK" | "ADMIN" | "PENYULUH";
  verificationStatus: string;
  gapoktanId?: string;
  ktpImageName?: string;
  ktpRejectionReason?: string;
};

export type PetaniSession = {
  token: string;
  user: PetaniUser;
};

const STORAGE_KEY = "panganterkini.petaniSession";

export const PETANI_SESSION_EVENT = "petani-session-changed";

function isPetaniSession(value: unknown): value is PetaniSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<PetaniSession>;
  return (
    typeof session.token === "string" &&
    !!session.user &&
    typeof session.user.id === "string" &&
    typeof session.user.name === "string" &&
    typeof session.user.username === "string"
  );
}

export function getStoredPetaniSession() {
  if (typeof window === "undefined") return null;

  try {
    const rawSession = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as unknown;
    return isPetaniSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePetaniSession(session: PetaniSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(PETANI_SESSION_EVENT));
}

export function clearPetaniSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(PETANI_SESSION_EVENT));
}
