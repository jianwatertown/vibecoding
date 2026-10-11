import {publicState} from '@/lib/sheets';
import {failure} from '@/lib/http';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(){try{return Response.json(await publicState(),{headers:{'Cache-Control':'no-store'}})}catch(error){return failure(error)}}
