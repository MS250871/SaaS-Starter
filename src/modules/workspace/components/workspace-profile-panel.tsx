'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  AlertCircleIcon,
  Building2Icon,
  GlobeIcon,
  ImageIcon,
  Loader2Icon,
  MailIcon,
  MapPinnedIcon,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateWorkspaceProfileAction } from '@/modules/workspace/actions/update-workspace-profile.action';
import {
  workspaceProfileFormSchema,
  type WorkspaceProfileFormInput,
} from '@/modules/workspace/schema';
import type { WorkspaceProfileSettings } from '@/modules/workspace/settings';
import type { WorkspaceProfileAssetPreviewUrls } from '@/modules/workspace/services/workspace-profile-assets.services';
import { workspacePublicTemplateOptions } from '@/modules/workspace-public/contracts';

const logoAspectOptions = [
  {
    value: 'square',
    label: 'Square',
    help: 'Recommended size: 300px square.',
  },
  {
    value: '2:1',
    label: '2:1',
    help: 'Recommended size: 600 x 300px.',
  },
  {
    value: '3:1',
    label: '3:1',
    help: 'Recommended size: 900 x 300px.',
  },
  {
    value: '4:1',
    label: '4:1',
    help: 'Recommended size: 1200 x 300px.',
  },
] as const;

const brandingFormSchema = workspaceProfileFormSchema.pick({
  displayName: true,
  legalName: true,
  tagline: true,
  shortDescription: true,
  supportEmail: true,
});

const brandAssetsFormSchema = workspaceProfileFormSchema.pick({
  logoAspect: true,
});

const contactFormSchema = workspaceProfileFormSchema.pick({
  primaryContactName: true,
  supportPhone: true,
  supportWhatsapp: true,
  websiteUrl: true,
  addressLine1: true,
  addressLine2: true,
  addressCity: true,
  addressState: true,
  addressPostalCode: true,
  addressCountry: true,
});

const socialFormSchema = workspaceProfileFormSchema.pick({
  socialYoutube: true,
  socialLinkedin: true,
  socialInstagram: true,
  socialFacebook: true,
  socialX: true,
});

const websiteFormSchema = workspaceProfileFormSchema.pick({
  websiteTemplateKey: true,
  websiteSiteTitle: true,
  websiteMetaTitle: true,
  websiteMetaDescription: true,
  websiteOgImageUrl: true,
  websiteOgImageMediaId: true,
});

type BrandingFormInput = z.input<typeof brandingFormSchema>;
type BrandAssetsFormInput = z.input<typeof brandAssetsFormSchema>;
type ContactFormInput = z.input<typeof contactFormSchema>;
type SocialFormInput = z.input<typeof socialFormSchema>;
type WebsiteFormInput = z.input<typeof websiteFormSchema>;

type SaveSectionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

function buildProfileFormValues(
  profile: WorkspaceProfileSettings,
): WorkspaceProfileFormInput {
  const normalizedTemplateKey =
    workspacePublicTemplateOptions.find(
      (option) => option.key === profile.website?.templateKey,
    )?.key ?? 'coaching-classic';

  return {
    displayName: profile.branding?.displayName ?? '',
    legalName: profile.branding?.legalName ?? '',
    tagline: profile.branding?.tagline ?? '',
    shortDescription: profile.branding?.shortDescription ?? '',
    logoAspect: profile.branding?.logoAspect ?? 'square',
    supportEmail: profile.branding?.supportEmail ?? '',
    primaryContactName: profile.contact?.primaryContactName ?? '',
    supportPhone: profile.contact?.supportPhone ?? '',
    supportWhatsapp: profile.contact?.supportWhatsapp ?? '',
    websiteUrl: profile.contact?.websiteUrl ?? '',
    addressLine1: profile.contact?.address?.line1 ?? '',
    addressLine2: profile.contact?.address?.line2 ?? '',
    addressCity: profile.contact?.address?.city ?? '',
    addressState: profile.contact?.address?.state ?? '',
    addressPostalCode: profile.contact?.address?.postalCode ?? '',
    addressCountry: profile.contact?.address?.country ?? '',
    socialYoutube: profile.social?.youtube ?? '',
    socialLinkedin: profile.social?.linkedin ?? '',
    socialInstagram: profile.social?.instagram ?? '',
    socialFacebook: profile.social?.facebook ?? '',
    socialX: profile.social?.x ?? '',
    websiteTemplateKey: normalizedTemplateKey,
    websiteSiteTitle: profile.website?.siteTitle ?? '',
    websiteMetaTitle: profile.website?.defaultSeo?.metaTitle ?? '',
    websiteMetaDescription:
      profile.website?.defaultSeo?.metaDescription ?? '',
    websiteOgImageUrl: profile.website?.defaultSeo?.ogImageUrl ?? '',
    websiteOgImageMediaId:
      profile.website?.defaultSeo?.ogImageMediaId ?? '',
  };
}

