import React from 'react';

/**
 * macOS 风格无边框顶栏（T04 / B4，全平台套用）。
 * 左侧红/黄/绿窗口按钮，中间可拖拽区（app-region: drag），
 * 双击拖拽区切换最大化。按钮区 no-drag 以免吞掉点击。
 */
export function TitleBar() {
  const api = window.FirstBucket;
  return (
    <div className="app-titlebar" onDoubleClick={() => api?.toggleMaximize()}>
      <div className="titlebar-btns">
        <button className="titlebar-btn titlebar-close" title="关闭" onClick={() => api?.close()}><span>×</span></button>
        <button className="titlebar-btn titlebar-min" title="最小化" onClick={() => api?.minimize()}><span>−</span></button>
        <button className="titlebar-btn titlebar-max" title="最大化 / 还原" onClick={() => api?.toggleMaximize()}><span>▢</span></button>
      </div>
      <div className="titlebar-drag">FirstBucket</div>
    </div>
  );
}
