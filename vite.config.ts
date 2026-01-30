import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'framer-motion', 'lucide-react', 'react-hot-toast'],
              client: ['./components/Cardapio.tsx', './components/LoginScreen.tsx'],
              pos: ['./components/POS.tsx', './components/SimplePOS.tsx', './components/CartSidebar.tsx'],
              admin: ['./components/AdminDashboard.tsx', './components/SalesReports.tsx', './components/ExpenseManager.tsx']
            }
          }
        }
      }
    };
});
