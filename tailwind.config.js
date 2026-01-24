/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#FFFAEB',
                    100: '#FFF0C2',
                    500: '#FFCC00',
                    600: '#E5B800',
                    900: '#665200',
                },
                apple: {
                    black: '#000000',
                    gray1: '#1C1C1E',
                    gray2: '#2C2C2E',
                    gray3: '#38383A',
                    gray4: '#48484A',
                    gray5: '#636366',
                    gray6: '#8E8E93',
                }
            },
            backdropBlur: {
                'xl': '24px',
            },
            borderRadius: {
                '2xl': '16px',
                '3xl': '24px',
            }
        },
    },
    plugins: [],
}
