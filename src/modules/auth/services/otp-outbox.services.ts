import {
  claimOutboxEventForProcessing,
  createOutboxEvent,
  findOutboxEventByProcessingKey,
  markOutboxEventDone,
  scheduleOutboxEventRetry,
} from '@/modules/jobs/outbox-events.services';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { sendOtp } from './otp.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

const AUTH_SEND_OTP_EVENT = 'auth.send_otp';

type QueueOtpDeliveryParams = {
  identifier: string;
  otp: string;
  name?: string;
  brand: string;
  verificationId: string;
  identityId?: string;
  workspaceId?: string | null;
  customerId?: string | null;
};

type OtpOutboxPayload = {
  identifier: string;
  otp: string;
  name?: string;
  brand: string;
  verificationId: string;
};

function isOtpOutboxPayload(payload: unknown): payload is OtpOutboxPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'identifier' in payload &&
    'otp' in payload &&
    'brand' in payload &&
    'verificationId' in payload
  );
}

export async function queueOtpDelivery(params: QueueOtpDeliveryParams) {
  if (!params.identifier || !params.otp || !params.brand || !params.verificationId) {
    throwError(
      ERR.INVALID_INPUT,
      'identifier, otp, brand and verificationId are required',
    );
  }

  return createOutboxEvent({
    eventType: AUTH_SEND_OTP_EVENT,
    payload: {
      identifier: params.identifier,
      otp: params.otp,
      name: params.name,
      brand: params.brand,
      verificationId: params.verificationId,
    },
    processingKey: `auth:send-otp:${params.verificationId}`,
    workspaceId: params.workspaceId ?? undefined,
    identityId: params.identityId ?? undefined,
    customerId: params.customerId ?? undefined,
  });
}

export async function processOtpOutboxEvent(outboxEventId: string) {
  if (!outboxEventId) {
    throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');
  }

  const claimed = await withUnitOfWork(() =>
    claimOutboxEventForProcessing(outboxEventId),
  );

  if (claimed.eventType !== AUTH_SEND_OTP_EVENT) {
    throwError(ERR.INVALID_INPUT, `Unsupported outbox event: ${claimed.eventType}`);
  }

  if (!isOtpOutboxPayload(claimed.payload)) {
    throwError(ERR.INVALID_INPUT, 'Invalid OTP outbox payload');
  }

  try {
    await sendOtp({
      identifier: claimed.payload.identifier,
      otp: claimed.payload.otp,
      name: claimed.payload.name,
      brand: claimed.payload.brand,
    });

    return await withUnitOfWork(() => markOutboxEventDone(claimed.id));
  } catch (e) {
    await withUnitOfWork(() =>
      scheduleOutboxEventRetry(
        claimed.id,
        e instanceof Error ? e.message : 'OTP delivery failed',
      ),
    );
    throw e;
  }
}

export async function replayOtpOutboxEvent(processingKey: string) {
  if (!processingKey) {
    throwError(ERR.INVALID_INPUT, 'processingKey is required');
  }

  const event = await withUnitOfWork(() =>
    findOutboxEventByProcessingKey(processingKey),
  );

  if (!event) {
    throwError(ERR.NOT_FOUND, 'Outbox event not found');
  }

  return processOtpOutboxEvent(event.id);
}
