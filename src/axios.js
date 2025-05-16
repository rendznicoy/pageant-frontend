import axios from "axios";
import router from "./router.js";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:8000",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
    "Content-Type": "application/json", // Ensure default Content-Type
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("Added token to request:", token, "URL:", config.url);
  } else {
    console.warn("No token found for request:", config.url);
  }
  if (config.data instanceof FormData) {
    config.headers["Content-Type"] = "multipart/form-data";
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized request", {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data,
        response: error.response?.data,
      });
      localStorage.removeItem("token");
      router.push({ name: "Login" });
      return Promise.resolve();
    }
    console.error("API error", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    return Promise.reject(error);
  }
);

export default axiosClient;
