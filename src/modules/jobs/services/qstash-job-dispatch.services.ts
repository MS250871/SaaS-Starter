import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { qstash } from '@/lib/qstash';
import { buildAbsoluteUrl } from '@/lib/url/absolute-url';

const OTP_DELIVERY_WORKER_PATH = '/api/worker/auth/otp-deliveries';
const NOTIFICATION_DELIVERY_WORKER_PATH =
  '/api/worker/notifications/deliveries';
const RAZORPAY_WEBHOOK_WORKER_PATH = '/api/worker/billing/razorpay-webhooks';

function isNonPublicWorkerHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.lvh.me')
  );
}

function resolveWorkerTargetHostname() {
  const target = new URL(buildAbsoluteUrl(OTP_DELIVERY_WORKER_PATH));
  return target.hostname.trim().toLowerCase();
}

function getDelaySeconds(scheduledAt?: Date | null) {
  if (!scheduledAt) {
    return undefined;
  }

  const delaySeconds = Math.ceil((scheduledAt.getTime() - Date.now()) / 1000);
  return delaySeconds > 0 ? delaySeconds : undefined;
}

function assertPublicWorkerUrl(url: string) {
  const target = new URL(url);
  const hostname = target.hostname.trim().toLowerCase();

  if (isNonPublicWorkerHostname(hostname)) {
    throwError(
      ERR.INVALID_STATE,
      'QStash worker dispatch requires a publicly reachable APP_URL or SITE_URL. Localhost and lvh.me targets are not reachable from QStash.',
    );
  }
}

export function shouldBypassQStashDispatch() {
  return isNonPublicWorkerHostname(resolveWorkerTargetHostname());
}

async function publishWorkerJob<TBody>(params: {
  path: string;
  body: TBody;
  scheduledAt?: Date | null;
}) {
  const targetUrl = buildAbsoluteUrl(params.path);
  assertPublicWorkerUrl(targetUrl);

  try {
    const result = await qstash.publishJSON({
      url: targetUrl,
      body: params.body,
      delay: getDelaySeconds(params.scheduledAt),
      retries: 3,
    });

    return result.messageId;
  } catch (error) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to publish background job to QStash.',
      undefined,
      error,
    );
  }
}

export async function dispatchOtpDeliveryJob(params: {
  outboxEventId: string;
  scheduledAt?: Date | null;
}) {
  return publishWorkerJob({
    path: OTP_DELIVERY_WORKER_PATH,
    body: {
      outboxEventId: params.outboxEventId,
    },
    scheduledAt: params.scheduledAt,
  });
}

export async function dispatchNotificationDeliveryJob(params: {
  outboxEventId: string;
  scheduledAt?: Date | null;
}) {
  return publishWorkerJob({
    path: NOTIFICATION_DELIVERY_WORKER_PATH,
    body: {
      outboxEventId: params.outboxEventId,
    },
    scheduledAt: params.scheduledAt,
  });
}

export async function dispatchRazorpayWebhookJob(params: {
  webhookEventId: string;
  scheduledAt?: Date | null;
}) {
  return publishWorkerJob({
    path: RAZORPAY_WEBHOOK_WORKER_PATH,
    body: {
      webhookEventId: params.webhookEventId,
    },
    scheduledAt: params.scheduledAt,
  });
}

export async function dispatchOutboxEventJob(params: {
  eventType: string;
  outboxEventId: string;
  scheduledAt?: Date | null;
}) {
  switch (params.eventType) {
    case 'auth.send_otp':
      return dispatchOtpDeliveryJob({
        outboxEventId: params.outboxEventId,
        scheduledAt: params.scheduledAt,
      });
    case 'notifications.send_delivery':
      return dispatchNotificationDeliveryJob({
        outboxEventId: params.outboxEventId,
        scheduledAt: params.scheduledAt,
      });
    default:
      throwError(
        ERR.NOT_IMPLEMENTED,
        `No QStash worker dispatcher exists for outbox event type ${params.eventType}.`,
      );
  }
}
