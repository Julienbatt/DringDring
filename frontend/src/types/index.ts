// Types partagés pour l'application

export type ErrorWithMessage = {
  message?: string;
  [key: string]: unknown;
};

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message || 'Une erreur est survenue';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Une erreur est survenue';
}