function buildBrandingFormValues(
  profile: WorkspaceProfileSettings,
): BrandingFormInput {
  const values = buildProfileFormValues(profile);

  return {
    displayName: values.displayName,
    legalName: values.legalName,
    tagline: values.tagline,
    shortDescription: values.shortDescription,
    supportEmail: values.supportEmail,
  };
}

function buildBrandAssetsFormValues(
  profile: WorkspaceProfileSettings,
): BrandAssetsFormInput {
  return {
    logoAspect: profile.branding?.logoAspect ?? 'square',
  };
}

function buildContactFormValues(
  profile: WorkspaceProfileSettings,
): ContactFormInput {
  const values = buildProfileFormValues(profile);

  return {
    primaryContactName: values.primaryContactName,
    supportPhone: values.supportPhone,
    supportWhatsapp: values.supportWhatsapp,
    websiteUrl: values.websiteUrl,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    addressCity: values.addressCity,
    addressState: values.addressState,
    addressPostalCode: values.addressPostalCode,
    addressCountry: values.addressCountry,
  };
}

function buildSocialFormValues(
  profile: WorkspaceProfileSettings,
): SocialFormInput {
  const values = buildProfileFormValues(profile);

  return {
    socialYoutube: values.socialYoutube,
    socialLinkedin: values.socialLinkedin,
    socialInstagram: values.socialInstagram,
    socialFacebook: values.socialFacebook,
    socialX: values.socialX,
  };
}

function buildWebsiteFormValues(
  profile: WorkspaceProfileSettings,
): WebsiteFormInput {
  const values = buildProfileFormValues(profile);

  return {
    websiteTemplateKey: values.websiteTemplateKey,
    websiteSiteTitle: values.websiteSiteTitle,
    websiteMetaTitle: values.websiteMetaTitle,
    websiteMetaDescription: values.websiteMetaDescription,
    websiteOgImageUrl: values.websiteOgImageUrl,
    websiteOgImageMediaId: values.websiteOgImageMediaId,
  };
}

