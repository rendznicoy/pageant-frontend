import { defineStore } from "pinia";

export const useDarkModeStore = defineStore("darkMode", {
  state: () => ({
    isDarkMode: false,
  }),

  actions: {
    toggle() {
      this.isDarkMode = !this.isDarkMode;
      this.updateDOM();
      this.saveToStorage();
    },

    initializeDarkMode() {
      // Check localStorage first, then system preference
      const stored = localStorage.getItem("darkMode");
      if (stored !== null) {
        this.isDarkMode = JSON.parse(stored);
      } else {
        // Check system preference
        this.isDarkMode = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
      }
      this.updateDOM();
    },

    updateDOM() {
      if (this.isDarkMode) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
    },

    saveToStorage() {
      localStorage.setItem("darkMode", JSON.stringify(this.isDarkMode));
    },
  },
});
