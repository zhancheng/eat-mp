<template>
  <view
    class="tag"
    :class="'tag-' + size"
    :style="{ backgroundColor: info.color, color: info.textColor }"
  >
    {{ info.name }}
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PLATFORMS } from '@/utils/constants'
import type { PlatformId, PlatformInfo } from '@/types/platform'

const props = withDefaults(
  defineProps<{
    platform?: PlatformId
    size?: 'normal' | 'small'
  }>(),
  {
    platform: 'meituan',
    size: 'normal'
  }
)

const info = computed((): PlatformInfo => {
  const p = PLATFORMS[props.platform]
  if (p) return p
  return {
    id: props.platform,
    name: props.platform,
    color: '#999',
    textColor: '#fff'
  }
})
</script>

<style lang="scss" scoped>
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 500;
}
.tag-small {
  font-size: 18rpx;
  padding: 2rpx 8rpx;
}
</style>
