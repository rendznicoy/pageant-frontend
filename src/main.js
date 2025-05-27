import { createApp } from "vue";
import { createPinia } from "pinia";
import { useUserStore } from "@/stores/user";
import { useDarkModeStore } from "@/stores/darkMode";
import mitt from "mitt";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import "@/assets/css/tailwind.css";
import "@fortawesome/fontawesome-free/css/all.css";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import FlatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import FloatingVue from "floating-vue";
import "floating-vue/dist/style.css";

const app = createApp(App);
const emitter = mitt();

const defaultFlatPickrConfig = {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  time_24hr: false,
  minuteIncrement: 5,
  altInput: true,
  altFormat: "F j, Y h:i K",
  static: true,
  position: "auto",
  disableMobile: true,
  timePicker: {
    showHours: true,
    showMinutes: true,
    showSeconds: false,
  },
};

app.component("FlatPickr", {
  extends: FlatPickr,
  props: {
    config: {
      type: Object,
      default: () => ({ ...defaultFlatPickrConfig }),
    },
  },
});

// Create debounced toast functions to prevent spam
let lastErrorMessage = "";
let lastErrorTime = 0;
let lastSuccessMessage = "";
let lastSuccessTime = 0;

const showDebouncedError = (message) => {
  const now = Date.now();

  // Ignore auth-related error messages that are handled by axios interceptor
  const authErrorPatterns = [
    "authentication failed",
    "account may have been deleted",
    "user account not found",
    "unauthorized",
    "unauthenticated",
    "no authentication token",
    "token not found",
  ];

  const isAuthError = authErrorPatterns.some((pattern) =>
    message.toLowerCase().includes(pattern)
  );

  if (isAuthError) {
    console.info(
      "Suppressing auth error toast (handled by interceptor):",
      message
    );
    return;
  }

  // Prevent duplicate error messages within 3 seconds
  if (message === lastErrorMessage && now - lastErrorTime < 3000) {
    return;
  }

  lastErrorMessage = message;
  lastErrorTime = now;

  if (app.config.globalProperties.$toast) {
    app.config.globalProperties.$toast.error(message);
  }
};

const showDebouncedSuccess = (message) => {
  const now = Date.now();

  // Prevent duplicate success messages within 2 seconds
  if (message === lastSuccessMessage && now - lastSuccessTime < 2000) {
    return;
  }

  lastSuccessMessage = message;
  lastSuccessTime = now;

  if (app.config.globalProperties.$toast) {
    app.config.globalProperties.$toast.success(message);
  }
};

// Global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error("Vue error:", err);
  console.error("Component:", vm);
  console.error("Info:", info);

  const message =
    typeof err === "string"
      ? err
      : err?.message ||
        "An unexpected error occurred. Please check your input and try again.";

  showDebouncedError(message);
};

app.use(createPinia());

// Initialize dark mode after pinia is set up
const darkModeStore = useDarkModeStore();
darkModeStore.initializeDarkMode();

app.use(router);
app.config.globalProperties.emitter = emitter;

// Configure toast with better settings
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 5, // Reduced from 20 to prevent clutter
  newestOnTop: true,
  position: "top-right",
  closeOnClick: true,
  pauseOnHover: true,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false,
  toastDefaults: {
    success: {
      timeout: 4000,
      className: "bg-green-600 text-white",
      hideProgressBar: false,
    },
    error: {
      timeout: 6000,
      className: "bg-red-600 text-white",
      hideProgressBar: false,
    },
    info: {
      timeout: 4000,
      className: "bg-blue-600 text-white",
    },
    warning: {
      timeout: 5000,
      className: "bg-yellow-600 text-white",
    },
  },
});

app.use(FloatingVue);

// Make debounced toast functions globally available
app.config.globalProperties.$showError = showDebouncedError;
app.config.globalProperties.$showSuccess = showDebouncedSuccess;

// Initialize user authentication
const userStore = useUserStore();
const token = localStorage.getItem("token");

if (token) {
  // Silent user fetch on app start
  userStore
    .fetchUser(true)
    .then(() => {
      app.mount("#app");
    })
    .catch(() => {
      // If initial auth check fails, still mount the app
      console.info("Initial auth check failed - user will need to log in");
      app.mount("#app");
    });
} else {
  app.mount("#app");
}

// Export debounced functions for use in other modules
export { showDebouncedError, showDebouncedSuccess };
