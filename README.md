# Royal TSX 中文汉化脚本

这个仓库用于**直接汉化已安装的 macOS 应用 `Royal TSX.app`**（不是源码编译）。

## 适用版本

- `Royal TSX 6.3.0.1000`

脚本会做三件事：

1. 自动备份当前 App 语言文件
2. 补齐 `Localizable.strings` 里未汉化/英文残留文案
3. 给插件商店（Plugin Gallery）注入中文语言包，并支持 `zh-Hans/zh_CN` 自动识别

## 目录结构

- `royal_chinese.sh`：一键入口（推荐执行这个）
- `royal_chinese`：无后缀兼容入口（等价）
- `scripts/royal_chinese.mjs`：主逻辑脚本
- `translations/localizable-overrides.json`：人工校对过的固定译文
- `translations/google-cache.json`：在线翻译缓存（可提交，也可忽略）
- `backups/`：每次执行前自动备份（默认 git 忽略）

## 使用方法

### 1) 赋予执行权限（首次）

```bash
chmod +x royal_chinese.sh
```

### 2) 直接执行汉化

```bash
./royal_chinese.sh
```

默认目标 App：

- `/Applications/Royal TSX.app`

### 3) 指定 App 路径（可选）

```bash
./royal_chinese.sh --app "/Applications/Royal TSX.app"
```

### 4) 只预览，不写入（可选）

```bash
./royal_chinese.sh --dry-run
```

### 5) 禁用在线自动翻译（仅用本地词库）（可选）

```bash
./royal_chinese.sh --no-auto
```

## 执行后如何生效

- 完全退出并重启 `Royal TSX`
- 如果仍看到旧文案，可再次重启一次 App

## 回滚方法

每次执行都会在仓库内生成时间戳备份目录，例如：

- `backups/20260302-223000/...`

将备份文件拷回原 App 路径即可回滚。

## 常见问题

### 1) 报权限错误

如果终端没有写入 `/Applications` 权限，可使用：

```bash
sudo ./royal_chinese.sh
```

### 2) 为什么还有少量英文？

- 某些词是产品名/协议名（如 `SSH`、`VPN`）会保留英文
- 新版本新增文案会在下次运行脚本时继续补齐

### 3) 如何手工修正文案？

编辑：

- `translations/localizable-overrides.json`

把英文 key 对应到你想要的中文 value，再重新执行脚本。