function AssetPreviewCard({
  title,
  previewUrl,
  assetUrl,
  mediaId,
  previewClassName,
}: {
  title: string;
  previewUrl: string | null;
  assetUrl: string | null | undefined;
  mediaId: string | null | undefined;
  previewClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <p className="text-sm font-medium">{title}</p>
      {previewUrl ? (
        <div className="mt-3 space-y-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-3">
            <Image
              alt={`${title} preview`}
              className={previewClassName}
              height={160}
              priority={false}
              src={previewUrl}
              width={240}
            />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Asset URL
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {assetUrl}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Media ID
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {mediaId ?? 'Not linked'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
          No {title.toLowerCase()} uploaded yet.
        </div>
      )}
    </div>
  );
}

function SaveSectionButton({
  disabled,
  isPending,
  label,
}: {
  disabled: boolean;
  isPending: boolean;
  label: string;
}) {
  return (
    <Button type="submit" disabled={disabled || isPending}>
      {isPending ? (
        <Loader2Icon className="mr-2 size-4 animate-spin" />
      ) : null}
      {label}
    </Button>
  );
}

function useResetFormWhenDefaultsChange<T extends Record<string, unknown>>(params: {
  form: {
    reset: (values: T) => void;
  };
  values: T;
}) {
  const serializedValues = JSON.stringify(params.values);
  const lastAppliedDefaultsRef = useRef<string>(serializedValues);

  useEffect(() => {
    if (lastAppliedDefaultsRef.current === serializedValues) {
      return;
    }

    params.form.reset(params.values);
    lastAppliedDefaultsRef.current = serializedValues;
  }, [params.form, params.values, serializedValues]);
}

function SectionFeedback({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  return (
    <>
      {message ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function BrandingPanel({
  canManageProfile,
  onSave,
  profile,
}: {
  canManageProfile: boolean;
  onSave: (values: Partial<WorkspaceProfileFormInput>) => Promise<SaveSectionResult>;
  profile: WorkspaceProfileSettings;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<BrandingFormInput>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: buildBrandingFormValues(profile),
  });
  const defaultValues = buildBrandingFormValues(profile);

  useResetFormWhenDefaultsChange({
    form,
    values: defaultValues,
  });

  const handleSubmit = (values: BrandingFormInput) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await onSave(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
    });
  };

  return (
    <Card className="border-border/70 bg-muted/10 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2Icon className="size-4 text-accent" />
          <CardTitle className="text-lg">Branding</CardTitle>
        </div>
        <CardDescription>
          Identity fields used across workspace login, public pages, and branded surfaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Display Name</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Skillmaxx Academy"
                  disabled={!canManageProfile || isPending}
                  {...form.register('displayName')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.displayName?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Legal Name</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Skillmaxx Academy Private Limited"
                  disabled={!canManageProfile || isPending}
                  {...form.register('legalName')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.legalName?.message}</FieldError>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Tagline</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Launch sharper learning programs."
                  disabled={!canManageProfile || isPending}
                  {...form.register('tagline')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.tagline?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Support Email</FieldLabel>
              <FieldContent>
                <Input
                  type="email"
                  placeholder="support@skillmaxx.com"
                  disabled={!canManageProfile || isPending}
                  {...form.register('supportEmail')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.supportEmail?.message}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel>Short Description</FieldLabel>
            <FieldContent>
              <Textarea
                rows={4}
                placeholder="A short public-facing summary for auth and website surfaces."
                disabled={!canManageProfile || isPending}
                {...form.register('shortDescription')}
              />
            </FieldContent>
            <FieldError>{form.formState.errors.shortDescription?.message}</FieldError>
          </Field>

          <SectionFeedback message={message} error={error} />

          <div className="pt-2">
            <SaveSectionButton
              disabled={!canManageProfile}
              isPending={isPending}
              label="Save Branding"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BrandAssetsPanel({
  canManageProfile,
  onSave,
  previewUrls,
  profile,
}: {
  canManageProfile: boolean;
  onSave: (params: {
    values: Partial<WorkspaceProfileFormInput>;
    logoFile?: File | null;
    faviconFile?: File | null;
  }) => Promise<SaveSectionResult>;
  previewUrls: WorkspaceProfileAssetPreviewUrls;
  profile: WorkspaceProfileSettings;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoFileInputKey, setLogoFileInputKey] = useState(0);
  const [faviconFileInputKey, setFaviconFileInputKey] = useState(0);

  const form = useForm<BrandAssetsFormInput>({
    resolver: zodResolver(brandAssetsFormSchema),
    defaultValues: buildBrandAssetsFormValues(profile),
  });
  const defaultValues = buildBrandAssetsFormValues(profile);

  useResetFormWhenDefaultsChange({
    form,
    values: defaultValues,
  });

  const logoAspect = useWatch({
    control: form.control,
    name: 'logoAspect',
  });

  const handleSubmit = (values: BrandAssetsFormInput) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await onSave({
        values,
        logoFile,
        faviconFile,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
      setLogoFile(null);
      setFaviconFile(null);
      setLogoFileInputKey((current) => current + 1);
      setFaviconFileInputKey((current) => current + 1);
    });
  };

  return (
    <Card className="border-border/70 bg-muted/10 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-accent" />
          <CardTitle className="text-lg">Logo &amp; Favicon</CardTitle>
        </div>
        <CardDescription>
          Upload the workspace logo and favicon used across auth, public, and browser surfaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <Field>
                <FieldLabel>Logo Aspect</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="logoAspect"
                    render={({ field }) => (
                      <div className="grid gap-3 md:grid-cols-2">
                        {logoAspectOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex cursor-pointer gap-3 rounded-xl border border-border/70 bg-background/70 p-3 text-sm"
                          >
                            <input
                              checked={field.value === option.value}
                              className="mt-1"
                              disabled={!canManageProfile || isPending}
                              name={field.name}
                              onBlur={field.onBlur}
                              onChange={() => field.onChange(option.value)}
                              type="radio"
                              value={option.value}
                            />
                            <span className="space-y-1">
                              <span className="block font-medium">{option.label}</span>
                              <span className="block text-xs text-muted-foreground">
                                {option.help}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                </FieldContent>
                <FieldError>{form.formState.errors.logoAspect?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>Upload Logo</FieldLabel>
                <FieldContent>
                  <Input
                    key={logoFileInputKey}
                    accept="image/*"
                    disabled={!canManageProfile || isPending}
                    onChange={(event) => {
                      setLogoFile(event.target.files?.[0] ?? null);
                    }}
                    type="file"
                  />
                </FieldContent>
                <FieldDescription>
                  Upload an image that matches the selected aspect.{' '}
                  {logoFile ? `Selected: ${logoFile.name}` : ''}
                </FieldDescription>
              </Field>
            </div>

            <AssetPreviewCard
              title={`Logo (${logoAspect})`}
              previewUrl={previewUrls.logoPreviewUrl}
              assetUrl={profile.branding?.logoUrl}
              mediaId={profile.branding?.logoMediaId}
              previewClassName={
                profile.branding?.logoAspect === 'square'
                  ? 'h-24 w-24 rounded-lg object-cover'
                  : 'h-16 w-auto max-w-full object-contain'
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <Field>
                <FieldLabel>Upload Favicon</FieldLabel>
                <FieldContent>
                  <Input
                    key={faviconFileInputKey}
                    accept="image/*"
                    disabled={!canManageProfile || isPending}
                    onChange={(event) => {
                      setFaviconFile(event.target.files?.[0] ?? null);
                    }}
                    type="file"
                  />
                </FieldContent>
                <FieldDescription>
                  Size should be 500px square only.{' '}
                  {faviconFile ? `Selected: ${faviconFile.name}` : ''}
                </FieldDescription>
              </Field>
            </div>

            <AssetPreviewCard
              title="Favicon"
              previewUrl={previewUrls.faviconPreviewUrl}
              assetUrl={profile.branding?.faviconUrl}
              mediaId={profile.branding?.faviconMediaId}
              previewClassName="h-12 w-12 rounded-lg object-cover"
            />
          </div>

          <SectionFeedback message={message} error={error} />

          <div className="pt-2">
            <SaveSectionButton
              disabled={!canManageProfile}
              isPending={isPending}
              label="Save Assets"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ContactPanel({
  canManageProfile,
  onSave,
  profile,
}: {
  canManageProfile: boolean;
  onSave: (values: Partial<WorkspaceProfileFormInput>) => Promise<SaveSectionResult>;
  profile: WorkspaceProfileSettings;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: buildContactFormValues(profile),
  });
  const defaultValues = buildContactFormValues(profile);

  useResetFormWhenDefaultsChange({
    form,
    values: defaultValues,
  });

  const handleSubmit = (values: ContactFormInput) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await onSave(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
    });
  };

  return (
    <Card className="border-border/70 bg-muted/10 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MailIcon className="size-4 text-accent" />
          <CardTitle className="text-lg">Contact</CardTitle>
        </div>
        <CardDescription>
          Public contact details and workspace address information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Primary Contact Name</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Admissions Team"
                  disabled={!canManageProfile || isPending}
                  {...form.register('primaryContactName')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.primaryContactName?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Website URL</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://skillmaxx.com"
                  disabled={!canManageProfile || isPending}
                  {...form.register('websiteUrl')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.websiteUrl?.message}</FieldError>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Support Phone</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="+91 9876543210"
                  disabled={!canManageProfile || isPending}
                  {...form.register('supportPhone')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.supportPhone?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Support WhatsApp</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="+91 9876543210"
                  disabled={!canManageProfile || isPending}
                  {...form.register('supportWhatsapp')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.supportWhatsapp?.message}</FieldError>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Address Line 1</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="123 Learning Street"
                  disabled={!canManageProfile || isPending}
                  {...form.register('addressLine1')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.addressLine1?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Address Line 2</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Suite 400"
                  disabled={!canManageProfile || isPending}
                  {...form.register('addressLine2')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.addressLine2?.message}</FieldError>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel>City</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Gurugram"
                  disabled={!canManageProfile || isPending}
                  {...form.register('addressCity')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.addressCity?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>State</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Haryana"
                  disabled={!canManageProfile || isPending}
                  {...form.register('addressState')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.addressState?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Postal Code</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="122001"
                  disabled={!canManageProfile || isPending}
                  {...form.register('addressPostalCode')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.addressPostalCode?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Country</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="India"
                  disabled={!canManageProfile || isPending}
                  {...form.register('addressCountry')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.addressCountry?.message}</FieldError>
            </Field>
          </div>

          <SectionFeedback message={message} error={error} />

          <div className="pt-2">
            <SaveSectionButton
              disabled={!canManageProfile}
              isPending={isPending}
              label="Save Contact"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SocialPanel({
  canManageProfile,
  onSave,
  profile,
}: {
  canManageProfile: boolean;
  onSave: (values: Partial<WorkspaceProfileFormInput>) => Promise<SaveSectionResult>;
  profile: WorkspaceProfileSettings;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SocialFormInput>({
    resolver: zodResolver(socialFormSchema),
    defaultValues: buildSocialFormValues(profile),
  });
  const defaultValues = buildSocialFormValues(profile);

  useResetFormWhenDefaultsChange({
    form,
    values: defaultValues,
  });

  const handleSubmit = (values: SocialFormInput) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await onSave(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
    });
  };

  return (
    <Card className="border-border/70 bg-muted/10 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GlobeIcon className="size-4 text-accent" />
          <CardTitle className="text-lg">Social</CardTitle>
        </div>
        <CardDescription>
          Social and distribution links attached to this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>YouTube</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://youtube.com/@skillmaxx"
                  disabled={!canManageProfile || isPending}
                  {...form.register('socialYoutube')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.socialYoutube?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>LinkedIn</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://linkedin.com/company/skillmaxx"
                  disabled={!canManageProfile || isPending}
                  {...form.register('socialLinkedin')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.socialLinkedin?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Instagram</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://instagram.com/skillmaxx"
                  disabled={!canManageProfile || isPending}
                  {...form.register('socialInstagram')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.socialInstagram?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Facebook</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://facebook.com/skillmaxx"
                  disabled={!canManageProfile || isPending}
                  {...form.register('socialFacebook')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.socialFacebook?.message}</FieldError>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>X</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://x.com/skillmaxx"
                  disabled={!canManageProfile || isPending}
                  {...form.register('socialX')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.socialX?.message}</FieldError>
            </Field>
          </div>

          <SectionFeedback message={message} error={error} />

          <div className="pt-2">
            <SaveSectionButton
              disabled={!canManageProfile}
              isPending={isPending}
              label="Save Social"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function WebsitePanel({
  canManageProfile,
  onSave,
  profile,
}: {
  canManageProfile: boolean;
  onSave: (values: Partial<WorkspaceProfileFormInput>) => Promise<SaveSectionResult>;
  profile: WorkspaceProfileSettings;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<WebsiteFormInput>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: buildWebsiteFormValues(profile),
  });
  const defaultValues = buildWebsiteFormValues(profile);

  useResetFormWhenDefaultsChange({
    form,
    values: defaultValues,
  });

  const handleSubmit = (values: WebsiteFormInput) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await onSave(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
    });
  };

  return (
    <Card className="border-border/70 bg-muted/10 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPinnedIcon className="size-4 text-accent" />
          <CardTitle className="text-lg">Website Defaults</CardTitle>
        </div>
        <CardDescription>
          Stable website-level identity and SEO defaults. Builder pages and sections will still live outside workspace settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Template Key</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="websiteTemplateKey"
                  render={({ field }) => (
                    <Select
                      disabled={!canManageProfile || isPending}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspacePublicTemplateOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldContent>
              <FieldDescription>
                Template keys come from the workspace public template registry.
              </FieldDescription>
              <FieldError>{form.formState.errors.websiteTemplateKey?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Site Title</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Skillmaxx Academy"
                  disabled={!canManageProfile || isPending}
                  {...form.register('websiteSiteTitle')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.websiteSiteTitle?.message}</FieldError>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Meta Title</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Skillmaxx Academy | Career-focused learning"
                  disabled={!canManageProfile || isPending}
                  {...form.register('websiteMetaTitle')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.websiteMetaTitle?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Open Graph Image URL</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="https://cdn.example.com/og-image.png"
                  disabled={!canManageProfile || isPending}
                  {...form.register('websiteOgImageUrl')}
                />
              </FieldContent>
              <FieldError>{form.formState.errors.websiteOgImageUrl?.message}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel>Meta Description</FieldLabel>
            <FieldContent>
              <Textarea
                rows={4}
                placeholder="Global default SEO description for the workspace website."
                disabled={!canManageProfile || isPending}
                {...form.register('websiteMetaDescription')}
              />
            </FieldContent>
            <FieldError>{form.formState.errors.websiteMetaDescription?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Open Graph Image Media ID</FieldLabel>
            <FieldContent>
              <Input
                placeholder="Optional media reference"
                disabled={!canManageProfile || isPending}
                {...form.register('websiteOgImageMediaId')}
              />
            </FieldContent>
            <FieldError>{form.formState.errors.websiteOgImageMediaId?.message}</FieldError>
          </Field>

          <SectionFeedback message={message} error={error} />

          <div className="pt-2">
            <SaveSectionButton
              disabled={!canManageProfile}
              isPending={isPending}
              label="Save Website"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function WorkspaceProfilePanel({
  initialAssetPreviewUrls,
  initialProfile,
  canManageProfile,
}: {
  initialAssetPreviewUrls: WorkspaceProfileAssetPreviewUrls;
  initialProfile: WorkspaceProfileSettings;
  canManageProfile: boolean;
}) {
  const router = useRouter();
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [savedPreviewUrls, setSavedPreviewUrls] = useState(
    initialAssetPreviewUrls,
  );

  const saveProfileSection = async (params: {
    values?: Partial<WorkspaceProfileFormInput>;
    logoFile?: File | null;
    faviconFile?: File | null;
  }): Promise<SaveSectionResult> => {
    const nextValues: WorkspaceProfileFormInput = {
      ...buildProfileFormValues(savedProfile),
      ...(params.values ?? {}),
    };
    const formData = new FormData();

    Object.entries(nextValues).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });

    if (params.logoFile) {
      formData.append('logoFile', params.logoFile);
    }

    if (params.faviconFile) {
      formData.append('faviconFile', params.faviconFile);
    }

    const response = await updateWorkspaceProfileAction(formData);

    if (!response.success) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    setSavedProfile(response.data.profile);
    setSavedPreviewUrls(response.data.assetPreviewUrls);
    router.refresh();

    return {
      success: true,
      message: response.data.successMessage,
    };
  };

  return (
    <section className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Workspace Profile</CardTitle>
          <CardDescription>
            Manage the stable brand, contact, social, and website defaults for this workspace. Theme, billing, and domains continue to live in their own settings areas.
          </CardDescription>
        </CardHeader>
      </Card>

      {!canManageProfile ? (
        <Alert>
          <AlertTitle>Read only</AlertTitle>
          <AlertDescription>
            Updating the workspace profile requires the `workspaceSettings.update` permission.
          </AlertDescription>
        </Alert>
      ) : null}

      <BrandingPanel
        canManageProfile={canManageProfile}
        onSave={(values) => saveProfileSection({ values })}
        profile={savedProfile}
      />

      <BrandAssetsPanel
        canManageProfile={canManageProfile}
        onSave={saveProfileSection}
        previewUrls={savedPreviewUrls}
        profile={savedProfile}
      />

      <ContactPanel
        canManageProfile={canManageProfile}
        onSave={(values) => saveProfileSection({ values })}
        profile={savedProfile}
      />

      <SocialPanel
        canManageProfile={canManageProfile}
        onSave={(values) => saveProfileSection({ values })}
        profile={savedProfile}
      />

      <WebsitePanel
        canManageProfile={canManageProfile}
        onSave={(values) => saveProfileSection({ values })}
        profile={savedProfile}
      />
    </section>
  );
}
