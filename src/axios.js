import axios from "axios";
import router from "./router.js";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:8000",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const fetchCsrfToken = async () => {
  try {
    await axios.get("/api/csrf-cookie", {
      baseURL: axiosClient.defaults.baseURL,
    });
    console.log("CSRF token fetched successfully");
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
  }
};

axiosClient.interceptors.request.use(async (config) => {
  // Fetch CSRF token for non-GET requests if not present
  if (
    config?.method &&
    ["post", "put", "patch", "delete"].includes(config.method)
  ) {
    const xsrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
    if (!xsrfToken) {
      await fetchCsrfToken();
    }
  }

  const token = localStorage.getItem("token");
  console.log("Token in localStorage:", token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("Added token to request:", token, "URL:", config.url);
  } else {
    console.warn("No token found for request:", config.url ?? "unknown URL");
  }

  if (config.data instanceof FormData) {
    config.headers["Content-Type"] = "multipart/form-data";
    console.log("FormData payload:");
    for (let [key, value] of config.data.entries()) {
      console.log(
        `  ${key}:`,
        value instanceof File ? `[File: ${value.name}]` : value
      );
    }
  }

  const xsrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  if (xsrfToken) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
    console.log("Added XSRF-TOKEN to request:", xsrfToken);
  } else {
    console.warn(
      "No XSRF-TOKEN found in cookies for request:",
      config.url ?? "[unknown URL]"
    );
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    const contentType = response.headers?.["content-type"] ?? "";

    if (
      contentType.includes("application/octet-stream") ||
      contentType.includes("text/csv")
    ) {
      return response; // for file downloads
    }

    return response.data; // Default for API responses
  },
  (error) => {
    if (error.response?.status === 401) {
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
