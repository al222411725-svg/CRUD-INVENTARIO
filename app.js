const $ = i => document.getElementById(i);
const COL = {PlayStation:'primary', Xbox:'success', Nintendo:'danger', Juegos:'warning text-dark', Accesorios:'secondary'};
const ICO = {PlayStation:'bi-playstation', Xbox:'bi-xbox', Nintendo:'bi-nintendo-switch', Juegos:'bi-disc', Accesorios:'bi-headset'};
let U = null, P = [], C = [], vista = 'tienda', modo = 'login';

const e = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const m = n => '$' + Number(n).toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2});

async function api(a, b) {
    const r = await fetch('api.php?a=' + a, b ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b)} : {});
    const j = await r.json().catch(() => ({error:'Respuesta inválida del servidor'}));
    if (!r.ok) {
        if (r.status === 401) abrirLogin();
        else if (a !== 'login' && a !== 'registro') alert(j.error || 'Error');
        throw j;
    }
    return j;
}

function nav() {
    const n = C.reduce((s, x) => s + Number(x.cantidad), 0);
    const b = (v, t, i) => `<button class="btn btn-sm ${vista === v ? 'btn-light' : 'btn-outline-light'}" onclick="ir('${v}')"><i class="bi ${i}"></i> ${t}</button>`;
    $('menu').innerHTML = b('tienda','Tienda','bi-shop') + b('ofertas','Ofertas','bi-tag') + b('favoritos','Favoritos','bi-heart')
        + b('carrito', 'Carrito' + (n ? ` <span class="badge bg-danger">${n}</span>` : ''), 'bi-cart') + b('historial','Historial','bi-clock-history');
    $('usuario').innerHTML = U
        ? `<span class="text-white small">${e(U.nombre)} (${U.rol})</span>`
          + (U.rol !== 'cliente' ? '<a class="btn btn-sm btn-warning" href="admin.html">Panel</a>' : '')
          + '<button class="btn btn-sm btn-outline-light" onclick="salir()">Salir</button>'
        : '<button class="btn btn-sm btn-primary" onclick="abrirLogin()">Iniciar sesión</button>';
}

async function ir(v) {
    if (['favoritos','carrito','historial'].includes(v) && !U) return abrirLogin();
    vista = v;
    if (U) C = await api('carrito');
    const h = v === 'historial' ? await api('historial') : null;
    P = await api('productos');
    nav();
    pintar(h);
}

function pintar(h) {
    const v = $('vista');
    if (vista === 'carrito') return v.innerHTML = vCarrito();
    if (vista === 'historial') return v.innerHTML = vHistorial(h);
    const t = {tienda:'Catálogo', ofertas:'Ofertas', favoritos:'Mis favoritos'}[vista];
    v.innerHTML = `<div class="row g-2 mb-3 align-items-center"><div class="col"><h4 class="m-0">${t}</h4></div>
        <div class="col-md-3"><input id="buscar" class="form-control" placeholder="Buscar producto..." oninput="lista()"></div>
        <div class="col-md-3"><select id="filtro" class="form-select" onchange="lista()"><option value="">Todas las categorías</option>
        ${Object.keys(COL).map(c => `<option>${c}</option>`).join('')}</select></div></div><div class="row g-3" id="grid"></div>`;
    lista();
}

function lista() {
    const q = ($('buscar')?.value || '').toLowerCase(), f = $('filtro')?.value || '';
    const r = P.filter(p => (vista !== 'ofertas' || p.descuento > 0) && (vista !== 'favoritos' || +p.fav)
        && (!f || p.categoria === f) && p.nombre.toLowerCase().includes(q));
    $('grid').innerHTML = r.length ? r.map(tarjeta).join('') : '<p class="text-muted">No hay productos para mostrar.</p>';
}

