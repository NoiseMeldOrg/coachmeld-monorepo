import 'react-native-url-polyfill/auto';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('Starting CoachMeld with React DOM...');

// Use React DOM instead of AppRegistry to avoid renderer conflicts
const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App));