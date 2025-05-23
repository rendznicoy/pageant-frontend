<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useEventStore } from "@/stores/event";
import { useSidebarStore } from "@/sidebar";
import { useRouter } from "vue-router";
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import EventFilters from "@/components/dashboard/EventFilters.vue";
import CardsGrid from "@/components/dashboard/CardsGrid.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";

const eventStore = useEventStore();
const sidebar = useSidebarStore();
const router = useRouter();

const filter = ref("all");
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 3;
const isLoading = ref(true);
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
  isLoading.value = true;
  await eventStore.fetchEvents(true); // force fetch
  isLoading.value = false;
  window.addEventListener("resize", updateWindowWidth);
  window.addEventListener("refresh-dashboard", refreshDashboard);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
  window.removeEventListener("refresh-dashboard", refreshDashboard);
});

const filtered = computed(() => {
  let result = [...eventStore.events];
  result = result.filter((e) => !e.removed);
  if (filter.value !== "all") {
    result = result.filter((e) => e.status === filter.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((e) => e.event_name.toLowerCase().includes(query));
  }
  console.log("Filtered events:", result); // Debug log
  return result;
});

const totalItems = computed(() => filtered.value.length);

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginated = filtered.value.slice(start, end);
  console.log("Paginated events:", paginated); // Debug log
  return paginated;
});

const totalPages = computed(() =>
  Math.ceil(filtered.value.length / itemsPerPage)
);

const refreshDashboard = async () => {
  isRefreshing.value = true;
  try {
    await eventStore.fetchEvents(true);
    console.log("Refreshed events:", eventStore.events); // Debug log
    await new Promise((resolve) => setTimeout(resolve, 500)); // Ensure animation is visible
    refreshKey.value++;
    await nextTick(); // Force re-render
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
  } finally {
    isRefreshing.value = false;
  }
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 overflow-x-hidden overflow-y-auto">
    <Navbar @refresh-dashboard="refreshDashboard" />
    <Sidebar @refresh-dashboard="refreshDashboard" role="admin" />

    <div class="transition-all duration-300" :class="layoutShift">
      <div class="mt-4 mx-4 rounded-lg">
        <Breadcrumbs
          :items="[
            { label: 'Home', to: '/admin/dashboard' },
            { label: 'Dashboard' },
          ]"
        />
      </div>
      <!-- Main Card Container -->
      <div class="bg-white rounded-lg shadow-md p-6 mt-4 mx-4">
        <!-- Section Heading -->
        <div class="flex items-center justify-between p-6 pt-2 pb-0 mx-4 mb-4">
          <div class="flex items-center space-x-2">
            <i class="fas fa-calendar-alt text-green-600 text-2xl mb-1"></i>
            <h2 class="text-2xl font-semibold text-green-800">Events</h2>
          </div>
          <button
            @click="createEvent"
            class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            <i class="fas fa-plus mr-2"></i>
            Add Event
          </button>
        </div>
        <!-- Filters & Search Card -->
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div
            class="flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <!-- Filter Button with Icon -->
            <div class="flex items-center space-x-2 w-full md:w-40">
              <EventFilters v-model:filter="filter" />
            </div>

            <!-- Search Bar with Icon -->
            <div class="relative w-full md:w-300">
              <i
                class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600"
              ></i>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search event..."
                class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              />
            </div>
          </div>
        </div>

        <!-- Content Loader or Events -->
        <div v-if="isLoading || eventStore.loading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-2xl text-green-600"></i>
          <p class="text-gray-500 mt-2">Loading events...</p>
        </div>

        <div v-else class="content-area" :class="{ 'fade-out': isRefreshing }">
          <div v-if="filtered.length === 0" class="text-center py-8">
            <p class="text-gray-500">No events found.</p>
          </div>

          <div v-else>
            <CardsGrid
              :key="refreshKey"
              :events="paginatedEvents"
              @remove="eventStore.deleteEvent"
            />
          </div>
        </div>
        <!-- Pagination Controls -->
        <div
          class="bg-white border border-gray-200 rounded-lg shadow-md p-4 mt-6 mx-4 flex justify-between items-center"
        >
          <span class="text-sm text-green-600">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
            {{ (currentPage - 1) * itemsPerPage + paginatedEvents.length }} of
            {{ totalItems }} results
          </span>

          <div
            class="flex items-center border border-gray-200 rounded overflow-hidden shadow-sm"
          >
            <!-- Previous Arrow -->
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-3 py-1 bg-white text-green-600 hover:bg-gray-100 disabled:opacity-40"
            >
              <i class="fas fa-chevron-left"></i>
            </button>

            <!-- Current Page -->
            <span
              class="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold select-none"
            >
              {{ currentPage }}
            </span>

            <!-- Next Arrow -->
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 bg-white text-green-600 hover:bg-gray-100 disabled:opacity-40"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-area {
  transition: opacity 0.3s ease;
}
.content-area.fade-out {
  opacity: 0;
}
</style>
