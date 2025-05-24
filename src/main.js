import { createApp } from "vue";
import { createPinia } from "pinia";
import { useUserStore } from "@/stores/user";
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

  app.config.globalProperties.$toast?.error(message);
};

app.use(createPinia());
app.use(router);
app.config.globalProperties.emitter = emitter;
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 20,
  newestOnTop: true,
  position: "top-right",
  closeOnClick: true,
  pauseOnHover: true,
  toastDefaults: {
    success: { timeout: 5000, className: "bg-green-600 text-white" },
    error: { timeout: 5000, className: "bg-red-600 text-white" },
  },
});
app.use(FloatingVue);

const userStore = useUserStore();
const token = localStorage.getItem("token");
if (token) {
  userStore.fetchUser().then((isAuthenticated) => {
    console.log("User authenticated:", isAuthenticated, userStore.user);
    app.mount("#app");
  });
} else {
  console.log("No token found, skipping initial fetchUser.");
  app.mount("#app");
}
