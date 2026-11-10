'use strict';
'require view';
'require rpc';

// Kodi Web 远程（Chorus2, :8080）内嵌页。
// WebServer 已配置免密（guisettings webserverauthentication=false，密码为空），
// iframe 加载不会弹出认证框；Chorus2 自适应布局，内部自行滚动。
// Kodi 未运行时 8080 不存在，iframe 会显示浏览器错误页——先探测服务状态再渲染。

var PAD_CSS = '.kodi-pad .cbi-section { padding: 16px 20px; } .kodi-pad .cbi-section h3 { margin: 0 0 12px; } .kodi-pad .cbi-section-descr { margin: 8px 0 0; line-height: 1.7; } .kodi-pad .cbi-value { padding: 4px 0; } .kodi-pad table { margin-top: 4px; }';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ]
});

function kodiRunning(data) {
	var svc = (data && data.kodi) || {};
	var instances = svc.instances || {};
	var running = false;
	Object.keys(instances).forEach(function(k) {
		if (instances[k] && instances[k].running)
			running = true;
	});
	return running;
}

return view.extend({
	load: function() {
		return callServiceList('kodi').catch(function() { return null; });
	},

	render: function(data) {
		var url = 'http://' + window.location.hostname + ':8080/';
		var nodes = [];

		nodes.push(E('style', { 'type': 'text/css' }, PAD_CSS));
		if (!kodiRunning(data)) {
			// Kodi 未运行：8080 服务不存在，给出明确引导而非死 iframe
			nodes.push(E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, 'Kodi 没有在运行'),
				E('p', { 'style': 'line-height:1.8' }, [
					'网页遥控由 Kodi 提供，现在打不开。请先启动 Kodi，再回来刷新本页。'
				]),
				E('div', { 'style': 'display:flex;gap:8px;flex-wrap:wrap' }, [
					E('a', {
						'class': 'btn cbi-button cbi-button-apply important',
						'href': L.url('admin/kodi/status')
					}, '去启动 Kodi'),
					E('a', {
						'class': 'btn cbi-button cbi-button-neutral',
						'href': window.location.href
					}, '刷新重试')
				])
			]));
			return E('div', {}, nodes);
		}

		nodes.push(E('div', { 'class': 'kodi-pad', 'style': 'margin-bottom:8px' }, [
			E('span', {}, [
				'网页遥控，',
				E('b', {}, '无需密码'),
				'，这里的操作和电视画面实时同步。'
			])
		]));

		nodes.push(E('iframe', {
			'id': 'kodi-web-frame',
			'src': url,
			'style': 'width:100%;min-height:640px;height:calc(100dvh - 230px);border:1px solid #ccc;border-radius:3px;background:#000'
		}));

		return E('div', {}, nodes);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
