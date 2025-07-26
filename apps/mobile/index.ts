import React from 'react';
import { registerRootComponent } from 'expo';
import 'react-native-url-polyfill/auto';
import App from './App';

// Workaround for Expo dev tools React hooks error
if (__DEV__) {
  // Ensure React is available globally for Expo dev tools
  global.React = React;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);