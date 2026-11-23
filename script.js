const STORE_KEY = 'wumo_price_state_v2';
const ADMIN_PASSWORD = 'zxssZXSS355';

const ITEM_DEFS = [
	{ id: 'mo60', series: '钼系列', name: '60钼铁', unit: '吨', base: 182500, round: 100, decimals: 0 },
	{ id: 'moWire', series: '钼系列', name: '废钼丝', unit: '公斤', base: 900, round: 5, decimals: 0 },
	{ id: 'moSheet', series: '钼系列', name: '废钼片', unit: '公斤', base: 880, round: 5, decimals: 0 },
	{ id: 'moEdge', series: '钼系列', name: '钼边角', unit: '公斤', base: 850, round: 5, decimals: 0 },
	{ id: 'moTip', series: '钼系列', name: '钼顶头', unit: '公斤', base: 920, round: 5, decimals: 0 },
	{ id: 'moWire018', series: '钼系列', name: '线切割钼丝0.18mm', unit: '米', base: 1.20, round: 0.01, decimals: 2 },
	{ id: 'wFe70', series: '钨系列', name: '70钨铁', unit: '吨', base: 140000, round: 100, decimals: 0 },
	{ id: 'wRod', series: '钨系列', name: '铣刀棒料', unit: '公斤', base: 260, round: 5, decimals: 0 },
	{ id: 'wImport', series: '钨系列', name: '进口数控', unit: '公斤', base: 320, round: 5, decimals: 0 },
	{ id: 'wBlade', series: '钨系列', name: '国产刀片', unit: '公斤', base: 180, round: 5, decimals: 0 },
	{ id: 'vFePan', series: '钒系列', name: '50钒铁攀枝花', unit: '吨', base: 110000, round: 100, decimals: 0 },
	{ id: 'vFeNe', series: '钒系列', name: '50钒铁东北', unit: '吨', base: 108000, round: 100, decimals: 0 }
];

function offsetDate(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function fmt(d) {
	const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
	return y + '-' + m + '-' + day;
}
function roundTo(v, r) { return Math.round(v / r) * r; }

function seedHistory(def) {
	const arr = []; let mid = def.base;
	for (let i = 6; i >= 0; i--) {
		mid = mid * (1 + (Math.random() - 0.5) * 0.02);
		const low = roundTo(mid * (1 - 0.01), def.round);
		const high = roundTo(mid * (1 + 0.01), def.round);
		arr.push({ date: fmt(offsetDate(i)), low: low, high: high });
	}
	return arr;
}

function defaultState() {
	const items = {};
	ITEM_DEFS.forEach(def => { items[def.id] = Object.assign({}, def, { history: seedHistory(def) }); });
	return {
		announcement: '今日钼、钨、钒系列行情整体平稳，报价仅供参考，具体成交以实时询盘为准。',
		items: items,
		views: null
	};
}

function loadState() {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		if (raw) { const s = JSON.parse(raw); if (s && s.items) return s; }
	} catch (e) { }
	return defaultState();
}

let state = loadState();
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { } }

/* ================= 浏览量模拟 ================= */
function initViews() {
	const today = fmt(new Date());
	if (!state.views || state.views.date !== today) {
		state.views = { date: today, base: 4800 + Math.floor(Math.random() * 7201), extra: 0 };
	}
	state.views.extra += 1;
	persist();
}

/* ================= 价格计算与格式化 ================= */
function mid(r) { return (r.low + r.high) / 2; }

function diffOf(arr) {
	if (arr.length === 0) return null;
	const cur = arr[arr.length - 1];
	const prev = arr.length > 1 ? arr[arr.length - 2] : null;
	if (!prev) return { dir: 'flat', delta: 0, pct: 0 };
	const c = mid(cur), p = mid(prev);
	const delta = c - p, pct = p !== 0 ? delta / p * 100 : 0;
	const dir = delta > 0.001 ? 'up' : (delta < -0.001 ? 'down' : 'flat');
	return { dir: dir, delta: delta, pct: pct };
}

function fmtPrice(def, v) {
	if (def.decimals === 2) return v.toFixed(2);
	return Math.round(v).toLocaleString('zh-CN');
}

