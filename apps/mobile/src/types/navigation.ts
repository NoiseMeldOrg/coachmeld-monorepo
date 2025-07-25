export type RootStackParamList = {
  Auth: undefined;
  EmailConfirmation: { email: string };
  MainTabs: undefined;
  DietSelection: undefined;
  Marketplace: undefined;
  Subscription: undefined;
  PaymentSuccess: undefined;
  EditProfile: undefined;
  EditProfileField: { field: string; currentProfile: any };
  PrivacyPolicy: undefined;
  GDPRConsent: { isNewUser: boolean };
  PrivacySettings: undefined;
  DataExport: undefined;
  DeleteAccount: undefined;
  DataCorrection: undefined;
  ConsentManagement: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Coach: undefined;
  Meals: undefined;
  Profile: undefined;
};