export type Problem = {
  file: string;
  line: number;
  message: string;
};

/** `contents`, when given, is checked in place of the file on disk. */
export type CheckRequest = { id: number; file: string; contents?: string };

/** `problems` is null when the project has no TypeScript. */
export type CheckResponse = { id: number; problems: Problem[] | null };
