<template>
  <div class="content-box contentBox">
    <slot></slot>
  </div>
</template>

<style scoped lang="scss">
.content-box,
.contentBox {
  background: var(--background-card);
  border-radius: 10px;
  color: var(--color-body);
  stroke: var(--color-body);

  margin-bottom: 25px;
}
</style>
