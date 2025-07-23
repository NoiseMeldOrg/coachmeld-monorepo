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
};

export type MainTabParamList = {
  Home: undefined;
  Coach: undefined;
  Meals: undefined;
  Profile: undefined;
};