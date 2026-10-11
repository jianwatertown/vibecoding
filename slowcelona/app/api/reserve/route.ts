import {reserve} from '@/lib/sheets';
import {validateInput} from '@/lib/model';
import {failure,requestBody} from '@/lib/http';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{return Response.json(await reserve(validateInput(await requestBody(request))),{headers:{'Cache-Control':'no-store'}})}catch(error){return failure(error)}}
