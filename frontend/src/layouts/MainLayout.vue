<template>
  <div class="flex min-h-screen w-full bg-app">
    <!-- Sidebar (Hanya aktif pada Desktop lg: >= 1024px, dinonaktifkan pada HP & Tablet) -->
    <Sidebar @collapse-change="isCollapsed = $event" />

    <!-- Main Content Wrapper -->
    <div
      :class="[
        'flex-1 flex flex-col min-w-0 w-full transition-all duration-200',
        isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-52'
      ]"
    >
      <!-- Navbar (Frozen / Sticky Top Header) -->
      <Navbar />

      <!-- Page Content (pb-24 untuk memberi ruang bagi Sticky Bottom Navbar pada Mobile & Tablet) -->
      <main class="flex-1 p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-24 lg:pb-6 w-full min-w-0 max-w-full">
        <slot />
      </main>

      <!-- Sticky Bottom Navbar (Khusus Mobile Smartphone & Tablet) -->
      <BottomNavbar />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '../components/layout/Sidebar.vue'
import Navbar from '../components/layout/Navbar.vue'
import BottomNavbar from '../components/layout/BottomNavbar.vue'

const isCollapsed = ref(false)
</script>
