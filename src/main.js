// main.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import axiosClient from "./axios";
import "@fortawesome/fontawesome-free/css/all.css";

// Create the app and Pinia instance
const app = createApp(App);
const pinia = createPinia();

// Use plugins
app.use(pinia); // <-- This line was missing
app.use(router);

// Mount the app
app.mount("#app");
