import {
  workspacePublicTemplateKeys,
  type WorkspacePublicHomeContract,
  type WorkspacePublicTemplateKey,
} from '@/modules/workspace-public/contracts';

type WebsiteSettings = {
  templateKey?: string | null;
};

type BrandingSettings = {
  displayName?: string | null;
  logoUrl?: string | null;
  supportEmail?: string | null;
};

type WorkspaceSettingsShape = {
  branding?: BrandingSettings;
  website?: WebsiteSettings;
};

function normalizeDisplayName(
  workspaceName: string,
  branding?: BrandingSettings,
) {
  return branding?.displayName?.trim() || workspaceName;
}

export function resolveWorkspacePublicTemplateKey(
  settings: WorkspaceSettingsShape | null | undefined,
): WorkspacePublicTemplateKey {
  if (
    settings?.website?.templateKey &&
    workspacePublicTemplateKeys.includes(
      settings.website.templateKey as WorkspacePublicTemplateKey,
    )
  ) {
    return settings.website.templateKey as WorkspacePublicTemplateKey;
  }

  return 'coaching-classic';
}

export function buildWorkspacePublicHomeContract(params: {
  workspaceName: string;
  workspaceSlug: string;
  settings?: WorkspaceSettingsShape | null;
  loginPath: string;
  signupPath: string;
  continuePath: string | null;
  continueLabel: string | null;
}): WorkspacePublicHomeContract {
  const displayName = normalizeDisplayName(
    params.workspaceName,
    params.settings?.branding,
  );
  const logoUrl = params.settings?.branding?.logoUrl?.trim() || null;
  const supportEmail =
    params.settings?.branding?.supportEmail?.trim() ||
    `admissions@${params.workspaceSlug}.academy`;
  const primaryAction =
    params.continuePath && params.continueLabel
      ? {
          label: params.continueLabel,
          href: params.continuePath,
        }
      : {
          label: 'Start learner signup',
          href: params.signupPath,
        };
  const secondaryAction =
    params.continuePath && params.continueLabel
      ? {
          label: 'Sign in',
          href: params.loginPath,
        }
      : {
          label: 'Sign in',
          href: params.loginPath,
        };

  return {
    site: {
      name: displayName,
      logoUrl,
      description:
        `${displayName} offers live language coaching with level-based cohorts, speaking practice, and consistent mentor feedback.`,
      supportEmail,
      nav: [
        { label: 'Why us', href: '#why-us' },
        { label: 'Courses', href: '#courses' },
        { label: 'Reviews', href: '#reviews' },
      ],
    },
    hero: {
      eyebrow: 'Language coaching for serious learners',
      headline:
        'German, French, Spanish, and English coaching designed for confident speaking.',
      subheadline:
        'Join live online cohorts, move through clear levels, and build real communication skills with mentor-led sessions, practice labs, and personal feedback.',
      primaryAction,
      secondaryAction,
    },
    features: [
      {
        title: 'Small live batches',
        description:
          'Interactive classes with room to speak, ask questions, and get corrected in real time.',
      },
      {
        title: 'Level-based progression',
        description:
          'Move from beginner to advanced with structured tracks mapped to clear language outcomes.',
      },
      {
        title: 'Speaking-first approach',
        description:
          'Conversation drills, pronunciation work, and practice sessions built into the weekly rhythm.',
      },
      {
        title: 'Mentor feedback loops',
        description:
          'Regular checkpoints, revision support, and coaching that keeps learners moving forward.',
      },
    ],
    courses: [
      {
        language: 'German',
        level: 'Beginner A1-A2',
        title: 'German Foundations',
        description:
          'Build everyday speaking confidence with grammar essentials, guided listening, and live conversation practice.',
        meta: 'Weekend + weekday batches',
      },
      {
        language: 'French',
        level: 'Intermediate B1',
        title: 'French Progress Track',
        description:
          'Strengthen fluency, sentence flow, and comprehension through discussion-led lessons and role-play practice.',
        meta: 'Live speaking labs included',
      },
      {
        language: 'Spanish',
        level: 'Conversation Lab',
        title: 'Spanish for Real Use',
        description:
          'A practical speaking-focused track for learners who want clear pronunciation and natural everyday expression.',
        meta: 'High-speaking practice format',
      },
      {
        language: 'English',
        level: 'Advanced Communication',
        title: 'English Fluency Studio',
        description:
          'Refine spoken clarity, presentation flow, and professional communication with coached feedback and performance drills.',
        meta: 'Ideal for professionals and advanced learners',
      },
    ],
    testimonials: [
      {
        quote:
          'The classes were structured, but never stiff. I started speaking in German much earlier than I expected.',
        name: 'Ananya Mehta',
        role: 'German learner',
      },
      {
        quote:
          'What stood out was the attention to speaking confidence. The French sessions felt personal and precise.',
        name: 'Karan Bedi',
        role: 'French cohort student',
      },
      {
        quote:
          'The mentors push you just enough. Spanish practice became part of my routine instead of something I kept postponing.',
        name: 'Sonia Dsouza',
        role: 'Spanish conversation learner',
      },
    ],
    ctaStrip: {
      eyebrow: 'Ready for your next cohort?',
      headline:
        'Choose your language, join the right level, and start learning with live guidance.',
      subheadline:
        'Create your learner account to explore the current intake and continue from a structured portal built for ongoing progress.',
      primaryAction,
      secondaryAction,
    },
    footer: {
      blurb:
        'Live language learning with clear levels, real speaking practice, and mentor-led momentum.',
      supportLabel: 'Admissions',
      supportValue: supportEmail,
      legalLine: `Powered by ${displayName} on SkillMaxx.`,
    },
  };
}
