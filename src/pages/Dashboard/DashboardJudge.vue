<script>
import { useUserStore } from "@/stores/user";
import { useDarkModeStore } from "@/stores/darkMode";
import { computed } from "vue";
import axiosClient from "@/axios";
import Pusher from "pusher-js";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import EventInfoCard from "@/components/dashboard/EventInfoCard.vue";
import JudgeDetailsCard from "@/components/dashboard/JudgeDetailsCard.vue";
import CurrentCandidateCard from "@/components/dashboard/CurrentCandidateCard.vue";
import ScoreInputForm from "@/components/dashboard/ScoreInputForm.vue";
import TemporaryScoreCard from "@/components/dashboard/TemporaryScoreCard.vue";
import DarkModeToggle from "@/components/dashboard/DarkModeToggle.vue";

export default {
  components: {
    EventInfoCard,
    JudgeDetailsCard,
    CurrentCandidateCard,
    ScoreInputForm,
    TemporaryScoreCard,
  },
  data() {
    return {
      event: null,
      judge_name: null,
      judge_id: null,
      current_category: null,
      next_candidate: null,
      criteria: [],
      score: null,
      comments: "",
      temporaryScore: null,
      isSubmitting: false,
      isWaitingForNextCandidate: false,
      hasConfirmedScore: false,
      currentCandidateId: null,
      channel: null,
      pusher: null,
      showConfirmModal: false,
      pollingInterval: null,
      dataLoaded: false,
      rejectedTemporaryScore: false,
      maxScore: 100,
      isNavbarVisible: true,
      lastScrollY: 0,
      scrollThreshold: 10,
      darkModeStore: useDarkModeStore(),
    };
  },
  computed: {
    isDarkMode() {
      return this.darkModeStore.isDarkMode;
    },
  },
  setup() {
    const userStore = useUserStore();
    const toast = useToast();
    const router = useRouter();

    return { userStore, toast, router };
  },
  watch: {
    score(newValue) {
      console.log("Score updated:", newValue, typeof newValue);
    },
    // Watch for dark mode changes and apply to DOM
    isDarkMode(newVal) {
      if (newVal) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },
  },
  mounted() {
    useDarkModeStore().initializeDarkMode();
    console.log("Stored token:", localStorage.getItem("token"));

    // Initialize dark mode from store
    this.addScrollListener();

    // Add FontAwesome script dynamically if not already present
    if (!document.getElementById("font-awesome-script")) {
      const script = document.createElement("script");
      script.id = "font-awesome-script";
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js";
      script.integrity =
        "sha512-fD9DI5bZwQxOi7MhYWnnNPlvXdp/2Pj3XSTRrFs5FQa4mizyGLnJcN6tuvUS6LbmgN1ut+XGSABKvjN0H6Aoow==";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    this.initializePusher();
    this.fetchCurrentSession();
    this.startPolling();
  },
  beforeUnmount() {
    if (this.channel && this.event) {
      this.pusher.unsubscribe(`event.${this.event.event_id}`);
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    // Remove scroll listener
    this.removeScrollListener();
  },
  methods: {
    toggleDarkMode() {
      this.darkModeStore.toggle();
    },
    initializeDarkMode() {
      useDarkModeStore().initializeDarkMode();
      if (this.isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },
    initializePusher() {
      this.pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
        encrypted: true,
      });
      console.log("Pusher initialized", {
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
      });
    },
    getCandidatePhotoUrl(path) {
      if (!path) return null;

      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      return `${base}${path}`;
    },
    async fetchCurrentSession() {
      const token = localStorage.getItem("token");
      if (!token) {
        this.dataLoaded = true;
        this.toast.error("No authentication token found. Please log in again.");
        this.router.push("/login/admin");
        return;
      }

      try {
        const response = await axiosClient.get("/api/v1/judge/current-session");
        console.log("Fetched session:", response);

        // Store previous candidate ID for comparison
        const previousCandidateId = this.currentCandidateId;
        const newCandidateId = response.next_candidate?.candidate_id || null;
        const isNewCandidate = newCandidateId !== previousCandidateId;

        console.log("Previous candidate:", previousCandidateId);
        console.log("New candidate:", newCandidateId);
        console.log("Is new candidate?", isNewCandidate);

        // Update basic session data
        this.judge_id = response.judge.judge_id;
        this.judge_name = response.judge_name;
        this.event = response.event;
        this.current_category = response.current_category;
        this.next_candidate = response.next_candidate;
        this.criteria = response.criteria;
        this.currentCandidateId = newCandidateId;
        this.event = response.event;
        this.maxScore = response.event?.max_score || 100;

        // Handle candidate change - reset form completely for new candidates
        if (isNewCandidate && newCandidateId !== null) {
          console.log("→ NEW candidate detected, resetting form");
          this.score = null;
          this.comments = "";
          this.temporaryScore = null;
          this.hasConfirmedScore = false;
          this.isWaitingForNextCandidate = false;
          this.rejectedTemporaryScore = false; // Reset flag for new candidate
        }

        // Handle score status based on API response
        if (newCandidateId && this.current_category) {
          if (response.score_status === "confirmed") {
            console.log("Score already confirmed for this candidate");
            this.hasConfirmedScore = true;
            this.isWaitingForNextCandidate = true;
            this.temporaryScore = null;
          } else if (
            response.score_status === "temporary" &&
            !this.rejectedTemporaryScore
          ) {
            // Only restore temporary score if it hasn't been rejected
            console.log("Temporary score exists, restoring state");
            this.hasConfirmedScore = false;
            this.isWaitingForNextCandidate = false;

            // Only restore temporary score if it's not a new candidate
            if (!isNewCandidate) {
              this.temporaryScore = {
                score: response.score,
                comments: response.comments || null,
              };

              // Restore form inputs if they don't match
              if (
                this.score !== response.score ||
                this.comments !== (response.comments || "")
              ) {
                this.score = response.score;
                this.comments = response.comments || "";
              }
            }
          } else {
            // No score exists or temporary score was rejected - fresh state
            console.log("No score exists or was rejected, fresh state");
            this.hasConfirmedScore = false;
            this.isWaitingForNextCandidate = false;
            this.temporaryScore = null;
          }
        } else {
          // No candidate or category - waiting state
          this.isWaitingForNextCandidate =
            this.current_category && !this.next_candidate;
          this.hasConfirmedScore = false;
          this.temporaryScore = null;
        }

        console.log("Final state:", {
          currentCandidateId: this.currentCandidateId,
          hasConfirmedScore: this.hasConfirmedScore,
          isWaitingForNextCandidate: this.isWaitingForNextCandidate,
          scoreStatus: response.score_status,
          temporaryScore: this.temporaryScore,
          rejectedTemporaryScore: this.rejectedTemporaryScore,
        });

        // Handle event completion
        if (this.event?.status === "completed") {
          this.toast.info(
            "The event has been finalized. Thank you for your participation."
          );
          if (this.channel)
            this.pusher.unsubscribe(`event.${this.event.event_id}`);
          this.router.push("/judge/thank-you");
        } else if (this.event && !this.channel) {
          this.subscribeToPusher();
        }

        this.dataLoaded = true;
      } catch (error) {
        console.error("Error fetching current session:", error);
        this.toast.error(
          "Failed to fetch session: " +
            (error.response?.data?.message || error.message)
        );
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          this.router.push("/login/admin");
        }
      }
    },
    subscribeToPusher() {
      this.channel = this.pusher.subscribe(`event.${this.event.event_id}`);
      console.log("Subscribed to channel", `event.${this.event.event_id}`);
      this.channel.bind("pusher:subscription_succeeded", () => {
        console.log(
          "Pusher subscription succeeded for channel",
          `event.${this.event.event_id}`
        );
      });
      this.channel.bind("pusher:subscription_error", (error) => {
        console.error("Pusher subscription error", error);
        this.toast.error("Failed to subscribe to event updates");
      });
      this.channel.bind("App\\Events\\ScoreSubmitted", (data) => {
        console.log("ScoreSubmitted event received", data);
        if (
          data.score.judge_id === this.judge_id &&
          data.score.category_id === this.current_category?.category_id &&
          data.score.candidate_id === this.next_candidate?.candidate_id
        ) {
          this.temporaryScore = data.score;
          this.toast.success("Score submitted, please confirm");
        }
      });
      this.channel.bind("App\\Events\\ScoreConfirmed", (data) => {
        console.log("ScoreConfirmed event received", data);
        if (
          data.score.judge_id === this.judge_id &&
          data.score.category_id === this.current_category?.category_id &&
          data.score.candidate_id === this.next_candidate?.candidate_id
        ) {
          this.temporaryScore = null;
          this.score = null;
          this.comments = "";
          this.isWaitingForNextCandidate = true;
          this.hasConfirmedScore = true;
          this.toast.success("Score confirmed");
          if (data.all_confirmed) {
            this.isWaitingForNextCandidate = true;
          }
        }
      });
      this.channel.bind("App\\Events\\CandidateSet", (data) => {
        console.log("CandidateSet event received", data);

        if (data.category_id === this.current_category?.category_id) {
          console.log("CandidateSet: Matching category, fetching new session");

          // Force refresh the session to get the new candidate
          this.fetchCurrentSession();
          this.toast.info("New candidate assigned");
        } else {
          console.log("CandidateSet: Different category, ignoring", {
            received_category: data.category_id,
            current_category: this.current_category?.category_id,
          });
        }
      });

      this.channel.bind("App\\Events\\EventFinalized", (data) => {
        console.log("EventFinalized event received", data);
        if (data.event_id === this.event.event_id) {
          this.toast.info(
            "The event has been finalized. Thank you for your participation."
          );
          this.pusher.unsubscribe(`event.${this.event.event_id}`);
          this.router.push("/judge/thank-you");
        }
      });
    },
    startPolling() {
      this.pollingInterval = setInterval(() => {
        // Poll more frequently when waiting for next candidate or when score not confirmed
        if (
          this.event &&
          (!this.hasConfirmedScore || this.isWaitingForNextCandidate)
        ) {
          console.log("Polling: Fetching session update");
          this.fetchCurrentSession();
        }
      }, 10000); // Reduced to 60 seconds for better responsiveness
    },
    validateScore() {
      if (this.score == null) {
        console.debug("Score validation failed: Score is empty", {
          score: this.score,
        });
        this.toast.error("Score field is required");
        return false;
      }
      if (this.score < 0 || this.score > this.maxScore) {
        console.debug("Score validation failed: Score out of range", {
          score: this.score,
          maxScore: this.maxScore,
        });
        this.toast.error(`Please enter a valid score (0-${this.maxScore})`);
        return false;
      }
      return true;
    },
    handleScoreInput(event) {
      let value = event.target.value;
      value = value.replace(/[^0-9]/g, "");

      if (value === "") {
        this.score = null;
        return;
      }

      const numValue = parseInt(value, 10);
      if (numValue > this.maxScore) {
        this.score = this.maxScore;
        event.target.value = this.maxScore.toString();
        this.toast.warning(`Score cannot exceed ${this.maxScore}`);
      } else {
        this.score = numValue;
      }
    },
    restrictScoreKeydown(event) {
      const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
      ];
      if (allowedKeys.includes(event.key)) {
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        const currentValue = event.target.value + event.key;
        const numValue = parseInt(currentValue, 10);
        if (numValue > this.maxScore) {
          event.preventDefault();
          this.toast.warning(`Score cannot exceed ${this.maxScore}`);
        }
        return;
      }
      event.preventDefault();
    },
    async submitScore() {
      console.log("Submit score clicked, toast instance:", this.toast);
      if (!this.event || !this.current_category || !this.next_candidate) {
        this.toast.error("No active event, category, or candidate");
        console.error(
          "Submission blocked: missing event, category, or candidate",
          {
            event: this.event,
            category: this.current_category,
            candidate: this.next_candidate,
          }
        );
        return;
      }
      if (!this.validateScore()) {
        console.error("Invalid score submission attempt", {
          score: this.score,
        });
        return;
      }
      this.isSubmitting = true;
      try {
        const payload = {
          event_id: this.event.event_id,
          category_id: this.current_category.category_id,
          candidate_id: this.next_candidate.candidate_id,
          score: this.score,
          comments: this.comments || null,
        };
        console.log(
          "Submitting score payload:",
          payload,
          "userId:",
          this.userStore.userId,
          "judge_id:",
          this.judge_id
        );
        const response = await axiosClient.post(
          "/api/v1/judge/submit-score",
          payload
        );
        this.temporaryScore = response.score;
        this.rejectedTemporaryScore = false; // Reset the flag when new score is submitted
        this.toast.success("Score submitted, please confirm");
      } catch (error) {
        console.error("Submission error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          headers: error.response?.headers,
        });
        this.toast.error(
          `Failed to submit score: ${
            error.response?.data?.message || error.message
          }`
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    confirmScore() {
      if (!this.validateScore()) {
        return;
      }
      this.showConfirmModal = true;
    },
    async confirmScoreSubmission(confirmed) {
      this.showConfirmModal = false;
      if (!confirmed) {
        // Set flag to indicate temporary score was rejected
        this.rejectedTemporaryScore = true;

        // Clear local state
        this.temporaryScore = null;
        this.score = null;
        this.comments = "";
        this.toast.info("Score cleared. You can enter a new score.");
        return;
      }

      this.isSubmitting = true;
      try {
        const payload = {
          event_id: this.event.event_id,
          category_id: this.current_category.category_id,
          candidate_id: this.next_candidate.candidate_id,
          score: this.score,
          comments: this.comments || null,
          confirm: true,
        };
        console.log("Confirming score payload:", payload);
        await axiosClient.post("/api/v1/judge/confirm-score", payload);
        this.temporaryScore = null;
        this.score = null;
        this.comments = "";
        this.isWaitingForNextCandidate = true;
        this.hasConfirmedScore = true;
        this.rejectedTemporaryScore = false; // Reset flag
        this.toast.success("Score confirmed");
      } catch (error) {
        this.toast.error(
          "Failed to confirm score: " +
            (error.response?.data?.message || error.message)
        );
        console.error("Error confirming score:", error);
      } finally {
        this.isSubmitting = false;
      }
    },
    handleScroll() {
      const currentScrollY = window.scrollY;

      if (Math.abs(currentScrollY - this.lastScrollY) < this.scrollThreshold) {
        return;
      }

      if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold - hide navbar
        this.isNavbarVisible = false;
      } else {
        // Scrolling up or at top - show navbar
        this.isNavbarVisible = true;
      }

      this.lastScrollY = currentScrollY;
    },
    addScrollListener() {
      window.addEventListener("scroll", this.handleScroll, { passive: true });
    },

    removeScrollListener() {
      window.removeEventListener("scroll", this.handleScroll);
    },

    handleImageError(event) {
      // Use Vue's nextTick to ensure DOM is ready
      this.$nextTick(() => {
        event.target.src = "/default-avatar.png";
      });
    },
  },
};
</script>

