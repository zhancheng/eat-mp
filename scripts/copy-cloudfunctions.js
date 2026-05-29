/**
 * 将仓库根目录 cloudfunctions/ 同步到微信小程序编译输出目录。
 * 微信开发者工具以 dist/dev/mp-weixin 为项目根时，云函数须落在该目录下的 cloudfunctions/。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'cloudfunctions')

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const name of fs.readdirSync(from)) {
    const srcPath = path.join(from, name)
    const destPath = path.join(to, name)
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copyCloudfunctions() {
  if (!fs.existsSync(src)) {
    console.warn('[copy-cloudfunctions] 源目录不存在:', src)
    return []
  }

  const targets = [
    path.join(root, 'dist/dev/mp-weixin/cloudfunctions'),
    path.join(root, 'dist/build/mp-weixin/cloudfunctions')
  ]

  const copied = []
  for (const dest of targets) {
    const parent = path.dirname(dest)
    if (!fs.existsSync(parent)) continue
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    copyDir(src, dest)
    copied.push(path.relative(root, dest))
    console.log('[copy-cloudfunctions]', path.relative(root, dest))
  }
  return copied
}

const { patchMpProjectConfig } = require('./patch-mp-project-config.js')

if (require.main === module) {
  copyCloudfunctions()
  patchMpProjectConfig()
}

function copyCloudfunctionsAndPatch() {
  copyCloudfunctions()
  patchMpProjectConfig()
}

module.exports = { copyCloudfunctions, copyCloudfunctionsAndPatch }
