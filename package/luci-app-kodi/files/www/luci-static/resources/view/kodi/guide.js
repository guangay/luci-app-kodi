'use strict';
'require view';

// Kodi 使用说明页（纯静态内容，数据驱动渲染）
// 文案原则：小白友好——短句、少术语、先说怎么做。

var PAD_CSS = '.kodi-pad .cbi-section { padding: 16px 20px; } .kodi-pad .cbi-section h3 { margin: 0 0 12px; } .kodi-pad .cbi-section-descr { margin: 8px 0 0; line-height: 1.7; } .kodi-pad .cbi-value { padding: 4px 0; } .kodi-pad table { margin-top: 4px; }';

var SECTIONS = [
	{
		title: '一、Kodi 是什么',
		html: [
			'电视用 HDMI 线连到本机，就能用 Kodi 看电影、听音乐、看图片，界面是中文的，4K 高清视频也不卡。',
			'控制 Kodi 有四种方式：电视前插<b>鼠标键盘</b>、用浏览器打开<b>网页遥控</b>、手机装<b>遥控 App</b>、' +
			'少数老工具用的<b>遥控按键</b>通道。后三种就是「三端通道」，区别见下表。'
		]
	},
	{
		title: '二、三种远程通道的区别（8080 / 9090 / 9777）',
		table: {
			titles: ['通道', '端口', '给谁用', '特点'],
			rows: [
				['网页遥控', '8080', '人（浏览器）',
				 '有完整界面，能遥控、选片、调字幕，无需密码'],
				['手机 App', '9090', 'Yatse / Kore 等 App',
				 'App 填上本机 IP 就能连，无需密码'],
				['遥控按键', '9777', '老式遥控 App / 小工具',
				 '只能发按键（上下左右、音量），无需密码']
			]
		},
		html: [
			'<b>怎么选：</b>日常用网页遥控或手机 App 就够了，剩下的交给自动识别。',
			'这些端口<b>外网已自动拦截</b>，只有内网能连，可放心使用。注意其中 9090 有关机权限，' +
			'不要在防火墙里把它开放到外网。想给 8080 加密码：电视上进 Kodi 设置 → 服务 → 控制，' +
			'设置用户名密码并打开「要求身份验证」。'
		]
	},
	{
		title: '三、电视前的操作（鼠标 / 键盘）',
		html: [
			'<b>鼠标、键盘插上就能用</b>，不用任何设置：鼠标直接点，键盘方向键移动、回车确认、Esc 返回。' +
			'常见的无线键鼠接收器也可以。'
		]
	},
	{
		title: '四、网页遥控（推荐）',
		html: [
			'打开本插件的「<b>Web 远程控制</b>」页（或浏览器访问 <code>http://本机IP:8080/</code>），<b>不用输密码</b>。' +
			'第一次是英文，切成中文：<code>settings → Web interface → Language → Chinese, Simplified</code>，点 Save 即可' +
			'（少数词条会保留英文；每个浏览器设一次）。',
			'能做什么：当遥控器用 · 浏览和点播影片 · 拖进度条 · 切字幕音轨 · 调音量。' +
			'电视画面和网页实时同步，谁操作都一样。'
		]
	},
	{
		title: '五、手机 App 遥控',
		html: [
			'安卓推荐 <b>Yatse</b> 或官方 <b>Kore</b>，苹果应用商店搜 Kodi 遥控任选一个。',
			'连接方法：App 里添加主机，地址填本机 IP（就是路由器管理地址），其它默认，用户名密码留空。'
		]
	},
	{
		title: '六、U 盘 / 存储卡 / 移动硬盘',
		html: [
			'<b>插上就能用</b>，不用任何设置。插好后在本插件「状态与控制」页能看到设备列表。',
			'播放方法：电视上打开 Kodi → 视频 → 文件 → 外部存储，选片子直接播。' +
			'常见格式（MKV、MP4、4K 高清、MP3、JPG 等）都支持，NTFS / exFAT / FAT32 / ext4 分区也都能读。',
			'内置的媒体分区同样在「文件」里，可以把常看的片子放在里面。'
		]
	},
	{
		title: '七、时间显示',
		html: [
			'系统和 Kodi 都已设为北京时间。如果 Kodi 显示的时间差了 8 小时，重启一次 Kodi 就好。'
		]
	},
	{
		title: '八、播放卡不卡？',
		html: [
			'4K 高清视频走硬件解码，长时间播放也很流畅，外挂字幕、切换音轨都正常。',
			'个别片子花屏或没声音，多半是片源本身的问题，换一个片源试试。'
		]
	},
	{
		title: '九、常见问题',
		html: [
			'<b>电视黑屏？</b> ①检查 HDMI 线和电视信号源；②到「状态与控制」页看 Kodi 是否在运行，没运行就点「启动」。',
			'<b>网页遥控打不开？</b> Kodi 没在运行时网页遥控不存在，先去「状态与控制」页启动。',
			'<b>Kodi 反复重启？</b> 崩溃后会自动恢复（最多 5 次）；还不行就在「状态与控制」页手动重启一次。',
			'<b>字幕乱码？</b> 字幕文件用 UTF-8 或 GBK 编码一般都正常；个别乱码就在 Kodi 字幕设置里换编码。',
			'<b>想用命令行？</b> SSH 登录后执行 /etc/init.d/kodi start|stop|restart。',
			'<b>不支持 AirPlay 投屏。</b> 此平台的 AirPlay 组件存在兼容性问题（开启会导致 Kodi 崩溃），已永久禁用。手机投屏请用网页遥控或 DLNA/UPnP。'
		]
	},
	{
		title: '十、本插件三个页面',
		html: [
			'· <b>状态与控制</b>：看运行状态，启动 / 停止 / 重启，开机自启开关，端口和 U 盘列表；',
			'· <b>Web 远程控制</b>：内嵌的网页遥控；',
			'· <b>使用说明</b>：本页。'
		]
	}
];

return view.extend({
	render: function() {
		var nodes = [ E('h2', {}, 'Kodi 使用说明') ];
		SECTIONS.forEach(function(sec) {
			var secNodes = [ E('h3', {}, sec.title) ];
			if (sec.table) {
				// 22.03 老版 dom E() 不展开嵌套数组：行必须逐个 push 进单层数组，
				// 否则 rows.map 的结果会被当成一个整体文本化成 [object HTMLTableRowElement]
				var tRows = [ E('tr', { 'class': 'tr table-titles' },
					sec.table.titles.map(function(t) { return E('th', { 'class': 'th' }, t); })) ];
				sec.table.rows.forEach(function(row) {
					tRows.push(E('tr', { 'class': 'tr' },
						row.map(function(c) { return E('td', { 'class': 'td', 'style': 'font-size:0.9em' }, c); })));
				});
				secNodes.push(E('table', { 'class': 'table' }, tRows));
			}
			(sec.html || []).forEach(function(p) {
				// 内容为固件内置静态文本（含 <b>/<code> 标记），E() 只写 textContent，改走 innerHTML
				var el = E('p', { 'style': 'margin:0.6em 0;line-height:1.7' });
				el.innerHTML = p;
				secNodes.push(el);
			});
			nodes.push(E('div', { 'class': 'cbi-section' }, secNodes));
		});
		nodes.unshift(E('style', { 'type': 'text/css' }, PAD_CSS));
		return E('div', { 'class': 'cbi-map kodi-pad' }, nodes);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
