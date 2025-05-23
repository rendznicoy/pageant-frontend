import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosClient from "@/axios";

export const useUserStore = defineStore("user", () => {
  const user = ref(null);
  const isFetching = ref(false);
  const userId = ref(null);
  const judgeId = ref(null); // Add judgeId to store judge_id

  const isAuthenticated = computed(() => !!user.value);

  const fetchUser = async () => {
    if (user.value || isFetching.value) return !!user.value;
    isFetching.value = true;
    try {
      await axiosClient.get("/api/csrf-cookie");
      const res = await axiosClient.get("/api/v1/user");

      // Since you're using UserResource, the user data is under res.data.data
      if (res && res.data) {
        user.value = res.data.data ?? res.data;
        userId.value = user.value.user_id;
        judgeId.value = user.value.judge_id || null;
        return true;
      }

      console.warn("No user data in response");
      return false;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.info("Unauthorized access");
      } else {
        console.error("Error fetching user:", err);
      }
      return false;
    } finally {
      isFetching.value = false;
    }
  };

  const setUser = (userData) => {
    user.value = userData;
    if (userData) {
      userId.value = userData.user_id || null;
      judgeId.value = userData.judge_id || null; // Set judgeId from userData
    } else {
      userId.value = null;
      judgeId.value = null;
    }
  };

  // Optional: Explicit setJudgeId action for clarity
  const setJudgeId = (judgeIdValue) => {
    judgeId.value = judgeIdValue;
  };

  const logout = async () => {
    try {
      await axiosClient.post("/api/v1/logout");
      user.value = null;
      userId.value = null;
      judgeId.value = null;
      return true;
    } catch (err) {
      console.error("Error during logout:", err);
      user.value = null;
      userId.value = null;
      judgeId.value = null;
      return false;
    }
  };

  return {
    user,
    userId,
    judgeId, // Export judgeId
    isAuthenticated,
    fetchUser,
    setUser,
    setJudgeId, // Export setJudgeId
    logout,
  };
});
