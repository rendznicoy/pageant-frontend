import axios from "axios";
import router from "./router.js";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // default for most requests
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
  // Disable withCredentials if session is a judge token-based session
  if (localStorage.getItem("judgeSession") === "true") {
    config.withCredentials = false;
  }

  // Fetch CSRF token for unsafe requests if not already present
  if (
    config?.method &&
    ["post", "put", "patch", "delete"].includes(config.method) &&
    localStorage.getItem("judgeSession") !== "true"
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
  if (token) {
    axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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

  if (
    config.url !== "/api/v1/login/judge" &&
    config.withCredentials !== false &&
    localStorage.getItem("judgeSession") !== "true"
  ) {
    const xsrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
      console.log("Added XSRF-TOKEN to request:", xsrfToken);
    }
  }

  return config;
});

// Add this global auth error handler
let isHandlingAuthError = false;

const handleAuthError = () => {
  if (isHandlingAuthError) return; // Prevent multiple simultaneous calls
  isHandlingAuthError = true;

  console.info("Authentication error - clearing all auth data");

  // Clear all authentication data
  localStorage.removeItem("token");
  localStorage.removeItem("judgeSession");
  delete axiosClient.defaults.headers.common["Authorization"];

  // Clear user store if available (dynamic import to avoid circular dependency)
  import("@/stores/user")
    .then(({ useUserStore }) => {
      const userStore = useUserStore();
      userStore.handleAuthError();
    })
    .catch(() => {
      console.warn("Could not access user store");
    });

  // Redirect to appropriate login page
  const currentPath = window.location.pathname;
  if (currentPath.includes("/judge/")) {
    router.push("/login/judge").finally(() => {
      isHandlingAuthError = false;
    });
  } else {
    router.push("/login/admin").finally(() => {
      isHandlingAuthError = false;
    });
  }
};

axiosClient.interceptors.response.use(
  (response) => {
    const contentType = response.headers?.["content-type"] ?? "";

    // Allow raw blob responses to pass through
    if (
      contentType.includes("application/octet-stream") ||
      contentType.includes("text/csv") ||
      contentType.includes("application/pdf") ||
      response.config?.responseType === "blob"
    ) {
      return response;
    }

    return response.data;
  },
  (error) => {
    // Handle authentication errors globally
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Skip auth error handling for login endpoints
      const isLoginEndpoint =
        error.config?.url?.includes("/login") ||
        error.config?.url?.includes("/csrf-cookie");

      if (!isLoginEndpoint) {
        console.info(
          "Auth error detected - user account may have been deleted"
        );
        handleAuthError();
        return Promise.reject(
          new Error("Authentication failed - redirecting to login")
        );
      }
    }

    // Handle 404 for user endpoints (account deleted)
    if (
      error.response?.status === 404 &&
      error.config?.url?.includes("/api/v1/user")
    ) {
      console.info("User account not found - likely deleted");
      handleAuthError();
      return Promise.reject(
        new Error("User account not found - redirecting to login")
      );
    }

    // Let all other errors bubble up to component-level try/catch
    return Promise.reject(error);
  }
);

export default axiosClient;
