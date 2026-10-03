export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Ressource') =>
  new HttpError(404, 'not_found', `${what} introuvable`);
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Authentification requise');
