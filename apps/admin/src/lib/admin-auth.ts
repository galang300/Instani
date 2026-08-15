export type AdminUser = {
  id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  role: "ADMIN";
};

export type AdminSession = {
  token: string;
  user: AdminUser;
};

const STORAGE_KEY = "panganterkini.adminSession";

function isAdminSession(value: unknown): value is AdminSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<AdminSession>;
  return (
    typeof session.token === "string" &&
    !!session.user &&
    session.user.role === "ADMIN" &&
    typeof session.user.id === "string" &&
    typeof session.user.name === "string"
  );
}

export function getStoredAdminSession() {
  try {
    const rawSession = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as unknown;
    return isAdminSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAdminSession(session: AdminSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
