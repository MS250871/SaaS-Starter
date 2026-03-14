export const pricingPlans = [
  {
    name: 'Free Trial',
    price: '$0',
    description: 'Try the platform and explore multi-tenant capabilities.',
    features: [
      '14 day trial',
      'Create one organization',
      'Tenant dashboard access',
      'Basic tenant theming',
      'Invite up to 3 users',
    ],
    button: 'Start Free Trial',
  },

  {
    name: 'Professional',
    price: '$29',
    description: 'Perfect for growing teams and SaaS experimentation.',
    features: [
      'Unlimited users',
      'Tenant theming',
      'Subdomain routing',
      'Team collaboration',
      'Email invitations',
    ],
    button: 'Start Professional',
    highlight: true,
  },

  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Full white-label SaaS deployment with custom domains.',
    features: [
      'Unlimited organizations',
      'Custom domain support',
      'Advanced theming',
      'Priority support',
      'Enterprise onboarding',
    ],
    button: 'Contact Sales',
  },
];
