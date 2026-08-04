<template>
  <section class="home-view" aria-label="Home">
    <h1 class="home-view__title">Home</h1>
    <p class="home-view__subtitle">Select a section from the sidebar to get started.</p>
  </section>
</template>

<style scoped lang="scss">
.home-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-view__title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.2;
}

.home-view__subtitle {
  margin: 0;
  opacity: 0.75;
}
</style>
