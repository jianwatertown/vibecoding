export class AppError extends Error {
  constructor(public code: string, message: string, public status = 503) { super(message); }
}
export class SheetsError extends Error {
  constructor(public status: number, public apiCode: string) { super(`Google Sheets: ${status} ${apiCode}`); }
}
