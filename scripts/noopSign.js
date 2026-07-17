// 自定义空签名脚本：覆盖 electron-builder 默认 winCodeSign，避免在无特权 Windows 上
// 解包 macOS 符号链接失败。本项目为本地免签名桌面软件，无需代码签名。
// electron-builder 兼容 `require()` 后取 `.default || module` 作为签名函数。
async function noopSign() {
  // do nothing — no code signing
}
module.exports = noopSign;
module.exports.default = noopSign;
