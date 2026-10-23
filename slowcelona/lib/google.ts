import { createSign } from "node:crypto";
import { AppError, SheetsError } from "./errors";

const SHEETS_SCOPE="https://www.googleapis.com/auth/spreadsheets";
const tokens=new Map<string,{value:string;expires:number}>();
const requests=new Map<string,Promise<string>>();
export async function accessToken(scope=SHEETS_SCOPE): Promise<string> {
  const token=tokens.get(scope),pending=requests.get(scope);
  if (token && token.expires > Date.now()) return token.value;
  if (pending) return pending;
  const request = (async () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !key) throw new AppError("NOT_CONFIGURED", "Reservations are being set up. Please try again shortly.");
    const now = Math.floor(Date.now() / 1000);
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const input = `${encode({alg:"RS256",typ:"JWT"})}.${encode({iss:email,scope,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})}`;
    const signature = createSign("RSA-SHA256").update(input).sign(key, "base64url");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${input}.${signature}`}),
      signal:AbortSignal.timeout(10000), cache:"no-store"
    });
    if (!response.ok) throw new SheetsError(response.status, "AUTH_FAILED");
    const data = await response.json();
    if (typeof data.access_token !== "string") throw new SheetsError(502, "AUTH_RESPONSE");
    tokens.set(scope,{value:data.access_token, expires:Date.now() + Math.min(Number(data.expires_in)||3600, 3600)*1000-120000});
    return data.access_token as string;
  })();
  requests.set(scope,request);
  try { return await request; } finally { requests.delete(scope); }
}

// No credential, token, request body, or upstream error body is logged.
export async function google<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const bearer = await accessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    method, headers:{Authorization:`Bearer ${bearer}`, "Content-Type":"application/json"},
    body:body === undefined ? undefined : JSON.stringify(body),
    signal:AbortSignal.timeout(12000), cache:"no-store"
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) tokens.delete(SHEETS_SCOPE);
    throw new SheetsError(response.status, String(data?.error?.status || "API_ERROR"));
  }
  return response.json() as Promise<T>;
}
export function sheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new AppError("NOT_CONFIGURED", "Reservations are being set up. Please try again shortly.");
  return id;
}
export type Cell = string | number | boolean;
export type Grid = Cell[][];
export type Metadata = { spreadsheetId: string; properties: {title:string; timeZone:string}; sheets: {properties:{sheetId:number;title:string;gridProperties:{rowCount:number;columnCount:number}}}[] };
export async function metadata(id = sheetId()) {
  return google<Metadata>(`/${id}?fields=spreadsheetId,properties(title,timeZone),sheets(properties)`);
}
export async function values(ranges: string[], id = sheetId()): Promise<Grid[]> {
  const query = new URLSearchParams({valueRenderOption:"UNFORMATTED_VALUE", dateTimeRenderOption:"SERIAL_NUMBER"});
  ranges.forEach(range => query.append("ranges",range));
  const result = await google<{valueRanges:{values?:Grid}[]}>(`/${id}/values:batchGet?${query}`);
  return result.valueRanges.map(r => r.values || []);
}
export const stringRow = (cells: (string|number|boolean)[]) => ({values:cells.map(value => ({userEnteredValue:typeof value === "number" ? {numberValue:value} : typeof value === "boolean" ? {boolValue:value} : {stringValue:value}}))});