<template>
  <div
    class="min-h-screen transition-colors duration-300"
    :class="
      isDarkMode
        ? 'bg-gradient-to-b from-gray-900 to-gray-800'
        : 'bg-gradient-to-b from-blue-50 to-white'
    "
  >
    <!-- Enhanced Header Section with Scroll Behavior -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out backdrop-blur-md"
      :class="[
        isNavbarVisible ? 'translate-y-0' : '-translate-y-full',
        isDarkMode
          ? 'bg-gray-800/90 border-gray-700'
          : 'bg-white/90 border-gray-200',
        'border-b shadow-lg',
      ]"
    >
      <div class="container mx-auto py-4 px-6">
        <div class="flex items-center justify-between">
          <!-- Left: Title and Welcome -->
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-3">
              <div
                class="p-2 rounded-lg transition-colors duration-300"
                :class="
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                "
              >
                <i class="fas fa-gavel text-white text-xl"></i>
              </div>
              <div>
                <h1
                  class="text-2xl font-bold transition-colors"
                  :class="isDarkMode ? 'text-white' : 'text-gray-800'"
                >
                  Judge Dashboard
                </h1>
                <p
                  class="text-sm transition-colors"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                >
                  {{ judge_name ? `Welcome, ${judge_name}` : "Loading..." }}
                </p>
              </div>
            </div>
          </div>

          <!-- Right: Status and Dark Mode Toggle -->
          <div class="flex items-center space-x-4">
            <!-- Event Status Badge -->
            <div v-if="event" class="hidden sm:block">
              <span
                class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                :class="{
                  'bg-green-100 text-green-800 border border-green-200':
                    event.status === 'active' && !isDarkMode,
                  'bg-green-900/30 text-green-400 border border-green-800':
                    event.status === 'active' && isDarkMode,
                  'bg-red-100 text-red-800 border border-red-200':
                    event.status === 'completed' && !isDarkMode,
                  'bg-red-900/30 text-red-400 border border-red-800':
                    event.status === 'completed' && isDarkMode,
                  'bg-yellow-100 text-yellow-800 border border-yellow-200':
                    event.status !== 'active' &&
                    event.status !== 'completed' &&
                    !isDarkMode,
                  'bg-yellow-900/30 text-yellow-400 border border-yellow-800':
                    event.status !== 'active' &&
                    event.status !== 'completed' &&
                    isDarkMode,
                }"
              >
                <i class="fas fa-circle text-xs mr-1"></i>
                {{
                  event.status.charAt(0).toUpperCase() + event.status.slice(1)
                }}
              </span>
            </div>

            <!-- Dark Mode Toggle -->
            <button
              @click="toggleDarkMode"
              class="p-3 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 focus:ring-yellow-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-orange-500 focus:ring-blue-500'
              "
              aria-label="Toggle dark mode"
            >
              <i
                class="text-lg transition-transform duration-300"
                :class="isDarkMode ? 'fas fa-moon' : 'fas fa-sun'"
              ></i>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content with Top Padding for Fixed Header -->
    <div class="pt-20 container mx-auto px-6 py-8">
      <!-- Enhanced Info Cards Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Event Information Card Component -->
        <EventInfoCard
          :event="event"
          :isDarkMode="isDarkMode"
          :date="new Date().toLocaleDateString()"
        />

        <!-- Judge's Details Card Component -->
        <JudgeDetailsCard
          :judgeName="judge_name"
          :currentCategory="current_category"
          :isDarkMode="isDarkMode"
        />
      </div>

      <!-- Enhanced Current Candidate Section -->
      <div class="transform transition-all duration-300">
        <div
          class="rounded-xl shadow-lg p-6 transition-all duration-300 border"
          :class="
            isDarkMode
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-800/90'
              : 'bg-white border-gray-200 hover:bg-gray-50/50'
          "
        >
          <div class="flex items-center mb-6">
            <div
              class="p-2 rounded-lg mr-3 transition-colors duration-300"
              :class="
                isDarkMode
                  ? 'bg-purple-900/30 text-purple-400'
                  : 'bg-purple-600 text-white'
              "
            >
              <i class="fas fa-star"></i>
            </div>
            <h2
              class="text-xl font-semibold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-blue-800'"
            >
              Current Candidate
            </h2>
          </div>

          <!-- Loading State -->
          <template v-if="!dataLoaded">
            <div class="flex items-center justify-center h-32">
              <div class="flex items-center space-x-3">
                <div
                  class="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full transition-colors"
                  :class="
                    isDarkMode
                      ? 'border-blue-400 border-t-transparent'
                      : 'border-blue-600 border-t-transparent'
                  "
                ></div>
                <span
                  class="text-lg transition-colors"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-400'"
                >
                  Loading session details...
                </span>
              </div>
            </div>
          </template>

          <!-- Event Status Messages -->
          <template v-else-if="event?.status === 'completed'">
            <div class="text-center py-12">
              <div class="mb-4">
                <div
                  class="mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300"
                  :class="
                    isDarkMode
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-green-100 text-green-600'
                  "
                >
                  <i class="fas fa-check-circle text-3xl"></i>
                </div>
              </div>
              <p
                class="text-xl font-semibold mb-2 transition-colors"
                :class="isDarkMode ? 'text-white' : 'text-gray-700'"
              >
                The event has been finalized.
              </p>
              <p
                class="transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
              >
                Thank you for your participation!
              </p>
            </div>
          </template>

          <!-- Event Not Active -->
          <template v-else-if="event?.status !== 'active'">
            <div class="text-center py-12">
              <div class="mb-4">
                <div
                  class="mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300"
                  :class="
                    isDarkMode
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : 'bg-yellow-100 text-yellow-600'
                  "
                >
                  <i class="fas fa-exclamation-triangle text-3xl"></i>
                </div>
              </div>
              <p
                class="text-xl font-semibold mb-2 transition-colors"
                :class="isDarkMode ? 'text-white' : 'text-gray-700'"
              >
                Event is not currently active.
              </p>
              <p
                class="transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
              >
                Please check back later.
              </p>
            </div>
          </template>

          <!-- No Assigned Category or Candidate -->
          <template v-else-if="!current_category || !next_candidate">
            <div class="text-center py-12">
              <div class="mb-4">
                <div
                  class="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                  :class="isDarkMode ? 'bg-blue-800' : 'bg-blue-100'"
                >
                  <i class="fas fa-hourglass-half text-3xl text-blue-600"></i>
                </div>
              </div>
              <p
                class="text-xl font-semibold mb-2 transition-colors"
                :class="isDarkMode ? 'text-white' : 'text-gray-700'"
              >
                {{
                  current_category && !next_candidate
                    ? "All candidates in this category have been scored."
                    : "No active category or candidate assigned for scoring."
                }}
              </p>
              <p
                class="transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
              >
                Please await further instructions.
              </p>
            </div>
          </template>

          <!-- Score Already Confirmed OR Waiting for Next Candidate -->
          <template v-else-if="isWaitingForNextCandidate || hasConfirmedScore">
            <div class="text-center py-12">
              <div class="mb-4">
                <div
                  class="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                  :class="isDarkMode ? 'bg-green-800' : 'bg-green-100'"
                >
                  <i class="fas fa-check-circle text-3xl text-green-600"></i>
                </div>
              </div>
              <p
                class="text-xl font-semibold mb-2 transition-colors"
                :class="isDarkMode ? 'text-white' : 'text-gray-700'"
              >
                {{
                  hasConfirmedScore
                    ? "Your score has been submitted and confirmed."
                    : "All candidates in this category have been scored."
                }}
              </p>
              <p
                class="transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
              >
                Please await the announcement of the next candidate or final
                results.
              </p>
            </div>
          </template>

          <!-- Active Candidate Display -->
          <template v-else>
            <div class="transition-all duration-500 ease-in-out">
              <div class="flex flex-col lg:flex-row items-start gap-8">
                <!-- Enhanced Candidate Info -->
                <CurrentCandidateCard
                  :candidate="next_candidate"
                  :isDarkMode="isDarkMode"
                  :getCandidatePhotoUrl="getCandidatePhotoUrl"
                  :handleImageError="handleImageError"
                />

                <!-- Enhanced Scoring Form -->
                <div class="lg:w-2/3 w-full">
                  <!-- Temporary Score Display -->
                  <template v-if="temporaryScore">
                    <TemporaryScoreCard
                      v-if="temporaryScore"
                      :score="temporaryScore.score"
                      :comments="temporaryScore.comments"
                      :isDarkMode="isDarkMode"
                      :isSubmitting="isSubmitting"
                      :maxScore="maxScore"
                      @confirmScore="confirmScore"
                    />
                  </template>
                  <!-- Enhanced Score Input Form -->
                  <template v-else>
                    <ScoreInputForm
                      :score="score"
                      :comments="comments"
                      :isDarkMode="isDarkMode"
                      :isSubmitting="isSubmitting"
                      :maxScore="maxScore"
                      :handleScoreInput="handleScoreInput"
                      :restrictScoreKeydown="restrictScoreKeydown"
                      :submitScore="submitScore"
                      @update:comments="(val) => (comments = val)"
                    />
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <!-- Score Confirmation Modal -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        class="rounded-xl shadow-2xl w-full max-w-md transition-all duration-300 border"
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
      >
        <!-- Modal Header -->
        <div
          class="p-6 border-b"
          :class="isDarkMode ? 'border-gray-700' : 'border-gray-200'"
        >
          <h3
            class="text-xl font-bold flex items-center transition-colors"
            :class="isDarkMode ? 'text-white' : 'text-gray-800'"
          >
            <i
              class="fas fa-check-circle mr-2 transition-colors"
              :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
            ></i>
            Confirm Your Score
          </h3>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p
            class="mb-4 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Are you sure you want to confirm this score? Once confirmed, it
            cannot be changed.
          </p>

          <!-- Score Summary -->
          <div
            class="rounded-lg p-4 mb-4 border transition-colors"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600'
                : 'bg-gray-50 border-gray-200'
            "
          >
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div
                  class="text-sm font-medium mb-1 transition-colors"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                >
                  Score:
                </div>
                <div
                  class="text-2xl font-bold transition-colors"
                  :class="isDarkMode ? 'text-blue-300' : 'text-blue-600'"
                >
                  {{ score }}<span class="text-sm">/{{ maxScore }}</span>
                </div>
              </div>
              <div>
                <div
                  class="text-sm font-medium mb-1 transition-colors"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                >
                  Comments:
                </div>
                <div
                  class="text-sm transition-colors"
                  :class="isDarkMode ? 'text-gray-100' : 'text-gray-700'"
                >
                  {{ comments || "No comments" }}
                </div>
              </div>
            </div>
          </div>

          <!-- Candidate Info -->
          <div
            class="text-sm transition-colors"
            :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
          >
            <strong>Candidate:</strong> {{ next_candidate?.first_name }}
            {{ next_candidate?.last_name }}
            <br />
            <strong>Category:</strong> {{ current_category?.category_name }}
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="px-6 py-4 border-t flex justify-end space-x-3"
          :class="
            isDarkMode
              ? 'border-gray-700 bg-gray-800'
              : 'border-gray-200 bg-gray-50'
          "
        >
          <button
            @click="confirmScoreSubmission(false)"
            class="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            :class="
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            "
            :disabled="isSubmitting"
          >
            <i class="fas fa-times mr-1"></i>
            Cancel
          </button>
          <button
            @click="confirmScoreSubmission(true)"
            class="px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:scale-105 shadow-lg"
            :class="
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            "
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="mr-2">
              <svg
                class="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
            <i v-else class="fas fa-check mr-2"></i>
            {{ isSubmitting ? "Confirming..." : "Confirm Score" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dark-mode-toggle {
  position: relative;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.dark-mode-toggle:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.toggle-container {
  position: relative;
  width: 1.5rem;
  height: 1.5rem;
}

.sun-icon,
.moon-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  color: #fbbf24;
}

.moon-icon {
  color: #60a5fa;
  opacity: 0;
  transform: translate(-50%, -50%) rotate(180deg);
}

.moon-visible {
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg);
}

.sun-hidden {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(-180deg);
}

.dark-mode-active {
  background-color: rgba(59, 130, 246, 0.2);
}
</style>
