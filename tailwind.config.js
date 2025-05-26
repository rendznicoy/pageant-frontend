/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // or 'media'
  content: ["./index.html", "./src/**/*.{html,vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        fontFamily: {
          sans: ["Poppins", "sans-serif"],
        },
        colors: {
          // custom shadcn-ish palette
          primary: {
            DEFAULT: "#22c55e", // green-500
            foreground: "#ffffff",
          },
          secondary: {
            DEFAULT: "#facc15", // yellow-400
            foreground: "#1f2937", // gray-800
          },
          muted: {
            DEFAULT: "#f3f4f6", // gray-100
            foreground: "#4b5563", // gray-600
          },
        },
      },
    },
  },
  plugins: [],
};
