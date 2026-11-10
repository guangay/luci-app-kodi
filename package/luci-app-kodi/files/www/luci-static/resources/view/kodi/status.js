'use strict';
'require view';
'require rpc';
'require uci';
'require fs';

// Kodi 状态与控制页：
//  - 服务运行状态 / 开机自启（uci kodi.main.enabled，init 脚本读取）
//  - 启动 / 停止 / 重启（rpc luci setInitAction）
//  - 三条远程通道端口一览（8080 Web / 9090 JSON-RPC / 9777 EventServer）
//  - 已挂载的 USB / 存储卡列表（/proc/mounts）
// 注：iStoreOS 的 LuCI 为 22.03 老版，无 ubus.js 客户端类，走 rpc.declare。
// 文案原则：面向小白，一句话说清，不堆术语。

var callSetInitAction = rpc.declare({
	object: 'luci',
	method: 'setInitAction',
	params: [ 'name', 'action' ]
});

// 22.03 的 luci.getInitList 不含 running 字段，运行状态走 service list
var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ]
});

var callUciSet = rpc.declare({
	object: 'uci',
	method: 'set',
	params: [ 'config', 'section', 'values' ]
});

var callUciCommit = rpc.declare({
	object: 'uci',
	method: 'commit',
	params: [ 'config' ]
});

var PAD_CSS = '.kodi-pad .cbi-section { padding: 16px 20px; } .kodi-pad .cbi-section h3 { margin: 0 0 12px; } .kodi-pad .cbi-section-descr { margin: 8px 0 0; line-height: 1.7; } .kodi-pad .cbi-value { padding: 4px 0; } .kodi-pad table { margin-top: 4px; }';

var CHANNELS = [
	{ name: '网页遥控', port: 8080, proto: 'HTTP',
	  desc: '用手机 / 电脑浏览器遥控 Kodi，本插件「Web 远程控制」页就是它' },
	{ name: '手机 App', port: 9090, proto: 'TCP',
	  desc: 'Yatse、Kore 等遥控 App 会自动识别并使用，不用设置' },
	{ name: '遥控按键', port: 9777, proto: 'UDP',
	  desc: '模拟遥控器按键，供老式遥控 App 或小工具使用' }
];