const tarjeta = p => `<div class="col-6 col-md-4 col-lg-3"><div class="card h-100 shadow-sm"><div class="card-body d-flex flex-column">
    <div class="d-flex justify-content-between align-items-center">
        <span class="badge bg-${COL[p.categoria]}"><i class="bi ${ICO[p.categoria]}"></i> ${p.categoria}</span>
        <i class="bi ${+p.fav ? 'bi-heart-fill text-danger' : 'bi-heart'} fav" onclick="fav(${p.id})"></i>
    </div>
    <h6 class="mt-3">${e(p.nombre)}</h6>
    <div class="mt-auto">
        ${p.descuento > 0
            ? `<span class="badge bg-danger">-${p.descuento}%</span> <s class="text-muted small">${m(p.precio)}</s><div class="fs-5 fw-bold">${m(p.precio_final)}</div>`
            : `<div class="fs-5 fw-bold">${m(p.precio)}</div>`}
        <div class="small ${p.stock > 0 ? 'text-muted' : 'text-danger'} mb-2">${p.stock > 0 ? p.stock + ' disponibles' : 'Agotado'}</div>
        <button class="btn btn-primary btn-sm w-100" ${p.stock > 0 ? '' : 'disabled'} onclick="agregar(${p.id})"><i class="bi bi-cart-plus"></i> Agregar</button>
    </div></div></div></div>`;

async function fav(id) {
    if (!U) return abrirLogin();
    await api('fav', {id});
    P = await api('productos');
    vista === 'favoritos' ? lista() : lista();
}

async function agregar(id) {
    if (!U) return abrirLogin();
    await api('carrito_add', {id});
    C = await api('carrito');
    nav();
}

function vCarrito() {
    if (!C.length) return '<h4>Carrito</h4><p class="text-muted">Tu carrito está vacío.</p>';
    const t = C.reduce((s, x) => s + x.precio * x.cantidad, 0);
    return `<h4>Carrito</h4><div class="card shadow-sm"><ul class="list-group list-group-flush">
        ${C.map(x => `<li class="list-group-item d-flex justify-content-between align-items-center">
            <span>${e(x.nombre)} <span class="text-muted">x${x.cantidad}</span></span>
            <span>${m(x.precio * x.cantidad)} <button class="btn btn-sm btn-outline-danger ms-2" onclick="quitar(${x.id})"><i class="bi bi-trash"></i></button></span></li>`).join('')}</ul>
        <div class="card-body d-flex justify-content-between align-items-center"><span class="fs-5 fw-bold">Total: ${m(t)}</span>
        <button class="btn btn-success" onclick="comprar()">Comprar</button></div></div>`;
}

async function quitar(id) {
    await api('carrito_del', {id});
    C = await api('carrito');
    nav();
    $('vista').innerHTML = vCarrito();
}

async function comprar() {
    await api('comprar', {});
    alert('¡Compra realizada!');
    ir('historial');
}

function vHistorial(h) {
    if (!h.length) return '<h4>Historial</h4><p class="text-muted">Aún no tienes compras.</p>';
    return '<h4>Historial de compras</h4>' + h.map(o => `<div class="card shadow-sm mb-3">
        <div class="card-header d-flex justify-content-between"><span>Pedido #${o.id} · ${o.fecha}</span><strong>${m(o.total)}</strong></div>
        <ul class="list-group list-group-flush">${o.items.map(i => `<li class="list-group-item d-flex justify-content-between">
        <span>${e(i.nombre)} x${i.cantidad}</span><span>${m(i.precio * i.cantidad)}</span></li>`).join('')}</ul></div>`).join('');
}

// ---------- Sesión ----------
function modoUI() {
    const l = modo === 'login';
    $('gNombre').classList.toggle('d-none', l);
    $('tLogin').textContent = l ? 'Iniciar sesión' : 'Crear cuenta';
    $('btnAuth').textContent = l ? 'Entrar' : 'Registrarme';
    $('alt').textContent = l ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
    $('err').textContent = '';
}
function alternar() { modo = modo === 'login' ? 'registro' : 'login'; modoUI(); }
function abrirLogin() { modo = 'login'; modoUI(); bootstrap.Modal.getOrCreateInstance($('mLogin')).show(); }

$('fAuth').addEventListener('submit', async ev => {
    ev.preventDefault();
    try {
        const r = await api(modo, {nombre: $('nombre').value, email: $('email').value, password: $('password').value});
        U = r.usuario;
        bootstrap.Modal.getInstance($('mLogin')).hide();
        $('fAuth').reset();
        ir(vista);
    } catch (x) { $('err').textContent = x.error || 'Error'; }
});

async function salir() { await api('logout', {}); U = null; C = []; ir('tienda'); }

(async () => { U = (await api('yo')).usuario; ir('tienda'); })();