function diffText(def, d) {
	if (!d || d.dir === 'flat') return '<span class="diff-flat">— 持平</span>';
	const arrow = d.dir === 'up' ? '▲' : '▼';
	const cls = d.dir === 'up' ? 'diff-up' : 'diff-down';
	const sign = d.dir === 'up' ? '+' : '';
	const deltaStr = def.decimals === 2 ? Math.abs(d.delta).toFixed(2) : Math.abs(Math.round(d.delta)).toLocaleString('zh-CN');
	return '<span class="' + cls + '">' + arrow + ' ' + sign + deltaStr + ' 元 (' + sign + d.pct.toFixed(2) + '%)</span>';
}

/* ================= 页面渲染 ================= */
function renderHeader() {
	document.getElementById('todayDate').textContent = fmt(new Date());
	document.getElementById('viewCount').textContent = (state.views.base + state.views.extra).toLocaleString('zh-CN');
}

function renderAnnounce() {
	const track = document.getElementById('marqueeTrack');
	const text = state.announcement || '暂无公告。';
	track.innerHTML = '<span>实时公告：' + text + '</span><span>实时公告：' + text + '</span>';
}

function buildCard(def, last, d) {
	const card = document.createElement('article');
	card.className = 'card';
	card.innerHTML =
		'<div class="card-head"><span class="card-name">' + def.name + '</span>' +
		'<span class="card-unit">元/' + def.unit + '</span></div>' +
		'<div class="card-price num">' + fmtPrice(def, last.low) + '<span class="sep">~</span>' + fmtPrice(def, last.high) + '</div>' +
		'<div class="card-diff">' + diffText(def, d) + '<span class="diff-note">较昨日</span></div>';
	return card;
}

let openSeries = '钼系列';

function renderBoard() {
	const wrap = document.getElementById('priceBoard');
	wrap.innerHTML = '';
	const groups = {};
	ITEM_DEFS.forEach(def => { (groups[def.series] = groups[def.series] || []).push(def); });
	const chevron = '<svg class="series-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
	Object.keys(groups).forEach(series => {
		const sec = document.createElement('section');
		sec.className = 'series' + (series === openSeries ? ' open' : '');
		sec.innerHTML = '<button class="series-head"><span class="series-title">' + series + '</span>' + chevron + '</button><div class="series-body"><div class="card-grid"></div></div>';
		const head = sec.querySelector('.series-head');
		head.addEventListener('click', () => {
			if (openSeries === series) {
				sec.classList.toggle('open');
				if (!sec.classList.contains('open')) openSeries = null;
			} else {
				openSeries = series;
				wrap.querySelectorAll('.series').forEach(s => s.classList.remove('open'));
				sec.classList.add('open');
			}
		});
		const grid = sec.querySelector('.card-grid');
		groups[series].forEach(def => {
			const item = state.items[def.id];
			const last = item.history[item.history.length - 1];
			grid.appendChild(buildCard(def, last, diffOf(item.history)));
		});
		wrap.appendChild(sec);
	});
}

/* ----- 历史 ----- */
let activeHist = ITEM_DEFS[0].id;

function renderHistTabs() {
	const box = document.getElementById('histTabs');
	box.innerHTML = '';
	ITEM_DEFS.forEach(def => {
		const b = document.createElement('button');
		b.className = 'hist-tab' + (def.id === activeHist ? ' active' : '');
		b.textContent = def.name;
		b.addEventListener('click', () => { activeHist = def.id; renderHistTabs(); renderHistory(); });
		box.appendChild(b);
	});
}

function renderHistory() {
	const def = ITEM_DEFS.find(d => d.id === activeHist) || ITEM_DEFS[0];
	const arr = state.items[def.id].history.slice().reverse();
	const body = document.getElementById('histBody');
	body.innerHTML = '';
	arr.forEach((row, idx) => {
		const older = arr[idx + 1] || null;
		let dir = 'flat', delta = 0, pct = 0;
		if (older) {
			const c = mid(row), p = mid(older);
			delta = c - p; pct = p !== 0 ? delta / p * 100 : 0;
			dir = delta > 0.001 ? 'up' : (delta < -0.001 ? 'down' : 'flat');
		}
		const d = { dir: dir, delta: delta, pct: pct };
		const tr = document.createElement('tr');
		tr.innerHTML =
			'<td class="num">' + row.date + '</td>' +
			'<td class="num">' + fmtPrice(def, row.low) + '</td>' +
			'<td class="num">' + fmtPrice(def, row.high) + '</td>' +
			'<td>' + diffText(def, d) + '</td>';
		body.appendChild(tr);
	});
}

