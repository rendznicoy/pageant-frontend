import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosClient from "@/axios";

export const useUserStore = defineStore("user", () => {
  const user = ref(null);
  const isFetching = ref(false); // Track fetch status

  // Add computed property for userId
  const userId = computed(() => user.value?.user_id);

  // Add computed property for isAuthenticated
  const isAuthenticated = computed(() => !!user.value);

  const fetchUser = async () => {
    if (user.value || isFetching.value) return !!user.value;
    isFetching.value = true;
    try {
      await axiosClient.get("/api/csrf-cookie");
      const res = await axiosClient.get("/api/v1/user");
      if (res && res.data) {
        user.value = res.data;
        return true;
      }
      return false;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.info("User is not logged in.");
      } else {
        console.error("Error fetching user:", err);
      }
      return false;
    } finally {
      isFetching.value = false;
    }
  };

  // Add the setUser method
  const setUser = (userData) => {
    user.value = userData;
  };

  // Add a logout method for completeness
  const logout = async () => {
    try {
      await axiosClient.post("/api/v1/logout");
      user.value = null;
      return true;
    } catch (err) {
      console.error("Error during logout:", err);
      // Still clear the user from store even if the API call fails
      user.value = null;
      return false;
    }
  };

  return {
    user,
    userId, // Export the computed property
    isAuthenticated, // Export the authentication status
    fetchUser,
    setUser,
    logout,
  };
});
