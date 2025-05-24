<script>
import { useUserStore } from "@/stores/user";
import axiosClient from "@/axios";
import Pusher from "pusher-js";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";

export default {
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
    };
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
  },
  mounted() {
    console.log("Stored token:", localStorage.getItem("token"));
    // Add FontAwesome script dynamically if not already present
    if (!document.getElementById("font-awesome-script")) {
      const script = document.createElement("script");
      script.id = "font-awesome-script";
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/js/all.min.js";
      script.integrity =
        "sha512-Tn2m0TIpgVyTzzvmxLNuqbSJH3JP8jm+Cy3hvHrW7ndTDcJ1w5mBiksqDBb8GpE2ksktFvDB/ykZ0mDpsZj20w==";
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
  },
  methods: {
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

        // Handle candidate change - reset form completely for new candidates
        if (isNewCandidate && newCandidateId !== null) {
          console.log("→ NEW candidate detected, resetting form");
          this.score = null;
          this.comments = "";
          this.temporaryScore = null;
          this.hasConfirmedScore = false;
          this.isWaitingForNextCandidate = false;
        }

        // Handle score status based on API response
        if (newCandidateId && this.current_category) {
          if (response.score_status === "confirmed") {
            console.log("Score already confirmed for this candidate");
            this.hasConfirmedScore = true;
            this.isWaitingForNextCandidate = true;
            this.temporaryScore = null;
          } else if (response.score_status === "temporary") {
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
            // No score exists - fresh state
            console.log("No score exists, fresh state");
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
      }, 5000); // Reduced to 5 seconds for better responsiveness
    },
    validateScore() {
      if (this.score == null) {
        console.debug("Score validation failed: Score is empty", {
          score: this.score,
        });
        this.toast.error("Score field is required");
        return false;
      }
      if (this.score < 0 || this.score > 100) {
        console.debug("Score validation failed: Score out of range", {
          score: this.score,
        });
        this.toast.error("Please enter a valid score (0-100)");
        return false;
      }
      return true;
    },
    handleScoreInput(event) {
      let value = event.target.value;
      value = value.replace(/[^0-9]/g, "");
      const numValue = value === "" ? null : parseInt(value, 10);
      if (numValue !== null && numValue > 100) {
        this.score = 100;
        this.toast.warning("Score cannot exceed 100");
      } else {
        this.score = numValue;
      }
      event.target.value = this.score === null ? "" : this.score;
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
        if (numValue > 100) {
          event.preventDefault();
          this.toast.warning("Score cannot exceed 100");
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
  },
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <!-- Header Section -->
    <header class="bg-green-600 text-white shadow-md">
      <div class="container mx-auto py-4 px-6">
        <h1 class="text-3xl font-bold">Judge Dashboard</h1>
        <p class="text-sm opacity-90">
          {{ judge_name ? `Welcome, ${judge_name}` : "Loading..." }}
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Event Information Card -->
        <div
          class="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg"
        >
          <h2 class="text-xl font-semibold text-blue-800 mb-4 border-b pb-2">
            Event Information
          </h2>
          <div v-if="event" class="space-y-2">
            <div class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Event Name:</div>
              <div class="text-gray-800">{{ event.event_name }}</div>
            </div>
            <div class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Date:</div>
              <div class="text-gray-800">
                {{ new Date().toLocaleDateString() }}
              </div>
            </div>
            <div class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Location:</div>
              <div class="text-gray-800">{{ event.venue || "TBA" }}</div>
            </div>
            <div class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Status:</div>
              <div class="text-gray-800">
                <span
                  :class="{
                    'px-2 py-1 rounded text-xs font-medium': true,
                    'bg-green-100 text-green-800': event.status === 'active',
                    'bg-red-100 text-red-800': event.status === 'completed',
                    'bg-yellow-100 text-yellow-800':
                      event.status !== 'active' && event.status !== 'completed',
                  }"
                >
                  {{
                    event.status.charAt(0).toUpperCase() + event.status.slice(1)
                  }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-24">
            <div class="animate-pulse text-gray-400">
              Loading event information...
            </div>
          </div>
        </div>

        <!-- Judge's Details Card -->
        <div
          class="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg"
        >
          <h2 class="text-xl font-semibold text-blue-800 mb-4 border-b pb-2">
            Judge's Details
          </h2>
          <div class="space-y-2">
            <div class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Judge Name:</div>
              <div class="text-gray-800">{{ judge_name || "Loading..." }}</div>
            </div>
            <div class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Category:</div>
              <div class="text-gray-800">
                {{ current_category?.category_name || "Not assigned" }}
              </div>
            </div>
            <div v-if="current_category" class="flex items-center">
              <div class="w-32 font-medium text-gray-600">Stage:</div>
              <div class="text-gray-800">{{ current_category.stage_name }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Candidate Section -->
      <div
        class="mt-8 bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg"
      >
        <h2 class="text-xl font-semibold text-blue-800 mb-4 border-b pb-2">
          Current Candidate
        </h2>

        <!-- Loading State -->
        <div v-if="!dataLoaded" class="flex items-center justify-center h-32">
          <div class="animate-pulse text-gray-400">
            Loading session details...
          </div>
        </div>

        <!-- Event Completed -->
        <div v-else-if="event?.status === 'completed'" class="text-center py-8">
          <div class="text-3xl text-green-600 mb-4">
            <i class="fas fa-check-circle"></i>
          </div>
          <p class="text-lg text-gray-700">The event has been finalized.</p>
          <p class="text-gray-600">Thank you for your participation!</p>
        </div>

        <!-- Event Not Active -->
        <div v-else-if="event?.status !== 'active'" class="text-center py-8">
          <div class="text-3xl text-yellow-600 mb-4">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p class="text-lg text-gray-700">Event is not currently active.</p>
          <p class="text-gray-600">Please check back later.</p>
        </div>

        <!-- No Assigned Category or Candidate -->
        <div
          v-else-if="!current_category || !next_candidate"
          class="text-center py-8"
        >
          <div class="text-3xl text-blue-600 mb-4">
            <i class="fas fa-hourglass-half"></i>
          </div>
          <p class="text-lg text-gray-700">
            {{
              current_category && !next_candidate
                ? "All candidates in this category have been scored."
                : "No active category or candidate assigned for scoring."
            }}
          </p>
          <p class="text-gray-600">Please await further instructions.</p>
        </div>

        <!-- Score Already Confirmed -->
        <div
          v-else-if="isWaitingForNextCandidate || hasConfirmedScore"
          class="text-center py-8"
        >
          <div class="text-3xl text-green-600 mb-4">
            <i class="fas fa-check-circle"></i>
          </div>
          <p class="text-lg text-gray-700">
            {{
              hasConfirmedScore
                ? "Your score has been submitted and confirmed."
                : "All candidates in this category have been scored."
            }}
          </p>
          <p class="text-gray-600">
            Please await the announcement of the next candidate or final
            results.
          </p>
        </div>

        <!-- Active Candidate Display -->
        <div v-else class="transition-opacity duration-500 ease-in-out">
          <div class="flex flex-col md:flex-row items-start">
            <!-- Candidate Info -->
            <div class="md:w-1/3 mb-6 md:mb-0">
              <div class="flex items-center mb-4">
                <div class="text-2xl font-bold text-gray-800">
                  {{ next_candidate.first_name }} {{ next_candidate.last_name }}
                </div>
                <div
                  class="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                >
                  #{{ next_candidate.candidate_number }}
                </div>
              </div>

              <div class="relative">
                <img
                  v-if="next_candidate.photo"
                  :src="getCandidatePhotoUrl(next_candidate.photo)"
                  @error="event.target.src = '/default-avatar.png'"
                  alt="Candidate Photo"
                  class="w-48 h-48 object-cover rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
                />
                <div
                  v-else
                  class="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"
                >
                  No photo available
                </div>
              </div>
            </div>

            <!-- Scoring Form -->
            <div class="md:w-2/3 md:pl-8">
              <!-- Temporary Score Display -->
              <div
                v-if="temporaryScore"
                class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <h3 class="text-lg font-semibold text-blue-800 mb-2">
                  Temporary Score
                </h3>
                <div class="flex items-center mb-2">
                  <div class="w-24 font-medium text-gray-600">Score:</div>
                  <div class="text-xl font-bold text-blue-800">
                    {{ temporaryScore.score }}
                  </div>
                </div>
                <div class="flex items-start">
                  <div class="w-24 font-medium text-gray-600">Comments:</div>
                  <div class="text-gray-800">
                    {{ temporaryScore.comments || "None" }}
                  </div>
                </div>

                <button
                  @click="confirmScore"
                  :disabled="isSubmitting"
                  class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <span v-if="isSubmitting" class="mr-2">
                    <svg
                      class="animate-spin h-5 w-5 text-white"
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
                  Confirm Score
                </button>
              </div>

              <!-- Score Input Form -->
              <div v-else>
                <div class="mb-6">
                  <label
                    for="score"
                    class="block text-lg font-medium text-gray-700 mb-2"
                    >Score (0-100):</label
                  >
                  <div class="relative">
                    <input
                      type="text"
                      id="score"
                      v-model="score"
                      @input="handleScoreInput"
                      @keydown="restrictScoreKeydown"
                      :disabled="isSubmitting"
                      placeholder="Enter score"
                      class="border border-gray-300 rounded-lg px-4 py-3 w-full text-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                    <div
                      v-if="score !== null"
                      class="absolute right-4 top-3 text-xl font-bold text-blue-600"
                    >
                      {{ score }}/100
                    </div>
                  </div>
                </div>

                <div class="mb-6">
                  <label
                    for="comments"
                    class="block text-lg font-medium text-gray-700 mb-2"
                    >Comments:</label
                  >
                  <textarea
                    id="comments"
                    v-model="comments"
                    :disabled="isSubmitting"
                    placeholder="Optional comments about the candidate's performance"
                    rows="4"
                    class="border border-gray-300 rounded-lg px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  ></textarea>
                </div>

                <button
                  @click="submitScore"
                  :disabled="isSubmitting"
                  class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <span v-if="isSubmitting" class="mr-2">
                    <svg
                      class="animate-spin h-5 w-5 text-white"
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
                  Submit Score
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300"
    >
      <div
        class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 ease-out"
        :class="
          showConfirmModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        "
      >
        <h3 class="text-xl font-bold text-gray-800 mb-4">Confirm Score</h3>
        <p class="text-gray-700 mb-6">
          Are you sure you want to confirm a score of
          <span class="font-bold text-blue-600">{{ score }}</span>
          {{
            comments ? "with the following comments:" : "without any comments?"
          }}
        </p>

        <div
          v-if="comments"
          class="bg-gray-50 p-3 rounded mb-6 text-gray-700 italic"
        >
          "{{ comments }}"
        </div>

        <div class="flex justify-end space-x-3">
          <button
            @click="confirmScoreSubmission(false)"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-300"
          >
            Cancel
          </button>
          <button
            @click="confirmScoreSubmission(true)"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
