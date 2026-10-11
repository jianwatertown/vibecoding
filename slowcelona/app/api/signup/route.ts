import {signup} from '@/lib/sheets';
import {signupName} from '@/lib/signup';
import {failure,requestBody} from '@/lib/http';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{return Response.json(await signup(signupName(await requestBody(request))),{headers:{'Cache-Control':'no-store'}})}catch(error){return failure(error)}}
