// axios.js
import axios from "axios";
import router from "./router.js";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // Default for session-based auth
  withXSRFToken: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const fetchCsrfToken = async () => {
  try {
    await axios.get("/sanctum/csrf-cookie", {
      baseURL: axiosClient.defaults.baseURL,
      withCredentials: true,
    });
    console.log("CSRF token fetched successfully");
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
  }
};

axiosClient.interceptors.request.use(async (config) => {
  // Check if this is a judge session (token-based)
  const isJudgeSession = localStorage.getItem("judgeSession") === "true";

  if (isJudgeSession) {
    // For judge sessions, use token-based auth
    config.withCredentials = false;
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log("Added judge token to request");
    } else {
      console.warn("No judge token found for judge session");
    }
  } else {
    // For admin/tabulator sessions, use session-based auth (cookies)
    config.withCredentials = true;

    // Remove any Authorization header that might have been set previously
    delete config.headers["Authorization"];
    delete axiosClient.defaults.headers.common["Authorization"];

    // Fetch CSRF token for unsafe requests if not already present
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

    // Add XSRF token to headers for session-based requests
    const xsrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
      console.log("Added XSRF-TOKEN for session-based request");
    }
  }

  if (config.data instanceof FormData) {
    config.headers["Content-Type"] = "multipart/form-data";
  }

  return config;
});

// Auth error handler
let isHandlingAuthError = false;

const handleAuthError = () => {
  if (isHandlingAuthError) return;
  isHandlingAuthError = true;

  console.info("Authentication error - clearing all auth data");

  // Clear all authentication data
  localStorage.removeItem("token");
  localStorage.removeItem("judgeSession");
  delete axiosClient.defaults.headers.common["Authorization"];

  // Clear user store if available
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
      // Skip auth error handling for login endpoints and CSRF endpoints
      const isLoginEndpoint =
        error.config?.url?.includes("/login") ||
        error.config?.url?.includes("/csrf-cookie") ||
        error.config?.url?.includes("/sanctum/csrf-cookie") ||
        error.config?.url?.includes("/auth/google");

      if (!isLoginEndpoint) {
        console.info("Auth error detected - redirecting to login");
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

    return Promise.reject(error);
  }
);

export default axiosClient;
