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

const userStore = useUserStore();
userStore.fetchUser().then((isAuthenticated) => {
  console.log("User authenticated:", isAuthenticated, userStore.user);
  app.mount("#app");
});
