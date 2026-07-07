import type { StudentByCode } from "./types";

export type StudentMode = "student" | "guest";

export interface StudentIdentity {
  mode: StudentMode;
  name: string;
  email: string;
  code?: string | null;
  className?: string | null;
  studentId?: string | null;
}

const KEY = "etp.studentIdentity.v1";

function canStore(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cleanCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export function isReadyIdentity(identity: Pick<StudentIdentity, "name" | "email">): boolean {
  return identity.name.trim().length > 1 && isValidEmail(identity.email);
}

export function loadStudentIdentity(): StudentIdentity | null {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudentIdentity>;
    if ((parsed.mode !== "student" && parsed.mode !== "guest") || !parsed.name || !parsed.email) return null;
    return {
      mode: parsed.mode,
      name: parsed.name,
      email: cleanEmail(parsed.email),
      code: parsed.code ? cleanCode(parsed.code) : null,
      className: parsed.className ?? null,
      studentId: parsed.studentId ?? null,
    };
  } catch {
    return null;
  }
}

export function saveStudentIdentity(identity: StudentIdentity): StudentIdentity {
  const next: StudentIdentity = {
    ...identity,
    name: identity.name.trim(),
    email: cleanEmail(identity.email),
    code: identity.code ? cleanCode(identity.code) : null,
  };
  if (canStore()) window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearStudentIdentity(): void {
  if (canStore()) window.localStorage.removeItem(KEY);
}

export function identityFromStudentCode(student: StudentByCode, code: string): StudentIdentity {
  return {
    mode: "student",
    name: student.full_name,
    email: student.email ?? "",
    code: cleanCode(code),
    className: student.class_name,
    studentId: student.id,
  };
}

export function guestIdentity(name: string, email: string): StudentIdentity {
  return {
    mode: "guest",
    name: name.trim(),
    email: cleanEmail(email),
    code: null,
    className: null,
    studentId: null,
  };
}
