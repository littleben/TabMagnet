# TabMagnet 标签关闭行为测试指南

## 新功能概述

版本 1.1.0 添加了标签关闭后的跳转行为控制功能，响应了用户郭涛的建议。

### 功能特性

1. **左侧跳转（默认推荐）**
   - 关闭标签后跳转到左侧标签
   - 符合大多数用户的工作流习惯
   - 提供更好的连续性体验

2. **右侧跳转（浏览器默认）**
   - 关闭标签后跳转到右侧标签
   - 保持Chrome的原生行为
   - 适合习惯默认行为的用户

3. **智能跳转**
   - 优先跳转到父标签（opener）
   - 其次跳转到左侧标签
   - 最后跳转到右侧标签
   - 提供最智能的用户体验

## 实现原理

### 事件监听
- 使用 `chrome.tabs.onRemoved` 监听标签关闭事件
- 只在非浏览器默认行为时进行干预
- 避免在整个窗口关闭时干扰

### 跳转逻辑
```javascript
// 智能跳转优先级
1. 父标签（如果存在且有效）
2. 左侧标签（如果存在）
3. 右侧标签（如果存在）
```

### 安全检查
- 检查窗口是否正在关闭
- 验证目标标签是否存在
- 确保不与Chrome内部逻辑冲突

## 测试步骤

### 测试1: 基本左侧跳转
1. 打开多个标签页（至少3个）
2. 设置关闭行为为"左侧跳转"
3. 选择中间的标签页
4. 关闭当前标签页
5. **预期结果**: 跳转到左侧标签页

### 测试2: 右侧跳转
1. 打开多个标签页
2. 设置关闭行为为"右侧跳转"
3. 选择中间的标签页
4. 关闭当前标签页
5. **预期结果**: 跳转到右侧标签页（Chrome默认行为）

### 测试3: 智能跳转 - 父标签优先
1. 打开一个标签页A
2. 从标签页A中打开新标签页B（右键链接 → 新标签页打开）
3. 设置关闭行为为"智能跳转"
4. 关闭标签页B
5. **预期结果**: 跳转到标签页A（父标签）

### 测试4: 智能跳转 - 左侧回退
1. 打开多个标签页，没有父子关系
2. 设置关闭行为为"智能跳转"
3. 选择中间的标签页
4. 关闭当前标签页
5. **预期结果**: 跳转到左侧标签页

### 测试5: 边界情况 - 最左侧标签
1. 打开多个标签页
2. 设置关闭行为为"左侧跳转"
3. 选择最左侧的标签页
4. 关闭当前标签页
5. **预期结果**: 跳转到新的最左侧标签页（原来的第二个）

### 测试6: 边界情况 - 最右侧标签
1. 打开多个标签页
2. 设置关闭行为为"左侧跳转"
3. 选择最右侧的标签页
4. 关闭当前标签页
5. **预期结果**: 跳转到左侧标签页

### 测试7: 多语言界面
1. 切换到中文界面
2. 验证标签关闭行为选项的中文显示
3. 切换到日文界面
4. 验证标签关闭行为选项的日文显示

## 用户体验验证

### 工作流测试
1. **研究场景**: 打开多个相关文档，从左到右阅读
2. **购物场景**: 打开多个商品页面进行比较
3. **开发场景**: 打开多个代码文件和文档

### 性能测试
1. 快速连续关闭多个标签页
2. 在有大量标签页的窗口中测试
3. 同时打开多个窗口进行测试

## 预期结果

- ✅ 左侧跳转作为默认行为，符合用户期望
- ✅ 智能跳转提供最佳用户体验
- ✅ 右侧跳转保持与Chrome的兼容性
- ✅ 边界情况得到正确处理
- ✅ 不干扰Chrome的内部标签管理
- ✅ 多语言界面正确显示
- ✅ 设置保存和恢复正常工作

## 已知限制

1. **不干扰窗口关闭**: 当整个窗口关闭时，不会触发跳转逻辑
2. **Chrome内部标签**: 对于chrome://页面等系统标签，行为可能有所不同
3. **扩展冲突**: 与其他标签管理扩展可能存在冲突

## 回退方案

如果出现问题：
1. 设置关闭行为为"右侧跳转"恢复Chrome默认行为
2. 禁用扩展暂时恢复原生体验
3. 回退到版本1.0.6（无关闭行为功能）
