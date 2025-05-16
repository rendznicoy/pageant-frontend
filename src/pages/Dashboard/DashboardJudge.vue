<script>
import { useUserStore } from "@/stores/user";
import axiosClient from "@/axios";
import Pusher from "pusher-js";
import { useToast } from "vue-toastification";

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
      channel: null,
      pusher: null,
      showConfirmModal: false,
    };
  },
  setup() {
    const userStore = useUserStore();
    const toast = useToast();
    return { userStore, toast };
  },
  mounted() {
    console.log("Stored token:", localStorage.getItem("token"));
    this.initializePusher();
    this.fetchCurrentSession();
  },
  beforeUnmount() {
    if (this.channel && this.event) {
      this.pusher.unsubscribe(`event.${this.event.event_id}`);
    }
  },
  methods: {
    initializePusher() {
      this.pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
        encrypted: true,
      });
    },
    async fetchCurrentSession() {
      const token = localStorage.getItem("token");
      console.log("Using token for current-session:", token);
      if (!token) {
        this.toast.error("No authentication token found. Please log in again.");
        this.$router.push("/login/judge");
        return;
      }
      try {
        const response = await axiosClient.get("/api/v1/judge/current-session");
        console.log("Fetched session:", response.data);
        if (response.status === 200) {
          this.judge_id = response.data.judge.judge_id;
          this.judge_name = response.data.judge_name;
          this.event = response.data.event;
          this.current_category = response.data.current_category;
          this.next_candidate = response.data.next_candidate;
          this.criteria = response.data.criteria;
          if (this.event) {
            this.subscribeToPusher();
          }
        }
      } catch (error) {
        console.error("Error fetching current session:", error);
        this.toast.error(
          "Failed to fetch session: " +
            (error.response?.data?.message || error.message)
        );
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          this.$router.push("/login/judge");
        }
      }
    },
    subscribeToPusher() {
      this.channel = this.pusher.subscribe(`event.${this.event.event_id}`);
      this.channel.bind("App\\Events\\ScoreSubmitted", (data) => {
        if (
          data.score.judge_id === this.judge_id &&
          data.score.category_id === this.current_category.category_id &&
          data.score.candidate_id === this.next_candidate?.candidate_id
        ) {
          this.temporaryScore = data.score;
          this.toast.success("Score submitted, please confirm");
        }
      });
      this.channel.bind("App\\Events\\ScoreConfirmed", (data) => {
        if (
          data.score.judge_id === this.judge_id &&
          data.score.category_id === this.current_category.category_id &&
          data.score.candidate_id === this.next_candidate?.candidate_id
        ) {
          this.temporaryScore = null;
          this.score = null;
          this.comments = "";
          this.isWaitingForNextCandidate = true;
          this.toast.success("Score confirmed");
        }
      });
      this.channel.bind("App\\Events\\CandidateSet", (data) => {
        if (data.category_id === this.current_category.category_id) {
          this.fetchCurrentSession();
          this.temporaryScore = null;
          this.score = null;
          this.comments = "";
          this.isWaitingForNextCandidate = false;
          this.toast.info("New candidate assigned");
        }
      });
    },
    validateScore() {
      if (
        !this.score ||
        this.score < 0 ||
        this.score > 100 // Changed to 100
      ) {
        this.toast.error("Please enter a valid score (0-100)");
        return false;
      }
      return true;
    },
    async submitScore() {
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
        console.error("Invalid score", { score: this.score });
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
        this.temporaryScore = response.data.score;
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
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Judge Dashboard</h1>
    <p><strong>Judge:</strong> {{ judge_name }}</p>
    <div v-if="event">
      <p><strong>Event:</strong> {{ event.event_name }}</p>
      <p><strong>Status:</strong> {{ event.status }}</p>
      <div v-if="event.status !== 'active'" class="text-red-600">
        <p>Event is not currently active.</p>
      </div>
    </div>
    <div v-else>
      <p class="text-red-600">No event assigned.</p>
    </div>
    <div v-if="current_category && next_candidate">
      <p><strong>Category:</strong> {{ current_category.category_name }}</p>
      <p><strong>Stage:</strong> {{ current_category.stage_name }}</p>
      <p>
        <strong>Candidate:</strong> {{ next_candidate.first_name }}
        {{ next_candidate.last_name }} (#{{ next_candidate.candidate_number }})
      </p>
      <img
        v-if="next_candidate.photo"
        :src="next_candidate.photo"
        alt="Candidate Photo"
        class="w-32 h-32 object-cover my-2"
      />
      <div v-if="isWaitingForNextCandidate" class="mt-4">
        <p class="text-gray-600">Waiting for the next candidate...</p>
      </div>
      <div v-else class="mt-4">
        <label for="score" class="block">Score (0-100):</label>
        <input
          type="number"
          v-model.number="score"
          min="0"
          max="100"
          step="1"
          :disabled="isSubmitting || temporaryScore"
          class="border rounded px-2 py-1 w-20"
        />
        <label for="comments" class="block mt-2">Comments:</label>
        <textarea
          v-model="comments"
          :disabled="isSubmitting || temporaryScore"
          class="border rounded px-2 py-1 w-full"
        ></textarea>
      </div>
      <div v-if="!isWaitingForNextCandidate" class="mt-4">
        <button
          @click="submitScore"
          :disabled="!score || isSubmitting || temporaryScore"
          class="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Submit Score
        </button>
        <button
          v-if="temporaryScore"
          @click="confirmScore"
          :disabled="isSubmitting"
          class="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Confirm Score
        </button>
      </div>
      <div v-if="temporaryScore" class="mt-4">
        <p><strong>Temporary Score:</strong> {{ temporaryScore.score }}</p>
        <p>
          <strong>Comments:</strong> {{ temporaryScore.comments || "None" }}
        </p>
      </div>
    </div>
    <div v-else-if="event">
      <p>No active category or candidate for scoring.</p>
    </div>
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded shadow-lg">
        <p>
          Are you sure you want to confirm a score of {{ score }}
          {{
            comments ? 'with comments: "' + comments + '"' : "without comments"
          }}
          for {{ next_candidate.first_name }} {{ next_candidate.last_name }}?
        </p>
        <div class="mt-4">
          <button
            @click="confirmScoreSubmission(true)"
            class="bg-green-500 text-white px-4 py-2 rounded mr-2"
          >
            Yes
          </button>
          <button
            @click="confirmScoreSubmission(false)"
            class="bg-red-500 text-white px-4 py-2 rounded"
          >
            No
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
