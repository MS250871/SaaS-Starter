import { NextResponse } from 'next/server';
import { withRequestContext } from '@/lib/request/withRequestContext';
import { getRequestContext } from '@/lib/context/request-context';
import { getActor } from '@/lib/context/actor-context';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  return withRequestContext(req, async () => {
    const requestContext = getRequestContext();
    const actorContext = getActor();

    // sessionId stays separate (not part of ActorContext)
    const h = await headers();
    const sessionId = h.get('x-session-id');

    return NextResponse.json({
      requestContext,
      actorContext,
      sessionId,
    });
  });
}
