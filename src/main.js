import { mount } from 'svelte';
import App from './views/App.svelte';
import './app.css';

const app = mount(App, { target: document.getElementById('app') });

export default app;
