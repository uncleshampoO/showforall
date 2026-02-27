/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'notebook-bg': '#1a1b1e',
                'notebook-card': '#25262b',
                'notebook-accent': '#4c6ef5',
                'notebook-text': '#c1c2c5',
                'notebook-highlight': '#373a40',
            },
            borderRadius: {
                'xl': '16px',
                '2xl': '24px',
            },
            fontFamily: {
                'sans': ['Inter', 'Google Sans', 'sans-serif'],
                'display': ['Outfit', 'sans-serif'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
