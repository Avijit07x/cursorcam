export const ExitCode = {
  Ok: 0,
  Internal: 1,
  BadInput: 2,
  NoBrowser: 3,
  StepFailed: 4,
  EncodeFailed: 5,
  Timeout: 6,
  PageLoadFailed: 7,
  DiskFull: 8,
  Interrupted: 9,
  Blocked: 10,
  Crashed: 11,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
