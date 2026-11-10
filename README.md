# luci-app-kodi

Kodi 的 LuCI 前端（iStoreOS / OpenWrt 24.10，纯 JS 视图，无 Lua 依赖）。

| 页面 | 作用 |
|---|---|
| 服务 → Kodi → 状态与控制 | 运行状态、启动/停止/重启（`luci.setInitAction` + 90s 轮询）、开机自启（`kodi.main.enabled`）、三通道说明（8080 HTTP / 9090 JSON-RPC / 9777 EventServer）、U 盘/存储卡列表、时区提示 |
| 服务 → Kodi → Web 远程控制 | Chorus2 iframe 内嵌（`:8080`），Kodi 未运行时给出引导而非死 iframe |

## Kodi 本体

24.10 的 packages 源里**没有** kodi，本仓库只含 LuCI 前端。Kodi 本体需要二选一：

- **A（快）**：把设备上现成的 `kodi 20.5` + 依赖抽成 prebuilt 包（aarch64/musl）
- **B（干净）**：引入 kodi 源码做交叉编译（构建时间 +1 小时，且需要补 patch）

选定后把包名加到 `luci-app-kodi` 的 `DEPENDS` 即可（当前故意不写 `+kodi`，避免 24.10 直接构建失败）。

## feed 接入

```
src-git kodi https://github.com/guangay/luci-app-kodi.git;main
```

```
./scripts/feeds update kodi
./scripts/feeds install -a -p kodi
```

## 说明

- 视图通过 `rpc.declare` 调 ubus（22.03 老 LuCI 没有 `ubus.js` 类，写法可在 24.10 继续用）
- 服务名假定为 `kodi`（`/etc/init.d/kodi`），与设备上的实现一致