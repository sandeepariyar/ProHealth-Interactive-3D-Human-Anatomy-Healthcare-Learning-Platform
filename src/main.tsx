import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

const node = document.getElementById('root');
if (!node) throw new Error('Root element not found');
createRoot(node).render(<React.StrictMode><App /></React.StrictMode>);
