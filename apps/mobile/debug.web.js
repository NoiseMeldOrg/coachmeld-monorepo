// Simple debug entry point to test React initialization
import * as React from 'react';
import { AppRegistry } from 'react-native';
import { View, Text } from 'react-native';

// Ensure React is available globally BEFORE any components load
window.React = React;
globalThis.React = React;

// Also expose React as a module global
if (typeof global !== 'undefined') {
  global.React = React;
}

// Force React to use our instance
window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};

console.log('React available:', !!React);
console.log('React.useState available:', !!React.useState);
console.log('React.useEffect available:', !!React.useEffect);
console.log('React default export:', !!React.default);
console.log('React keys:', Object.keys(React));

// Simple test component without any complex imports
function SimpleApp() {
  console.log('SimpleApp rendering...');
  
  try {
    // Use the default export if available
    const ReactToUse = React.default || React;
    console.log('Using React:', ReactToUse === React ? 'namespace' : 'default');
    
    const [count, setCount] = ReactToUse.useState(0);
    
    ReactToUse.useEffect(() => {
      console.log('useEffect working!');
    }, []);
    
    return React.createElement(View, { 
      style: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#fff'
      } 
    }, 
      React.createElement(Text, { 
        style: { fontSize: 24, color: '#000' } 
      }, 'React Hooks Working! Count: ' + count),
      React.createElement('button', {
        onClick: () => setCount(count + 1),
        style: { marginTop: 20, padding: 10 }
      }, 'Increment')
    );
  } catch (error) {
    console.error('Error in SimpleApp:', error);
    return React.createElement(View, { 
      style: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f00'
      } 
    }, 
      React.createElement(Text, { 
        style: { fontSize: 18, color: '#fff' } 
      }, 'Error: ' + error.message)
    );
  }
}

console.log('Registering SimpleApp...');
AppRegistry.registerComponent('main', () => SimpleApp);
AppRegistry.runApplication('main', { rootTag: document.getElementById('root') });