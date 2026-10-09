interface UserAgentData {
  readonly brands: readonly unknown[];
  readonly mobile: boolean;
}

export type NavigatorWithUserAgentData = Navigator & { readonly userAgentData?: UserAgentData };
