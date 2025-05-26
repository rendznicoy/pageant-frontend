<script setup>
import { computed, defineProps } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const props = defineProps({
  statisticians: {
    type: [Array, null],
    default: () => [],
  },
});

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);
const safeStatisticians = computed(() => props.statisticians || []);

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Helper function to get a consistent color for each statistician
const getAvatarColor = (name, index) => {
  const colors = [
    { bg: "bg-blue-500", text: "text-white" },
    { bg: "bg-green-500", text: "text-white" },
    { bg: "bg-purple-500", text: "text-white" },
    { bg: "bg-orange-500", text: "text-white" },
    { bg: "bg-pink-500", text: "text-white" },
    { bg: "bg-indigo-500", text: "text-white" },
    { bg: "bg-teal-500", text: "text-white" },
    { bg: "bg-red-500", text: "text-white" },
  ];

  if (!name) return colors[0];

  // Use name length + index for consistent color assignment
  const colorIndex = (name.length + index) % colors.length;
  return colors[colorIndex];
};
</script>

<template>
  <div
    class="rounded-xl shadow-lg p-6 transition-all duration-300 border"
    :class="
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    "
  >
    <!-- Header -->
    <div class="flex items-center mb-6">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
        :class="
          isDarkMode
            ? 'bg-emerald-900/30 text-emerald-400'
            : 'bg-emerald-100 text-emerald-600'
        "
      >
        <i class="fas fa-user-tie text-lg"></i>
      </div>
      <div>
        <h3
          class="text-lg font-semibold transition-colors"
          :class="isDarkMode ? 'text-white' : 'text-gray-800'"
        >
          Statisticians
        </h3>
        <p
          class="text-xs transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        >
          Event Statisticians
        </p>
      </div>
    </div>

    <!-- Statisticians List -->
    <div v-if="safeStatisticians.length" class="space-y-3">
      <div
        v-for="(stat, index) in safeStatisticians"
        :key="stat.id || stat.name || index"
        class="flex items-center p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] group"
        :class="
          isDarkMode
            ? 'bg-gray-700/50 hover:bg-gray-700 hover:shadow-md'
            : 'bg-gray-50 hover:bg-gray-100 hover:shadow-md'
        "
      >
        <!-- Avatar -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center mr-4 font-semibold text-sm transition-transform duration-200 group-hover:scale-110"
          :class="
            getAvatarColor(
              stat.name || `${stat.first_name} ${stat.last_name}`,
              index
            )
          "
        >
          {{ getInitials(stat.name || `${stat.first_name} ${stat.last_name}`) }}
        </div>

        <!-- Name and Info -->
        <div class="flex-1 min-w-0">
          <div
            class="font-medium truncate transition-colors"
            :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
          >
            {{ stat.name || `${stat.first_name} ${stat.last_name}` }}
          </div>
          <div
            class="text-xs flex items-center mt-1 transition-colors"
            :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
          >
            <i class="fas fa-chart-line mr-1 text-xs"></i>
            <span>Statistician</span>
          </div>
        </div>

        <!-- Status Indicator -->
        <div
          class="w-2 h-2 rounded-full transition-colors"
          :class="isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'"
          title="Active"
        ></div>
      </div>

      <!-- Summary -->
      <div
        class="mt-6 pt-4 border-t transition-colors"
        :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-sm transition-colors"
            :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
          >
            Total Statisticians
          </span>
          <div class="flex items-center">
            <span
              class="text-lg font-bold mr-2 transition-colors"
              :class="isDarkMode ? 'text-emerald-400' : 'text-emerald-600'"
            >
              {{ safeStatisticians.length }}
            </span>
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center"
              :class="
                isDarkMode
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'bg-emerald-100 text-emerald-600'
              "
            >
              <i class="fas fa-check text-xs"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <div
        class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
        "
      >
        <i class="fas fa-user-plus text-2xl"></i>
      </div>
      <h4
        class="text-lg font-medium mb-2 transition-colors"
        :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
      >
        No Statisticians Assigned
      </h4>
      <p
        class="text-sm transition-colors"
        :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
      >
        Add statisticians
      </p>
      <div
        class="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
        "
      >
        <i class="fas fa-info-circle mr-2"></i>
        Edit event to add statisticians
      </div>
    </div>
  </div>
</template>
