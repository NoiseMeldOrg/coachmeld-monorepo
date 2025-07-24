// Import React before anything else to ensure it's available globally
import React from 'react';
import { registerRootComponent } from 'expo';

// Import web polyfills for React Native modules
import 'react-native-url-polyfill/auto';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