return view.extend({
	load: function() {
		// 每路独立兜底：任一数据源失败都不能把整页拖垮成「已停止」。
		// 实证踩坑（BG197 修复）：/etc/TZ 是指向 /tmp/TZ 的软链，而 OpenWrt
		// system init 在 zonename+zoneinfo 就绪时会删 /tmp/TZ 改用
		// /tmp/localtime——开机后该软链悬空，fs.read 拒绝；此前 Promise.all
		// 整体 catch 会把四路数据全部清空（kodi 运行中却显示已停止、存储表空）。
		return Promise.all([
			callServiceList('kodi').catch(function() { return null; }),
			uci.load('kodi').catch(function() { return null; }),
			fs.read('/proc/mounts').catch(function() { return ''; }),
			fs.read('/etc/TZ').catch(function() { return ''; })
		]);
	},

	parseMounts: function(text) {
		var mounts = [];
		if (!text)
			return mounts;
		text.split('\n').forEach(function(line) {
			var f = line.trim().split(/\s+/);
			if (f.length < 3)
				return;
			var dev = f[0], target = f[1], fstype = f[2], opts = f[3] || '';
			// 只展示可插拔存储（USB / SD / eMMC 上的数据分区），排除系统伪文件系统
			if (!/^\/dev\/(sd[a-z]|mmcblk[0-9]+p?[0-9]*|nvme[0-9]+n[0-9]+p?[0-9]*|vd[a-z])/.test(dev))
				return;
			if (target === '/overlay' || target === '/rom' || target === '/boot')
				return;
			mounts.push({
				dev: dev,
				target: target,
				fstype: fstype,
				rw: opts.indexOf(' rw,') >= 0 || opts.lastIndexOf('rw', 0) === 0
			});
		});
		return mounts;
	},

	waitForState: function(wantRunning, expectTransition, btn) {
		// 动作后轮询真实运行状态（setInitAction 的 restart 全程约 30 秒，
		// 不能依赖 rpc 调用同步返回）。restart 需先观察到停止再等运行，
		// 否则轮询起点仍是旧实例的 running 会导致过早刷新
		var waited = 0;
		var seenStopped = !expectTransition;
		var probe = function(data) {
			var svc = (data && data.kodi) || {};
			var instances = svc.instances || {};
			var running = false;
			Object.keys(instances).forEach(function(k) {
				if (instances[k] && instances[k].running)
					running = true;
			});
			if (!running)
				seenStopped = true;
			if ((running === wantRunning && seenStopped) || waited >= 90) {
				location.reload();
			} else {
				waited += 3;
				btn.textContent = wantRunning
					? '正在启动，请稍候…'
					: '正在停止，请稍候…';
				setTimeout(tick, 3000);
			}
		};
		var tick = function() {
			callServiceList('kodi').then(probe).catch(function() {
				waited += 3;
				if (waited >= 90)
					location.reload();
				else
					setTimeout(tick, 3000);
			});
		};
		setTimeout(tick, 2000);
	},

	doServiceAction: function(action, ev) {
		var btn = (ev && (ev.currentTarget || ev.target)) || this;
		btn.disabled = true;
		btn.textContent = action === 'restart' ? '正在重启（约需半分钟）…'
			: action === 'stop' ? '正在停止，请稍候…' : '正在启动，请稍候…';
		// fire-and-forget：rpc 调用在 restart 场景约 30 秒才返回（stop 等待
		// 优雅退出），等待它会顶到前端超时——发出后立即转状态轮询
		callSetInitAction('kodi', action).catch(function() {});
		this.waitForState(action !== 'stop', action === 'restart', btn);
	},

	toggleAutostart: function(ev) {
		var val = (this.checked) ? '1' : '0';
		// ubus uci set+commit 直写：不依赖 uci.apply 的 rollback/confirm 时序，
		// 也不触发服务 reload；kodi.main.enabled 仅在开机时由 init 脚本读取
		callUciSet('kodi', 'main', { enabled: val })
			.then(function() { return callUciCommit('kodi'); })
			.then(function() { location.reload(); })
			.catch(function() { location.reload(); });
	},

	render: function(data) {
		var svc = (data[0] && data[0].kodi) || {};
		var instances = svc.instances || {};
		var running = false;
		Object.keys(instances).forEach(function(k) {
			if (instances[k] && instances[k].running)
				running = true;
		});
		var mounts = this.parseMounts(data[2]);
		var tz = (data[3] || '').trim() || 'CST-8';
		var enabled = (uci.get('kodi', 'main', 'enabled') !== '0');
		var host = window.location.hostname;
		var nodes = [];

		nodes.push(E('h2', {}, 'Kodi 状态与控制'));

		// ---- 服务状态卡 ----
		nodes.push(E('div', { 'class': 'cbi-section' }, [
			E('div', { 'class': 'cbi-section-descr' }, [
				E('span', {
					'style': 'display:inline-block;padding:2px 10px;border-radius:10px;color:#fff;font-size:0.95em;margin-right:8px;' +
						'background:' + (running ? '#5cb85c' : '#f0ad4e')
				}, running ? '● 运行中' : '● 已停止'),
				E('span', { 'style': 'color:#666' }, 'Kodi 20.5 · 电视 HDMI 输出 · 4K 硬解码')
			]),
			E('div', { 'style': 'display:flex;gap:8px;flex-wrap:wrap;margin:12px 0' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply important',
					'disabled': running ? null : '',
					'click': this.doServiceAction.bind(this, 'restart')
				}, '重启 Kodi'),
				E('button', {
					'class': 'btn cbi-button cbi-button-neutral',
					'disabled': running ? null : '',
					'click': this.doServiceAction.bind(this, 'stop')
				}, '停止'),
				E('button', {
					'class': 'btn cbi-button cbi-button-positive',
					'disabled': running ? '' : null,
					'click': this.doServiceAction.bind(this, 'start')
				}, '启动'),
				E('a', {
					'class': 'btn cbi-button cbi-button-neutral',
					'href': L.url('admin/kodi/web')
				}, '打开 Web 远程控制')
			]),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, '开机自启动'),
				E('div', { 'class': 'cbi-value-field' }, [
					E('input', {
						'class': 'cbi-input-checkbox',
						'type': 'checkbox',
						'checked': enabled ? 'checked' : null,
						'change': this.toggleAutostart
					}),
					E('div', { 'class': 'cbi-value-description' },
						'关掉后开机不会自动启动，需要时在本页手动点「启动」')
				])
			])
		]));

		// ---- 远程通道卡 ----
		// 注意：iStoreOS 22.03 老版 dom E() 不展开嵌套数组，行必须逐个 push
		var chRows = [ E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th' }, '通道'),
			E('th', { 'class': 'th' }, '端口 / 协议'),
			E('th', { 'class': 'th' }, '密码'),
			E('th', { 'class': 'th' }, '给谁用')
		]) ];
		CHANNELS.forEach(function(c) {
			var isWeb = (c.port === 8080);
			var usage;
			if (isWeb) {
				usage = E('span', {}, [ c.desc, ' ',
					E('a', { 'href': 'http://%s:8080/'.format(host), 'target': '_blank' }, '直接访问') ]);
			} else {
				usage = c.desc;
			}
			chRows.push(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, c.name),
				E('td', { 'class': 'td' }, '%d / %s'.format(c.port, c.proto)),
				E('td', { 'class': 'td' }, '无需密码'),
				E('td', { 'class': 'td' }, usage)
			]));
		});
		nodes.push(E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, '远程控制通道（三端通道）'),
			E('table', { 'class': 'table' }, chRows),
			E('div', { 'class': 'cbi-section-descr' },
				'三种通道都只允许内网使用，外网已自动拦截，可放心使用。')
		]));

		// ---- 存储卡 ----
		var storeNodes = [ E('h3', {}, 'U 盘 / 存储卡') ];
		if (mounts.length) {
			var mRows = [ E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, '设备'),
				E('th', { 'class': 'th' }, '挂载点'),
				E('th', { 'class': 'th' }, '文件系统'),
				E('th', { 'class': 'th' }, '读写')
			]) ];
			mounts.forEach(function(m) {
				mRows.push(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, m.dev),
					E('td', { 'class': 'td' }, m.target),
					E('td', { 'class': 'td' }, m.fstype),
					E('td', { 'class': 'td' }, m.rw ? '可读写' : '只读')
				]));
			});
			storeNodes.push(E('table', { 'class': 'table' }, mRows));
		} else {
			storeNodes.push(E('em', {}, '当前没有插入 U 盘或存储卡'));
		}
		storeNodes.push(E('div', { 'class': 'cbi-section-descr' },
			'U 盘、SD 卡、移动硬盘插入即自动识别，在 Kodi 的「文件」里就能播放；鼠标、键盘也是即插即用。'));
		nodes.push(E('div', { 'class': 'cbi-section' }, storeNodes));

		// ---- 时区 ----
		nodes.push(E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, '时间与时区'),
			E('div', { 'style': 'line-height:1.8' },
				'系统与 Kodi 的时间均为北京时间。如果 Kodi 显示的时间差了 8 小时，重启一次 Kodi 即可。')
		]));

		nodes.unshift(E('style', { 'type': 'text/css' }, PAD_CSS));
		return E('div', { 'class': 'cbi-map kodi-pad' }, nodes);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
