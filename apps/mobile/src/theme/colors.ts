export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  inputBackground: string;
  messageUser: string;
  messageUserText: string;
  messageCoach: string;
  messageCoachText: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export const lightTheme: Theme = {
  primary: '#0084ff',
  secondary: '#44bec7',
  background: '#ffffff',
  surface: '#f0f2f5',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#65676b',
  inputBackground: '#f0f2f5',
  messageUser: '#0084ff',
  messageUserText: '#ffffff',
  messageCoach: '#e4e6eb',
  messageCoachText: '#000000',
  border: '#dddfe2',
  success: '#42b883',
  error: '#ff424d',
  warning: '#ffc107',
};

export const darkTheme: Theme = {
  primary: '#0084ff',
  secondary: '#44bec7',
  background: '#18191a',
  surface: '#242526',
  card: '#242526',
  text: '#e4e6eb',
  textSecondary: '#b0b3b8',
  inputBackground: '#3a3b3c',
  messageUser: '#0084ff',
  messageUserText: '#ffffff',
  messageCoach: '#3a3b3c',
  messageCoachText: '#e4e6eb',
  border: '#3e4042',
  success: '#42b883',
  error: '#ff424d',
  warning: '#ffc107',
};