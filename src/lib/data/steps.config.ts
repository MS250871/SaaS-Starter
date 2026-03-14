import {
  UserPlus,
  Building,
  Paintbrush,
  LayoutDashboard,
  UserPlus2,
  Globe,
} from 'lucide-react';

export const steps = [
  {
    icon: UserPlus,
    title: 'Sign Up or Log In',
    description:
      'Create an account or log in to access the platform. After authentication, the system checks whether you already belong to an organization or need to create a new tenant workspace.',
  },
  {
    icon: Building,
    title: 'Create Your Organization',
    description:
      'New users create an organization which becomes their dedicated tenant environment. This workspace provides isolated data, configuration, and tenant routing.',
  },
  {
    icon: Paintbrush,
    title: 'Customize Tenant Branding',
    description:
      'Define your organization’s branding including primary colors, fonts, logo, and hero imagery to create a fully customized tenant experience.',
  },
  {
    icon: LayoutDashboard,
    title: 'Enter the Tenant Dashboard',
    description:
      'Once setup is complete, the platform generates a tenant session and redirects you to your tenant dashboard where all activity occurs within your organization.',
  },
  {
    icon: UserPlus2,
    title: 'Invite Your Team',
    description:
      'Invite additional users to collaborate within your organization. All members share the same tenant workspace while maintaining strict tenant isolation.',
  },
  {
    icon: Globe,
    title: 'Access Through Flexible Routing',
    description:
      'Tenants can be accessed through multiple routing strategies including path-based URLs, subdomains, or custom domains for a fully white-label SaaS experience.',
  },
];
