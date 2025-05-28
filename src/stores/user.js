import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosClient from "@/axios";

export const useUserStore = defineStore("user", () => {
  const user = ref(null);
  const isFetching = ref(false);
  const userId = ref(null);
  const judgeId = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  // Add method to handle authentication errors
  const handleAuthError = () => {
    console.info("Authentication error - clearing user state");
    user.value = null;
    userId.value = null;
    judgeId.value = null;
    isFetching.value = false;
    // Don't clear localStorage here as axios interceptor handles it
  };

  // user.js - Update fetchUser method
  const fetchUser = async (suppressErrors = false) => {
    if (user.value || isFetching.value) return !!user.value;

    isFetching.value = true;
    try {
      // Don't fetch CSRF for judge sessions - they use token-based auth
      // CSRF token will be fetched automatically by axios interceptor for session-based auth

      const res = await axiosClient.get("/api/v1/user");

      // Handle different response formats
      if (res?.data?.data) {
        user.value = res.data.data;
        userId.value = res.data.data.user_id || null;
        judgeId.value = res.data.data.judge_id || null;
        return true;
      } else if (res?.data) {
        user.value = res.data;
        userId.value = res.data.user_id || null;
        judgeId.value = res.data.judge_id || null;
        return true;
      } else {
        if (!suppressErrors) {
          console.warn("User response format unexpected:", res);
        }
        handleAuthError();
        return false;
      }
    } catch (err) {
      // Auth errors are now handled by axios interceptor
      if (
        err.message?.includes("Authentication failed") ||
        err.message?.includes("User account not found")
      ) {
        return false;
      }

      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        if (!suppressErrors) {
          console.info("User account no longer exists or unauthorized access");
        }
        handleAuthError();
        return false;
      } else if (err.response && err.response.status === 404) {
        if (!suppressErrors) {
          console.info("User account not found - likely deleted");
        }
        handleAuthError();
        return false;
      } else {
        if (!suppressErrors) {
          console.error("Error fetching user:", err);
        }
        return false;
      }
    } finally {
      isFetching.value = false;
    }
  };

  const setUser = (userData) => {
    user.value = userData;
    if (userData) {
      userId.value = userData.user_id || null;
      judgeId.value = userData.judge_id || null;
    } else {
      userId.value = null;
      judgeId.value = null;
    }
  };

  const setJudgeId = (judgeIdValue) => {
    judgeId.value = judgeIdValue;
  };

  const logout = async () => {
    try {
      // Make logout API call
      await axiosClient.post("/api/v1/logout");
    } catch (err) {
      console.error("Error during logout API call:", err);
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clear local state
      handleAuthError();

      // Clear localStorage and axios headers
      localStorage.removeItem("token");
      localStorage.removeItem("judgeSession");
      delete axiosClient.defaults.headers.common["Authorization"];

      return true;
    }
  };

  // Method to check if user is still valid (useful for periodic checks)
  const validateUser = async () => {
    if (!user.value) return false;
    return await fetchUser(true); // suppressErrors = true for silent validation
  };

  return {
    user,
    userId,
    judgeId,
    isAuthenticated,
    fetchUser,
    setUser,
    setJudgeId,
    logout,
    handleAuthError,
    validateUser,
  };
});
