// Copyright (c) 2026 Zeke Sikelianos
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { generateStudentId } from "./student-id";

export interface StudentProgress {
  completedLessons: string[];
  createdAt: string;
  updatedAt: string;
}

function kvKey(studentId: string): string {
  return `student:${studentId}`;
}

export async function createStudent(
  kv: KVNamespace,
): Promise<{ studentId: string; progress: StudentProgress }> {
  let studentId = generateStudentId();

  // Collision check. With ~9.7M possible IDs this should basically never
  // loop, but check anyway rather than assume.
  while (await kv.get(kvKey(studentId))) {
    studentId = generateStudentId();
  }

  const now = new Date().toISOString();
  const progress: StudentProgress = {
    completedLessons: [],
    createdAt: now,
    updatedAt: now,
  };

  await kv.put(kvKey(studentId), JSON.stringify(progress));
  return { studentId, progress };
}

export async function getProgress(
  kv: KVNamespace,
  studentId: string,
): Promise<StudentProgress | null> {
  const raw = await kv.get(kvKey(studentId));
  if (!raw) return null;
  return JSON.parse(raw) as StudentProgress;
}

export async function markLessonComplete(
  kv: KVNamespace,
  studentId: string,
  lessonSlug: string,
): Promise<StudentProgress | null> {
  const progress = await getProgress(kv, studentId);
  if (!progress) return null;

  if (!progress.completedLessons.includes(lessonSlug)) {
    progress.completedLessons.push(lessonSlug);
  }
  progress.updatedAt = new Date().toISOString();

  await kv.put(kvKey(studentId), JSON.stringify(progress));
  return progress;
}
