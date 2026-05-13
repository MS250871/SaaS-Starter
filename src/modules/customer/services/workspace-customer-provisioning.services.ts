import { AuthAccountType } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { customerQueries } from '@/modules/customer/db';
import {
  createAuthAccountForIdentity,
  findAuthAccountByTypeValue,
  verifyAuthAccount,
} from '@/modules/auth/services/authAccount.services';
import {
  createIdentity,
  findIdentityByEmail,
  findIdentityByPhone,
  updateIdentity,
} from '@/modules/auth/services/identity.services';
import {
  createCustomer,
  findCustomerByWorkspaceIdentity,
  updateCustomer,
} from '@/modules/customer/services/customer.services';

async function ensureIdentityForWorkspaceCustomer(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const [emailIdentity, phoneIdentity] = await Promise.all([
    findIdentityByEmail(params.email),
    findIdentityByPhone(params.phone),
  ]);

  if (emailIdentity && phoneIdentity && emailIdentity.id !== phoneIdentity.id) {
    throwError(ERR.INVALID_STATE, 'Email and phone map to different identities');
  }

  const identity = emailIdentity ?? phoneIdentity ?? null;

  if (!identity) {
    return createIdentity({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      isActive: true,
    });
  }

  const updates: Record<string, string> = {};

  if (!identity.firstName && params.firstName) {
    updates.firstName = params.firstName;
  }

  if (!identity.lastName && params.lastName) {
    updates.lastName = params.lastName;
  }

  if (!identity.email && params.email) {
    updates.email = params.email;
  }

  if (!identity.phone && params.phone) {
    updates.phone = params.phone;
  }

  if (Object.keys(updates).length > 0) {
    return updateIdentity(identity.id, updates);
  }

  return identity;
}

async function ensureVerifiedAuthAccountsForWorkspaceCustomer(params: {
  identityId: string;
  email: string;
  phone: string;
}) {
  const [emailAccount, phoneAccount] = await Promise.all([
    findAuthAccountByTypeValue(AuthAccountType.EMAIL, params.email),
    findAuthAccountByTypeValue(AuthAccountType.PHONE, params.phone),
  ]);

  if (emailAccount && emailAccount.identityId !== params.identityId) {
    throwError(ERR.INVALID_STATE, 'Email auth account belongs to another identity');
  }

  if (phoneAccount && phoneAccount.identityId !== params.identityId) {
    throwError(ERR.INVALID_STATE, 'Phone auth account belongs to another identity');
  }

  const ensuredEmailAccount =
    emailAccount ??
    (await createAuthAccountForIdentity(
      params.identityId,
      AuthAccountType.EMAIL,
      params.email,
    ));
  const ensuredPhoneAccount =
    phoneAccount ??
    (await createAuthAccountForIdentity(
      params.identityId,
      AuthAccountType.PHONE,
      params.phone,
    ));

  if (!emailAccount?.isVerified) {
    await verifyAuthAccount(ensuredEmailAccount.id);
  }

  if (!phoneAccount?.isVerified) {
    await verifyAuthAccount(ensuredPhoneAccount.id);
  }
}

async function ensureExternalIdAvailability(params: {
  workspaceId: string;
  externalId?: string | null;
  identityId?: string;
}) {
  if (!params.externalId) {
    return;
  }

  const existing = await customerQueries.findFirst({
    where: {
      workspaceId: params.workspaceId,
      externalId: params.externalId,
    },
    select: {
      id: true,
      identityId: true,
      externalId: true,
    },
  });

  if (existing && existing.identityId !== params.identityId) {
    throwError(ERR.ALREADY_EXISTS, 'External ID already exists for another customer');
  }
}

export async function provisionWorkspaceCustomer(params: {
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  externalId?: string | null;
  allowExistingCustomer?: boolean;
}) {
  const identity = await ensureIdentityForWorkspaceCustomer({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phone: params.phone,
  });

  await ensureExternalIdAvailability({
    workspaceId: params.workspaceId,
    externalId: params.externalId,
    identityId: identity.id,
  });

  await ensureVerifiedAuthAccountsForWorkspaceCustomer({
    identityId: identity.id,
    email: params.email,
    phone: params.phone,
  });

  const existingCustomer = await findCustomerByWorkspaceIdentity(
    params.workspaceId,
    identity.id,
  );

  if (existingCustomer) {
    if (!params.allowExistingCustomer) {
      throwError(ERR.ALREADY_EXISTS, 'Customer already exists in this workspace');
    }

    if (!existingCustomer.externalId && params.externalId) {
      await updateCustomer(existingCustomer.id, {
        externalId: params.externalId,
      });
    }

    return {
      customerId: existingCustomer.id,
      identityId: identity.id,
      created: false,
    };
  }

  const customer = await createCustomer({
    workspaceId: params.workspaceId,
    identityId: identity.id,
    externalId: params.externalId ?? undefined,
  });

  return {
    customerId: customer.id,
    identityId: identity.id,
    created: true,
  };
}
