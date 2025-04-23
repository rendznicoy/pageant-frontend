import { createApp, ref } from "vue";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import axiosClient from "./axios";

const app = createApp(App);
app.use(router);
app.mount("#app");

/* // Create a composable for Google authentication
export function useGoogleAuth() {
  const isLoading = ref(false);
  const error = ref(null);

  // Initialize Google OAuth client
  function initGoogleAuth() {
    return new Promise((resolve) => {
      // Load the Google API client
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize the Google client
        window.google.accounts.id.initialize({
          client_id:
            "972504344514-d7ea0rtlig48s8ekg7doemi3e370gctt.apps.googleusercontent.com",
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  // Handle the Google callback
  async function handleGoogleCallback(response) {
    isLoading.value = true;
    error.value = null;

    try {
      // Send the ID token to your backend
      const result = await axiosClient.post("/api/v1/auth/google", {
        id_token: response.credential,
      });

      // Verify the result and redirect if successful
      if (result.data.success) {
        window.location.href = "/admin/dashboard";
      } else {
        error.value = result.data.message || "Authentication failed";
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || "Failed to authenticate with Google";
      console.error("Google auth error:", err);
    } finally {
      isLoading.value = false;
    }
  }

  // Render the Google sign-in button
  function renderGoogleButton(elementId) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        {
          theme: "outline",
          size: "large",
          text: "continue_with",
          logo_alignment: "center",
        }
      );
    }
  }

  return {
    initGoogleAuth,
    renderGoogleButton,
    isLoading,
    error,
  };
} */
