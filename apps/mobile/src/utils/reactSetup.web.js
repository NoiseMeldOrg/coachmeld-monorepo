// React setup for web builds to prevent hooks import errors
import React from 'react';

// Ensure React is available globally
if (typeof window !== 'undefined') {
  window.React = React;
  window.React.useState = React.useState;
  window.React.useEffect = React.useEffect;
  window.React.useContext = React.useContext;
  window.React.useReducer = React.useReducer;
  window.React.useCallback = React.useCallback;
  window.React.useMemo = React.useMemo;
  window.React.useRef = React.useRef;
  window.React.useImperativeHandle = React.useImperativeHandle;
  window.React.useLayoutEffect = React.useLayoutEffect;
  window.React.useDebugValue = React.useDebugValue;
  window.React.createContext = React.createContext;
  window.React.createElement = React.createElement;
  window.React.Component = React.Component;
  window.React.PureComponent = React.PureComponent;
  window.React.Fragment = React.Fragment;
}

export default React;