// Pure React DOM approach - bypass React Native Web entirely
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('Pure React test starting...');
console.log('React available:', !!React);
console.log('React.useState available:', !!React.useState);

function PureReactApp() {
  console.log('PureReactApp rendering...');
  
  try {
    const [count, setCount] = React.useState(0);
    
    React.useEffect(() => {
      console.log('Pure React useEffect working!');
    }, []);
    
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        fontFamily: 'Arial, sans-serif'
      }
    }, [
      React.createElement('h1', { 
        key: 'title',
        style: { fontSize: '24px', color: '#333' } 
      }, 'Pure React Working! ✅'),
      React.createElement('p', { 
        key: 'count',
        style: { fontSize: '18px', margin: '20px 0' } 
      }, `Count: ${count}`),
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
          cursor: 'pointer'
        }
      }, 'Increment'),
      React.createElement('p', { 
        key: 'success',
        style: { fontSize: '14px', color: 'green', marginTop: '20px' } 
      }, 'React hooks are working correctly!')
    ]);
  } catch (error) {
    console.error('Error in PureReactApp:', error);
    return React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#ff0000',
        color: 'white',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif'
      }
    }, `Error: ${error.message}`);
  }
}

console.log('Creating React root...');
const container = document.getElementById('root');
const root = createRoot(container);
console.log('Rendering PureReactApp...');
root.render(React.createElement(PureReactApp));