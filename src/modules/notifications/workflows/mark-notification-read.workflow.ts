import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  markAllCustomerNotificationsRead,
  markAllIdentityNotificationsRead,
  markNotificationRead,
} from '@/modules/notifications/services/notification.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export async function markNotificationReadWorkflow(notificationId: string) {
  return withUnitOfWork(async () => {
    if (!notificationId) {
      throwError(ERR.INVALID_INPUT, 'Notification ID is required');
    }

    return markNotificationRead(notificationId);
  });
}

export async function markAllNotificationsReadWorkflow(params: {
  identityId?: string | null;
  customerId?: string | null;
}) {
  return withUnitOfWork(async () => {
    if (!params.identityId && !params.customerId) {
      throwError(
        ERR.INVALID_INPUT,
        'Identity ID or customer ID is required',
      );
    }

    if (params.identityId) {
      return markAllIdentityNotificationsRead(params.identityId);
    }

    return markAllCustomerNotificationsRead(params.customerId!);
  });
}
