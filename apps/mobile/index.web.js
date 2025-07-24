import 'react-native-url-polyfill/auto';
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('Starting CoachMeld with React DOM...');
console.log('React version:', React.version);
console.log('React hooks available:', {
  useState: !!React.useState,
  useEffect: !!React.useEffect,
  useContext: !!React.useContext,
  useCallback: !!React.useCallback
});

// Ensure React is globally available for all components
if (typeof window !== 'undefined') {
  window.React = React;
  console.log('React set globally on window');
}

// Import App after React is fully set up
const App = require('./App').default;

// Use React DOM instead of AppRegistry to avoid renderer conflicts
const container = document.getElementById('root');
if (!container) {
  console.error('Root container not found!');
} else {
  console.log('Root container found, creating React root...');
  const root = createRoot(container);
  
  // Wrap in error boundary
  const AppWithErrorBoundary = React.createElement(
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      
      componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught error:', error, errorInfo);
      }
      
      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: {
              padding: '20px',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '4px',
              margin: '20px',
              fontFamily: 'Arial, sans-serif'
            }
          }, [
            React.createElement('h2', { key: 'title' }, 'Something went wrong'),
            React.createElement('pre', { 
              key: 'error',
              style: { fontSize: '12px', overflow: 'auto' }
            }, this.state.error?.toString() || 'Unknown error')
          ]);
        }
        
        return React.createElement(App);
      }
    }
  );
  
  console.log('Rendering app with error boundary...');
  root.render(AppWithErrorBoundary);
}