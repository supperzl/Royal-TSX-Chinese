# Royal TSX 中文汉化脚本

这个仓库用于直接汉化你本机已安装的 `Royal TSX.app`（不是源码编译）。

## 适用版本

- `Royal TSX 6.3.0.1000`

## 汉化方式

采用固定模板替换：

1. 仓库内保存已完成汉化的目标文件
2. 执行脚本时先备份原文件
3. 再把模板文件直接覆盖到 App 对应路径

不依赖在线翻译，不做动态词条处理，结果可复现。

## 目录结构

- `royal_chinese.sh`：入口脚本（推荐）
- `scripts/royal_chinese.mjs`：主逻辑
- `templates/6.3.0.1000/`：该版本的汉化模板文件
- `templates/6.3.0.1000/MANIFEST.txt`：模板文件校验清单（sha256）
- `backups/`：每次执行前自动备份

## 当前替换文件

- `Contents/Resources/zh-Hans.lproj/Localizable.strings`
- `Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/index.html`
- `Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/js/language.js`
- `Contents/Frameworks/RoyalTSXNativeUI.framework/Versions/A/Resources/PluginGallery/js/language_zh.js`

## 使用方法

### 1) 首次赋权

```bash
chmod +x royal_chinese.sh
```

### 2) 直接执行（自动识别 `/Applications/Royal TSX.app`）

```bash
./royal_chinese.sh
```

### 3) 指定 App 路径（如果不在默认位置）

```bash
./royal_chinese.sh --app "/Applications/Royal TSX.app"
```

### 4) 仅预览，不写入

```bash
./royal_chinese.sh --dry-run
```

### 5) 指定模板版本

```bash
./royal_chinese.sh --version 6.3.0.1000
```

## 回滚

每次执行都会生成备份目录，例如：

- `backups/20260302-231500/...`

把备份文件复制回原 App 路径即可回滚。

## 生效方式

- 完全退出并重启 `Royal TSX`

## 常见问题

### 1) 权限不足

如果没有写入 `/Applications` 权限：

```bash
sudo ./royal_chinese.sh
```

### 2) 版本不一致

脚本会显示当前 App 构建号和模板版本。若不一致，请先确认兼容性再替换。
