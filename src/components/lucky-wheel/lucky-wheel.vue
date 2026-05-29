<template>
  <view class="wheel-wrap">
    <view class="pointer" />
    <canvas type="2d" id="wheelCanvas" class="wheel-canvas" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, getCurrentInstance, type ComponentPublicInstance } from 'vue'
import type { WheelItem } from '@/types/restaurant'

interface WheelSegment extends WheelItem {
  color: string
  angle: number
}

const COLORS = [
  '#FF6B35', '#FFC300', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500'
]

const props = withDefaults(
  defineProps<{
    items?: WheelItem[]
  }>(),
  {
    items: () => []
  }
)

const rotation = ref(0)
const segments = ref<WheelSegment[]>([])
interface CanvasNode {
  width: number
  height: number
  getContext(type: '2d'): CanvasRenderingContext2D
  requestAnimationFrame(callback: () => void): number
}

let canvas: CanvasNode | null = null
let ctx: CanvasRenderingContext2D | null = null
let canvasSize = 300

const instance = getCurrentInstance()

watch(
  () => props.items,
  (list) => {
    if (list?.length) buildSegments(list)
  },
  { deep: true }
)

onMounted(() => {
  setTimeout(initCanvas, 100)
})

function initCanvas() {
  if (!instance?.proxy) return
  const query = uni.createSelectorQuery().in(instance.proxy as unknown as ComponentPublicInstance)
  query
    .select('#wheelCanvas')
    // uni-app 类型定义要求 fields 传入回调，运行时单参数即可
    .fields({ node: true, size: true }, () => {})
    .exec((res) => {
      if (!res[0]?.node) return
      const node = res[0].node
      const context = node.getContext('2d')
      const dpr = uni.getSystemInfoSync().pixelRatio
      const size = res[0].width
      node.width = size * dpr
      node.height = size * dpr
      context.scale(dpr, dpr)
      canvas = node
      ctx = context
      canvasSize = size
      if (props.items.length) buildSegments(props.items)
      else drawWheel([])
    })
}

function buildSegments(items: WheelItem[]) {
  const n = items.length
  const anglePer = 360 / n
  segments.value = items.map((item, i) => ({
    ...item,
    color: COLORS[i % COLORS.length],
    angle: anglePer
  }))
  drawWheel(segments.value)
}

function drawWheel(segs: WheelSegment[]) {
  if (!ctx || !canvas) return
  const context = ctx
  const size = canvasSize
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4
  context.clearRect(0, 0, size, size)

  if (!segs.length) {
    context.beginPath()
    context.arc(cx, cy, r, 0, Math.PI * 2)
    context.fillStyle = '#eee'
    context.fill()
    context.fillStyle = '#999'
    context.font = '14px sans-serif'
    context.textAlign = 'center'
    context.fillText('请先加载餐厅', cx, cy)
    return
  }

  const n = segs.length
  const slice = (Math.PI * 2) / n
  const rot = (rotation.value * Math.PI) / 180

  segs.forEach((seg, i) => {
    const start = rot + i * slice - Math.PI / 2
    const end = start + slice
    context.beginPath()
    context.moveTo(cx, cy)
    context.arc(cx, cy, r, start, end)
    context.closePath()
    context.fillStyle = seg.color
    context.fill()
    context.strokeStyle = '#fff'
    context.lineWidth = 2
    context.stroke()

    context.save()
    context.translate(cx, cy)
    context.rotate(start + slice / 2)
    context.fillStyle = '#fff'
    context.font = 'bold 12px sans-serif'
    context.textAlign = 'center'
    const label = seg.label || seg.name || ''
    const text = label.length > 6 ? label.slice(0, 5) + '…' : label
    context.fillText(text, r * 0.62, 4)
    context.restore()
  })

  context.beginPath()
  context.arc(cx, cy, 28, 0, Math.PI * 2)
  context.fillStyle = '#fff'
  context.fill()
  context.strokeStyle = '#FF6B35'
  context.lineWidth = 3
  context.stroke()
}

function spinToIndex(targetIndex: number): Promise<number> {
  const segs = segments.value
  if (!segs.length) return Promise.resolve(-1)

  const n = segs.length
  const sliceAngle = 360 / n
  const targetCenter = targetIndex * sliceAngle + sliceAngle / 2
  const extraRotations = 5 * 360
  const current = rotation.value % 360
  const delta = extraRotations + (360 - targetCenter) - (current % 360)

  return new Promise((resolve) => {
    const duration = 7000
    const startRot = rotation.value
    const endRot = startRot + delta
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 5)
      rotation.value = startRot + delta * eased
      drawWheel(segs)

      if (progress < 1) {
        canvas?.requestAnimationFrame(animate)
      } else {
        rotation.value = endRot % 360
        resolve(targetIndex)
      }
    }
    animate()
  })
}

function spinRandom() {
  const n = segments.value.length
  if (!n) return Promise.resolve(-1)
  const index = Math.floor(Math.random() * n)
  return spinToIndex(index)
}

defineExpose({ spinRandom, spinToIndex, buildSegments })
</script>

<style lang="scss" scoped>
.wheel-wrap {
  position: relative;
  width: 600rpx;
  height: 600rpx;
  margin: 0 auto;
}
.wheel-canvas {
  width: 600rpx;
  height: 600rpx;
  display: block;
}
.pointer {
  position: absolute;
  top: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 24rpx solid transparent;
  border-right: 24rpx solid transparent;
  border-top: 48rpx solid #ff6b35;
  z-index: 10;
}
</style>
