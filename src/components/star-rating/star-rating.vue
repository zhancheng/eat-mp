<template>
  <view class="star-rating" :class="{ interactive: !readonly }">
    <uni-icons
      v-for="n in max"
      :key="n"
      :type="n <= rating ? 'star-filled' : 'star'"
      :size="size"
      :color="n <= rating ? activeColor : inactiveColor"
      @tap="onTap(n)"
    />
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    rating: number
    max?: number
    size?: number | string
    activeColor?: string
    inactiveColor?: string
    readonly?: boolean
  }>(),
  {
    max: 5,
    size: 14,
    activeColor: '#ff9500',
    inactiveColor: '#ddd',
    readonly: true
  }
)

const emit = defineEmits<{
  change: [rating: number]
}>()

function onTap(value: number) {
  if (props.readonly) return
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
}
.star-rating.interactive {
  gap: 8rpx;
}
</style>
