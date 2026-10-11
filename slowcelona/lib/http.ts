import {randomUUID} from 'node:crypto';
import {AppError,SheetsError} from './errors';
export function failure(error:unknown){
  const requestId=randomUUID();
  console.error(JSON.stringify({event:'request_failed',requestId,code:error instanceof AppError?error.code:error instanceof SheetsError?error.apiCode:'UPSTREAM_UNAVAILABLE',status:error instanceof SheetsError?error.status:undefined}));
  return Response.json({error:{code:error instanceof AppError?error.code:'UNAVAILABLE',message:error instanceof AppError?error.message:'Couldn’t reach the roster. Please try again. Your existing reservations are safe.',requestId}},{status:error instanceof AppError?error.status:503,headers:{'Cache-Control':'no-store'}});
}
export async function requestBody(request:Request){
 const origin=request.headers.get('origin');
 if(origin && (!/^https?:$/.test(new URL(origin).protocol) || new URL(origin).host !== (request.headers.get('host') || new URL(request.url).host)))throw new AppError('INVALID_ORIGIN','Please reserve from the Slowcelona website.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('INVALID_REQUEST','Please try again from the reservation page.',400);
 if(Number(request.headers.get('content-length'))>4096)throw new AppError('INVALID_REQUEST','Request is too large.',413);
 const reader=request.body?.getReader();if(!reader)throw new AppError('INVALID_REQUEST','Empty request.',400);
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new AppError('INVALID_REQUEST','Request is too large.',413);}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('INVALID_REQUEST','Please try again from the reservation page.',400);}
}
