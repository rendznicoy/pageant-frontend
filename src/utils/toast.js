// src/utils/toast.js
let toastInstance = null;

// Track messages to prevent duplicates
let lastMessages = new Map();
const MESSAGE_TIMEOUT = 3000; // 3 seconds

export const setToastInstance = (toast) => {
  toastInstance = toast;
};

export const showError = (message, options = {}) => {
  if (!toastInstance) {
    console.error("Toast not initialized:", message);
    return;
  }

  // Check for auth-related errors that should be suppressed
  const authErrorPatterns = [
    "authentication failed",
    "account may have been deleted",
    "user account not found",
    "unauthorized",
    "unauthenticated",
    "no authentication token",
    "token not found",
    "invalid pin",
    "pin code",
  ];

  const isAuthError = authErrorPatterns.some((pattern) =>
    message.toLowerCase().includes(pattern)
  );

  // Let auth errors through only if they're from login pages
  const isOnLoginPage = window.location.pathname.includes("/login/admin");

  if (isAuthError && !isOnLoginPage) {
    console.info("Suppressing auth error toast (not on login page):", message);
    return;
  }

  // Prevent duplicate messages
  const now = Date.now();
  const lastTime = lastMessages.get(message) || 0;

  if (now - lastTime < MESSAGE_TIMEOUT) {
    return; // Skip duplicate
  }

  lastMessages.set(message, now);

  // Clean up old entries
  setTimeout(() => {
    lastMessages.delete(message);
  }, MESSAGE_TIMEOUT);

  toastInstance.error(message, {
    timeout: 6000,
    closeOnClick: true,
    pauseOnHover: true,
    hideProgressBar: false,
    ...options,
  });
};

export const showSuccess = (message, options = {}) => {
  if (!toastInstance) {
    console.warn("Toast not initialized:", message);
    return;
  }

  // Prevent duplicate messages
  const now = Date.now();
  const lastTime = lastMessages.get(message) || 0;

  if (now - lastTime < MESSAGE_TIMEOUT) {
    return; // Skip duplicate
  }

  lastMessages.set(message, now);

  // Clean up old entries
  setTimeout(() => {
    lastMessages.delete(message);
  }, MESSAGE_TIMEOUT);

  toastInstance.success(message, {
    timeout: 4000,
    closeOnClick: true,
    pauseOnHover: true,
    hideProgressBar: false,
    ...options,
  });
};

export const showInfo = (message, options = {}) => {
  if (!toastInstance) {
    console.warn("Toast not initialized:", message);
    return;
  }

  toastInstance.info(message, {
    timeout: 4000,
    closeOnClick: true,
    pauseOnHover: true,
    hideProgressBar: false,
    ...options,
  });
};

export const showWarning = (message, options = {}) => {
  if (!toastInstance) {
    console.warn("Toast not initialized:", message);
    return;
  }

  toastInstance.warning(message, {
    timeout: 5000,
    closeOnClick: true,
    pauseOnHover: true,
    hideProgressBar: false,
    ...options,
  });
};
