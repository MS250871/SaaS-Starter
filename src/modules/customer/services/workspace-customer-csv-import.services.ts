import { AuthAccountType } from '@/generated/prisma/client';
import { normalizePhone } from '@/lib/auth/auth-utils';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { customerQueries } from '@/modules/customer/db';
import { emailSchema } from '@/modules/auth/schema';
import { listAuthAccountsByEmailsOrPhones } from '@/modules/auth/services/authAccount.services';
import { listIdentitiesByEmailsOrPhones } from '@/modules/auth/services/identity.services';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';
import { provisionWorkspaceCustomer } from '@/modules/customer/services/workspace-customer-provisioning.services';

const MAX_IMPORT_ROWS = 500;
type CsvIdentityMatch = Awaited<
  ReturnType<typeof listIdentitiesByEmailsOrPhones>
>[number];
type CsvAuthAccountMatch = Awaited<
  ReturnType<typeof listAuthAccountsByEmailsOrPhones>
>[number];
type CsvExistingCustomerRecord = {
  id: string;
  identityId: string;
  externalId: string | null;
};

const headerMap: Record<string, WorkspaceCustomerCsvColumn> = {
  workspaceslug: 'workspaceSlug',
  workspace_slug: 'workspaceSlug',
  'workspace slug': 'workspaceSlug',
  firstname: 'firstName',
  first_name: 'firstName',
  'first name': 'firstName',
  lastname: 'lastName',
  last_name: 'lastName',
  'last name': 'lastName',
  email: 'email',
  phone: 'phone',
  externalid: 'externalId',
  external_id: 'externalId',
  'external id': 'externalId',
};

const requiredColumns: WorkspaceCustomerCsvColumn[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
];

export type WorkspaceCustomerCsvColumn =
  | 'workspaceSlug'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'externalId';

export type WorkspaceCustomerCsvPreparedRow = {
  rowNumber: number;
  source: {
    workspaceSlug: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    externalId: string | null;
  };
  normalized: {
    workspaceSlug: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    externalId: string | null;
  } | null;
  status: 'ready' | 'existing' | 'error';
  issues: string[];
  actions: {
    willCreateIdentity: boolean;
    willCreateEmailAuthAccount: boolean;
    willCreatePhoneAuthAccount: boolean;
    willCreateCustomer: boolean;
  };
};

export type WorkspaceCustomerCsvPreparedImport = {
  workspaceId: string;
  workspaceSlug: string;
  fileName: string | null;
  columns: WorkspaceCustomerCsvColumn[];
  summary: {
    totalRows: number;
    readyRows: number;
    existingRows: number;
    errorRows: number;
    willCreateIdentities: number;
    willCreateAuthAccounts: number;
    willCreateCustomers: number;
  };
  rows: WorkspaceCustomerCsvPreparedRow[];
};

export type WorkspaceCustomerCsvImportResult = {
  workspaceId: string;
  workspaceSlug: string;
  summary: {
    totalRows: number;
    importedRows: number;
    existingRows: number;
    errorRows: number;
    skippedRows: number;
  };
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCell(value: string | undefined) {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string | null) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function parseCsvText(csvText: string) {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }

      currentRow.push(currentCell);
      currentCell = '';

      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);

    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseCsvColumns(headerRow: string[]) {
  const columns = headerRow.map((header) => {
    const normalizedHeader = normalizeHeader(header);
    return headerMap[normalizedHeader] ?? null;
  });

  const resolvedColumns = columns.filter(
    (column): column is WorkspaceCustomerCsvColumn => Boolean(column),
  );

  const missingColumns = requiredColumns.filter(
    (column) => !resolvedColumns.includes(column),
  );

  if (missingColumns.length > 0) {
    throwError(ERR.INVALID_INPUT, 'CSV is missing required columns', 400, {
      missingColumns,
      requiredColumns,
    });
  }

  return columns;
}

function createRowSource(
  headerColumns: Array<WorkspaceCustomerCsvColumn | null>,
  row: string[],
) {
  const source: Record<WorkspaceCustomerCsvColumn, string | null> = {
    workspaceSlug: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    externalId: null,
  };

  headerColumns.forEach((column, index) => {
    if (!column) {
      return;
    }

    source[column] = normalizeCell(row[index]);
  });

  return source;
}

