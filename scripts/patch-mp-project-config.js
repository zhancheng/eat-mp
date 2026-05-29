/**
 * 为 dist 下 project.config.json 写入 cloudbaseConfig，与开发者工具默认云环境对齐
 */
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloudbase-d5g6ftxvg6526813c'

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const cfg = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  cfg.cloudbaseConfig = { env: ENV_ID }
  if (!cfg.cloudfunctionRoot) {
    cfg.cloudfunctionRoot = 'cloudfunctions/'
  }
  fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2) + '\n')
  console.log('[patch-mp-project-config]', path.relative(process.cwd(), filePath))
}

function patchMpProjectConfig() {
  const root = path.resolve(__dirname, '..')
  ;[
    path.join(root, 'dist/dev/mp-weixin/project.config.json'),
    path.join(root, 'dist/build/mp-weixin/project.config.json')
  ].forEach(patchFile)
}

if (require.main === module) {
  patchMpProjectConfig()
}

module.exports = { patchMpProjectConfig, ENV_ID }
