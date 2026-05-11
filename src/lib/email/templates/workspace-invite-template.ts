function formatExpiry(expiresAt?: Date | null) {
  if (!expiresAt) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expiresAt);
}

export function workspaceInviteTemplate(params: {
  workspaceName: string;
  signupUrl: string;
  role: string;
  inviterName?: string | null;
  expiresAt?: Date | null;
}) {
  const expiryLabel = formatExpiry(params.expiresAt);

  return {
    subject: `You're invited to join ${params.workspaceName} on SkillMaxx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; color: #111827;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #6b7280;">
          Workspace invite
        </p>
        <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.2;">
          Join ${params.workspaceName}
        </h1>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
          ${params.inviterName ? `${params.inviterName} has` : "You've"} invited you to join the
          <strong>${params.workspaceName}</strong> workspace on SkillMaxx as
          <strong>${params.role}</strong>.
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
          Click the button below to continue to signup and accept your invite.
        </p>
        <p style="margin: 0 0 24px;">
          <a
            href="${params.signupUrl}"
            style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #111827; color: #ffffff; text-decoration: none; font-weight: 600;"
          >
            Accept invite
          </a>
        </p>
        <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #4b5563;">
          If the button does not work, open this link directly:
        </p>
        <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; word-break: break-all; color: #2563eb;">
          <a href="${params.signupUrl}" style="color: #2563eb; text-decoration: none;">
            ${params.signupUrl}
          </a>
        </p>
        ${
          expiryLabel
            ? `<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">This invite expires on ${expiryLabel}.</p>`
            : ""
        }
      </div>
    `,
  };
}
