export type LoginState = {
  errors?: Record<string, string>;
  formError?: string;
};

export type SignupState = {
  errors?: Record<string, string>;
  formError?: string;
};

export type VerifyState = {
  errors?: {
    otp?: string;
  };
  formError?: string;
};

export type IdentifierType = 'email' | 'phone';

export type ParsedIdentifier = {
  type: IdentifierType;
  value: string;
};

export type Mode = 'email' | 'phone';
