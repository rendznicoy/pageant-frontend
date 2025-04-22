<script></script>
<template>
  <div
    class="flex min-h-screen bg-gray-100 py-3 flex-col justify-center sm:py-6"
  >
    <div class="relative sm:max-w-xl sm:mx-auto">
      <div
        class="absolute inset-0 bg-gradient-to-r from-green-400 to-yellow-400 shadow-lg transform -skew-y-12 sm:skew-y-0 sm:-rotate-12 sm:rounded-3xl"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-green-400 shadow-lg transform -skew-y-348 sm:skew-y-0 sm:-rotate-348 sm:rounded-3xl"
      ></div>
      <div class="relative bg-white px-2 py-5 shadow-lg sm:rounded-3xl sm:p-10">
        <div class="max-w-md mx-auto">
          <div class="flex items-center space-x-4">
            <a href="/">
              <img
                class="h-12 w-auto"
                src="/vsu.png"
                alt="Visayas State University Logo"
              />
            </a>
            <h1 class="text-2xl font-bold text-gray-900">
              VSU Pageant Scoring System
            </h1>
          </div>

          <div class="mt-12">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