function renderAll() {
	renderHeader(); renderAnnounce(); renderBoard(); renderHistTabs(); renderHistory();
}

/* ================= 后台 ================= */
function openAdmin() {
	document.getElementById('annInput').value = state.announcement;
	const grid = document.getElementById('priceGrid');
	grid.innerHTML = '';
	ITEM_DEFS.forEach(def => {
		const item = state.items[def.id];
		const last = item.history[item.history.length - 1];
		const step = def.decimals === 2 ? '0.01' : '1';
		const box = document.createElement('div');
		box.className = 'price-item';
		box.innerHTML =
			'<div class="pi-name">' + def.name + ' <span class="pi-unit">（元/' + def.unit + '）</span></div>' +
			'<div class="pi-inputs">' +
			'<label>低价<input type="number" step="' + step + '" data-id="' + def.id + '" data-field="low" value="' + last.low + '"></label>' +
			'<label>高价<input type="number" step="' + step + '" data-id="' + def.id + '" data-field="high" value="' + last.high + '"></label>' +
			'</div>';
		grid.appendChild(box);
	});
	document.getElementById('adminPanel').classList.remove('hidden');
}

function closeAdmin() { document.getElementById('adminPanel').classList.add('hidden'); }

function saveAdmin() {
	const ann = document.getElementById('annInput').value.trim();
	state.announcement = ann || '暂无公告。';
	const today = fmt(new Date());
	let ok = true;
	ITEM_DEFS.forEach(def => {
		const lowEl = document.querySelector('[data-id="' + def.id + '"][data-field="low"]');
		const highEl = document.querySelector('[data-id="' + def.id + '"][data-field="high"]');
		let low = parseFloat(lowEl.value), high = parseFloat(highEl.value);
		if (isNaN(low) || isNaN(high)) { ok = false; return; }
		if (high < low) { const t = low; low = high; high = t; }
		const arr = state.items[def.id].history;
		if (arr.length && arr[arr.length - 1].date === today) {
			arr[arr.length - 1] = { date: today, low: low, high: high };
		} else {
			arr.push({ date: today, low: low, high: high });
		}
		while (arr.length > 7) arr.shift();
	});
	if (!ok) { showToast('部分价格未填写完整，已保留原报价'); return; }
	persist(); renderAll(); closeAdmin();
	showToast('今日报价已更新');
}

/* ================= 登录与隐秘入口 ================= */
function openLoginModal() {
	document.getElementById('loginErr').textContent = '';
	document.getElementById('pwdInput').value = '';
	document.getElementById('loginModal').classList.remove('hidden');
	setTimeout(() => document.getElementById('pwdInput').focus(), 50);
}

function closeLoginModal() {
	document.getElementById('loginModal').classList.add('hidden');
}

let clickCount = 0, clickTimer = null;

document.getElementById('secretDot').addEventListener('click', () => {
	clickCount++;
	clearTimeout(clickTimer);
	clickTimer = setTimeout(() => { clickCount = 0; }, 1500);
	if (clickCount >= 3) {
		clickCount = 0;
		openLoginModal();
	}
});

document.getElementById('adminLoginBtn').addEventListener('click', openLoginModal);
document.getElementById('cancelLogin').addEventListener('click', closeLoginModal);

document.getElementById('confirmLogin').addEventListener('click', () => {
	const v = document.getElementById('pwdInput').value;
	if (v === ADMIN_PASSWORD) {
		closeLoginModal();
		openAdmin();
	} else {
		document.getElementById('loginErr').textContent = '密码不正确，请重试';
		document.getElementById('pwdInput').value = '';
		document.getElementById('pwdInput').focus();
	}
});

document.getElementById('pwdInput').addEventListener('keydown', e => {
	if (e.key === 'Enter') document.getElementById('confirmLogin').click();
});

document.getElementById('exitAdmin').addEventListener('click', closeAdmin);
document.getElementById('saveAdmin').addEventListener('click', saveAdmin);

/* ================= Toast ================= */
let toastTimer = null;
function showToast(msg) {
	const t = document.getElementById('toast');
	t.textContent = msg; t.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= 启动 ================= */
initViews();
renderAll();