function buildPreparedSummary(rows: WorkspaceCustomerCsvPreparedRow[]) {
  const readyRows = rows.filter((row) => row.status === 'ready');
  const existingRows = rows.filter((row) => row.status === 'existing');
  const errorRows = rows.filter((row) => row.status === 'error');

  return {
    totalRows: rows.length,
    readyRows: readyRows.length,
    existingRows: existingRows.length,
    errorRows: errorRows.length,
    willCreateIdentities: readyRows.filter((row) => row.actions.willCreateIdentity)
      .length,
    willCreateAuthAccounts: readyRows.reduce((count, row) => {
      return (
        count +
        Number(row.actions.willCreateEmailAuthAccount) +
        Number(row.actions.willCreatePhoneAuthAccount)
      );
    }, 0),
    willCreateCustomers: readyRows.filter((row) => row.actions.willCreateCustomer)
      .length,
  };
}

function buildDuplicateValueMap(values: Array<string | null>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

async function resolvePreparedRows(params: {
  workspaceId: string;
  workspaceSlug: string;
  rawRows: Array<ReturnType<typeof createRowSource>>;
}) {
  const emails = Array.from(
    new Set(
      params.rawRows
        .map((row) => row.email?.toLowerCase() ?? null)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const phones = Array.from(
    new Set(
      params.rawRows
        .map((row) => {
          const normalized = row.phone ? normalizePhone(row.phone) : null;
          return normalized?.valid && normalized.e164
            ? String(normalized.e164)
            : null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const externalIds = Array.from(
    new Set(
      params.rawRows
        .map((row) => row.externalId)
      .filter((value): value is string => Boolean(value)),
    ),
  );

  const [identities, authAccounts, customersByExternalId]: [
    CsvIdentityMatch[],
    CsvAuthAccountMatch[],
    CsvExistingCustomerRecord[],
  ] = await Promise.all([
    emails.length > 0 || phones.length > 0
      ? listIdentitiesByEmailsOrPhones({
          emails,
          phones,
        })
      : Promise.resolve([] as CsvIdentityMatch[]),
    emails.length > 0 || phones.length > 0
      ? listAuthAccountsByEmailsOrPhones({
          emails,
          phones,
        })
      : Promise.resolve([] as CsvAuthAccountMatch[]),
    externalIds.length > 0
      ? customerQueries.many({
          where: {
            workspaceId: params.workspaceId,
            externalId: {
              in: externalIds,
            },
          },
          select: {
            id: true,
            identityId: true,
            externalId: true,
          },
        })
      : Promise.resolve([] as CsvExistingCustomerRecord[]),
  ]);

  const identityById = new Map(identities.map((identity) => [identity.id, identity]));
  const identityByEmail = new Map(
    identities
      .filter((identity: CsvIdentityMatch) => identity.email)
      .map((identity: CsvIdentityMatch) => [identity.email as string, identity]),
  );
  const identityByPhone = new Map(
    identities
      .filter((identity: CsvIdentityMatch) => identity.phone)
      .map((identity: CsvIdentityMatch) => [identity.phone as string, identity]),
  );
  const authAccountByEmail = new Map(
    authAccounts
      .filter((account: CsvAuthAccountMatch) => account.type === AuthAccountType.EMAIL)
      .map((account: CsvAuthAccountMatch) => [account.value.toLowerCase(), account]),
  );
  const authAccountByPhone = new Map(
    authAccounts
      .filter((account: CsvAuthAccountMatch) => account.type === AuthAccountType.PHONE)
      .map((account: CsvAuthAccountMatch) => [account.value, account]),
  );

  const existingIdentityIds = Array.from(identityById.keys());
  const existingCustomers: CsvExistingCustomerRecord[] = existingIdentityIds.length
    ? await customerQueries.many({
        where: {
          workspaceId: params.workspaceId,
          identityId: {
            in: existingIdentityIds,
          },
        },
        select: {
          id: true,
          identityId: true,
          externalId: true,
        },
      })
    : [];
  const customerByIdentityId = new Map(
    existingCustomers.map((customer) => [customer.identityId, customer]),
  );
  const customerByExternalId = new Map(
    customersByExternalId
      .filter((customer: CsvExistingCustomerRecord) => customer.externalId)
      .map((customer: CsvExistingCustomerRecord) => [customer.externalId as string, customer]),
  );

  const duplicateEmailCounts = buildDuplicateValueMap(
    params.rawRows.map((row) => row.email?.toLowerCase() ?? null),
  );
  const duplicatePhoneCounts = buildDuplicateValueMap(
    params.rawRows.map((row) => {
      const normalized = row.phone ? normalizePhone(row.phone) : null;
      return normalized?.valid ? normalized.e164 : null;
    }),
  );
  const duplicateExternalIdCounts = buildDuplicateValueMap(
    params.rawRows.map((row) => row.externalId),
  );

  return params.rawRows.map((row, index) => {
    const issues: string[] = [];
    const firstName = normalizeName(row.firstName);
    const lastName = normalizeName(row.lastName);
    const email = row.email?.trim().toLowerCase() ?? '';
    const phoneResult = row.phone ? normalizePhone(row.phone) : { valid: false, e164: null };
    const externalId = row.externalId?.trim() ?? null;
    const normalizedWorkspaceSlug = row.workspaceSlug?.trim().toLowerCase() ?? null;

    if (normalizedWorkspaceSlug && normalizedWorkspaceSlug !== params.workspaceSlug) {
      issues.push(
        `Workspace slug ${normalizedWorkspaceSlug} does not match ${params.workspaceSlug}.`,
      );
    }

    if (!firstName) {
      issues.push('First name is required.');
    }

    if (!lastName) {
      issues.push('Last name is required.');
    }

    if (!email) {
      issues.push('Email is required.');
    } else if (!emailSchema.safeParse(email).success) {
      issues.push('Email is invalid.');
    }

    if (!row.phone) {
      issues.push('Phone is required.');
    } else if (!phoneResult.valid || !phoneResult.e164) {
      issues.push('Phone must be a valid E.164-compatible number.');
    }

    if (email && (duplicateEmailCounts.get(email) ?? 0) > 1) {
      issues.push('Email is duplicated within the CSV file.');
    }

    if (phoneResult.e164 && (duplicatePhoneCounts.get(phoneResult.e164) ?? 0) > 1) {
      issues.push('Phone is duplicated within the CSV file.');
    }

    if (externalId && (duplicateExternalIdCounts.get(externalId) ?? 0) > 1) {
      issues.push('External ID is duplicated within the CSV file.');
    }

    const emailIdentity = email ? identityByEmail.get(email) ?? null : null;
    const phoneIdentity = phoneResult.e164
      ? identityByPhone.get(phoneResult.e164) ?? null
      : null;

    if (emailIdentity && phoneIdentity && emailIdentity.id !== phoneIdentity.id) {
      issues.push('Email and phone match different existing identities.');
    }

    const resolvedIdentity = emailIdentity ?? phoneIdentity ?? null;
    const emailAccount = email ? authAccountByEmail.get(email) ?? null : null;
    const phoneAccount = phoneResult.e164
      ? authAccountByPhone.get(phoneResult.e164) ?? null
      : null;

    if (
      emailAccount &&
      resolvedIdentity &&
      emailAccount.identityId !== resolvedIdentity.id
    ) {
      issues.push('Email auth account belongs to another identity.');
    }

    if (
      phoneAccount &&
      resolvedIdentity &&
      phoneAccount.identityId !== resolvedIdentity.id
    ) {
      issues.push('Phone auth account belongs to another identity.');
    }

    const existingCustomer = resolvedIdentity
      ? customerByIdentityId.get(resolvedIdentity.id) ?? null
      : null;
    const externalIdCustomer = externalId
      ? customerByExternalId.get(externalId) ?? null
      : null;

    if (
      externalIdCustomer &&
      (!resolvedIdentity || externalIdCustomer.identityId !== resolvedIdentity.id)
    ) {
      issues.push('External ID already exists for another customer in this workspace.');
    }

    const status: WorkspaceCustomerCsvPreparedRow['status'] =
      issues.length > 0
        ? 'error'
        : existingCustomer
          ? 'existing'
          : 'ready';

    return {
      rowNumber: index + 2,
      source: {
        workspaceSlug: row.workspaceSlug,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        externalId: row.externalId,
      },
      normalized:
        issues.length > 0
          ? null
          : {
              workspaceSlug: normalizedWorkspaceSlug,
              firstName,
              lastName,
              email,
              phone: phoneResult.e164!,
              externalId,
            },
      status,
      issues,
      actions: {
        willCreateIdentity: status === 'ready' && !resolvedIdentity,
        willCreateEmailAuthAccount: status === 'ready' && !emailAccount,
        willCreatePhoneAuthAccount: status === 'ready' && !phoneAccount,
        willCreateCustomer: status === 'ready',
      },
    } satisfies WorkspaceCustomerCsvPreparedRow;
  });
}

async function importReadyRow(params: {
  workspaceId: string;
  row: NonNullable<WorkspaceCustomerCsvPreparedRow['normalized']>;
}) {
  const result = await provisionWorkspaceCustomer({
    workspaceId: params.workspaceId,
    firstName: params.row.firstName,
    lastName: params.row.lastName,
    email: params.row.email,
    phone: params.row.phone,
    externalId: params.row.externalId,
    allowExistingCustomer: true,
  });

  return {
    created: result.created,
    customerId: result.customerId,
  };
}

export async function prepareWorkspaceCustomerCsvImport(params: {
  workspaceId: string;
  csvText: string;
  fileName?: string | null;
}) {
  const workspace = await getWorkspaceById(params.workspaceId);
  const parsedRows = parseCsvText(params.csvText);

  if (parsedRows.length === 0) {
    throwError(ERR.INVALID_INPUT, 'CSV file is empty');
  }

  if (parsedRows.length === 1) {
    throwError(ERR.INVALID_INPUT, 'CSV file must include at least one data row');
  }

  const headerColumns = parseCsvColumns(parsedRows[0]);
  const dataRows = parsedRows.slice(1);

  if (dataRows.length > MAX_IMPORT_ROWS) {
    throwError(ERR.INVALID_INPUT, `CSV import supports up to ${MAX_IMPORT_ROWS} rows`);
  }

  const rawRows = dataRows.map((row) => createRowSource(headerColumns, row));
  const preparedRows = await resolvePreparedRows({
    workspaceId: params.workspaceId,
    workspaceSlug: workspace.slug,
    rawRows,
  });

  return {
    workspaceId: params.workspaceId,
    workspaceSlug: workspace.slug,
    fileName: params.fileName?.trim() || null,
    columns: headerColumns.filter(
      (column): column is WorkspaceCustomerCsvColumn => Boolean(column),
    ),
    summary: buildPreparedSummary(preparedRows),
    rows: preparedRows,
  } satisfies WorkspaceCustomerCsvPreparedImport;
}

export async function importWorkspaceCustomersFromCsv(params: {
  workspaceId: string;
  csvText: string;
  fileName?: string | null;
}) {
  const prepared = await prepareWorkspaceCustomerCsvImport(params);
  let importedRows = 0;

  for (const row of prepared.rows) {
    if (row.status !== 'ready' || !row.normalized) {
      continue;
    }

    const result = await importReadyRow({
      workspaceId: params.workspaceId,
      row: row.normalized,
    });

    if (result.created) {
      importedRows += 1;
    }
  }

  return {
    workspaceId: prepared.workspaceId,
    workspaceSlug: prepared.workspaceSlug,
    summary: {
      totalRows: prepared.summary.totalRows,
      importedRows,
      existingRows: prepared.summary.existingRows,
      errorRows: prepared.summary.errorRows,
      skippedRows: prepared.summary.existingRows + prepared.summary.errorRows,
    },
  } satisfies WorkspaceCustomerCsvImportResult;
}
