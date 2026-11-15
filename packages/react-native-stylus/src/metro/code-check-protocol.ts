export type Problem = {
  file: string;
  line: number;
  message: string;
};

export type CheckRequest = { id: number; file: string };

/** `problems` is null when the project has no TypeScript to check with. */
export type CheckResponse = { id: number; problems: Problem[] | null };
