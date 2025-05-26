import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosClient from "@/axios";

export const useUserStore = defineStore("user", () => {
  const user = ref(null);
  const isFetching = ref(false);
  const userId = ref(null);
  const judgeId = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  const fetchUser = async () => {
    if (user.value || isFetching.value) return !!user.value;

    isFetching.value = true;
    try {
      await axiosClient.get("/api/csrf-cookie");
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
        console.warn("User response format unexpected:", res);
        return false;
      }
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
      user.value = null;
      userId.value = null;
      judgeId.value = null;

      // Clear any stored tokens/session data
      localStorage.removeItem("token");
      localStorage.removeItem("judgeSession");

      return true; // Always return true to indicate local cleanup is done
    }
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
  };
});
