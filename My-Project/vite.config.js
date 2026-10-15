import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const proxy = { '/api': { target: process.env.API_TARGET || 'http://127.0.0.1:8092', changeOrigin: true } };
export default defineConfig({ plugins:[react()], server:{host:'0.0.0.0',allowedHosts:true,proxy}, preview:{host:'0.0.0.0',allowedHosts:true,proxy} });
