import 'react-native-url-polyfill/auto';
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('Starting CoachMeld with React DOM...');
console.log('React version:', React.version);

// Create a simple web-only app to test if React works independently
function SimpleWebApp() {
  const [count, setCount] = React.useState(0);
  const [message, setMessage] = React.useState('Loading CoachMeld...');
  
  React.useEffect(() => {
    console.log('SimpleWebApp useEffect running');
    setMessage('CoachMeld Web Version - Basic React Working!');
  }, []);
  
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }
  }, [
    React.createElement('h1', { 
      key: 'title',
      style: { color: '#333', marginBottom: '20px' }
    }, 'CoachMeld'),
    React.createElement('p', { 
      key: 'message',
      style: { fontSize: '18px', color: '#666', marginBottom: '20px' }
    }, message),
    React.createElement('p', { 
      key: 'count',
      style: { fontSize: '16px', marginBottom: '10px' }
    }, `Button clicks: ${count}`),
    React.createElement('button', {
      key: 'button',
      onClick: () => setCount(count + 1),
      style: {
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginBottom: '20px'
      }
    }, 'Test React Hooks'),
    React.createElement('div', {
      key: 'info',
      style: {
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d7ff',
        borderRadius: '5px',
        padding: '15px',
        maxWidth: '600px',
        textAlign: 'center'
      }
    }, [
      React.createElement('p', { 
        key: 'info-text',
        style: { margin: '0', fontSize: '14px', color: '#333' }
      }, '✅ React DOM is working! The mobile app components are having compatibility issues with web builds. This is a temporary web version while we resolve the React Native Web conflicts.')
    ])
  ]);
}

// Use React DOM instead of the problematic React Native Web AppRegistry
const container = document.getElementById('root');
if (!container) {
  console.error('Root container not found!');
} else {
  console.log('Root container found, creating React root...');
  const root = createRoot(container);
  
  // For now, use the simple web app instead of the full React Native app
  // This proves React works and gives users a basic interface
  console.log('Rendering simple web app...');
  root.render(React.createElement(SimpleWebApp));
}