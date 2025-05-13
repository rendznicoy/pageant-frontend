<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useEventStore } from "@/stores/event";
import { useSidebarStore } from "@/sidebar";
import { useRouter } from "vue-router";
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import EventHeader from "@/components/dashboard/EventHeader.vue";
import EventFilters from "@/components/dashboard/EventFilters.vue";
import CardsGrid from "@/components/dashboard/CardsGrid.vue";
import ListGrid from "@/components/dashboard/ListGrid.vue";

const eventStore = useEventStore();
const sidebar = useSidebarStore();
const router = useRouter();

const filter = ref("all");
const sort = ref("event_name");
const view = ref("card");
const showCount = ref("all");
const isRefreshing = ref(false);
const refreshKey = ref(0);

const windowWidth = ref(window.innerWidth);
const layoutShift = computed(() =>
  sidebar.isOpen && windowWidth.value >= 1024 ? "ml-64" : "ml-0"
);

const createEvent = () => {
  console.log("Navigating to create event page");
  router.push("/events/create");
};

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(async () => {
  if (!eventStore.initialized) {
    await eventStore.fetchEvents();
  }
  window.addEventListener("resize", updateWindowWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
});

const filtered = computed(() => {
  let result = [...eventStore.events];
  if (filter.value === "removed") {
    result = result.filter((e) => e.removed);
  } else {
    result = result.filter((e) => !e.removed);
    if (filter.value === "starred") {
      result = result.filter((e) => e.starred);
    } else if (filter.value !== "all") {
      result = result.filter((e) => e.status === filter.value);
    }
  }
  if (sort.value === "event_name") {
    result.sort((a, b) => a.event_name.localeCompare(b.event_name));
  } else if (sort.value === "last_accessed") {
    result.sort(
      (a, b) => new Date(b.last_accessed) - new Date(a.last_accessed)
    );
  }
  if (filter.value === "all") {
    result.sort((a, b) => (a.starred === b.starred ? 0 : a.starred ? -1 : 1));
  }
  return result;
});

const displayed = computed(() =>
  showCount.value === "all" ? filtered.value : filtered.value.slice(0, 12)
);

const refreshDashboard = async () => {
  isRefreshing.value = true;
  try {
    await eventStore.fetchEvents(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    refreshKey.value++;
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
  } finally {
    isRefreshing.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar @refresh-dashboard="refreshDashboard" />
    <Sidebar @refresh-dashboard="refreshDashboard" role="tabulator" />

    <div class="transition-all duration-300" :class="layoutShift">
      <EventHeader />

      <div class="p-6">
        <!-- Create Event Button -->
        <div class="flex justify-end mb-4">
          <button
            @click="createEvent"
            class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors"
          >
            <i class="fas fa-plus mr-2"></i>
            Create Event
          </button>
        </div>
        <EventFilters
          v-model:filter="filter"
          v-model:sort="sort"
          v-model:view="view"
          v-model:show-count="showCount"
        />

        <div v-if="eventStore.loading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-2xl text-green-600"></i>
        </div>

        <div v-else-if="filtered.length === 0" class="text-center py-8">
          <p class="text-gray-500">No events found.</p>
          <button
            v-if="filter === 'removed'"
            @click="filter = 'all'"
            class="mt-4 text-green-600 hover:underline"
          >
            Return to all events
          </button>
        </div>

        <div v-else>
          <CardsGrid
            v-if="view === 'card'"
            :key="refreshKey"
            :events="displayed"
            @toggle-star="eventStore.toggleStar"
            @remove="eventStore.toggleRemoved"
          />
          <div v-else class="space-y-4">
            <ListGrid
              v-if="view === 'list'"
              :key="refreshKey"
              :events="displayed"
              @toggle-star="eventStore.toggleStar"
              @remove="eventStore.toggleRemoved"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes refreshFade {
  0% {
    background-color: rgba(0, 128, 0, 0.1);
  }
  100% {
    background-color: transparent;
  }
}
</style>
