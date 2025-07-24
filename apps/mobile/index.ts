// Import React and make it globally available for web builds
import React from 'react';

// Ensure React is globally available for web platform
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

import { registerRootComponent } from 'expo';

// Import web polyfills for React Native modules
import 'react-native-url-polyfill/auto';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
