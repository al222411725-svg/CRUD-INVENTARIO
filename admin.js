const $ = i => document.getElementById(i);
const e = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const m = n => '$' + Number(n).toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2});
let U, P = [];

async function api(a, b) {
    const r = await fetch('api.php?a=' + a, b ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b)} : {});
    const j = await r.json().catch(() => ({error:'Respuesta inválida del servidor'}));
    if (!r.ok) { alert(j.error || 'Error'); throw j; }
    return j;
}

async function productos() {
    P = await api('productos');
    $('tp').innerHTML = P.map(p => `<tr><td>${p.id}</td><td>${e(p.nombre)}</td><td>${p.categoria}</td><td>${m(p.precio)}</td>
        <td>${p.descuento > 0 ? '<span class="badge bg-danger">-' + p.descuento + '%</span>' : '-'}</td><td>${p.stock}</td>
        <td><button class="btn btn-sm btn-warning" onclick="editar(${p.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="borrar(${p.id})">Eliminar</button></td></tr>`).join('');
}

function editar(id) {
    const p = P.find(x => +x.id === id);
    $('pid').value = p.id; $('pn').value = p.nombre; $('pc').value = p.categoria;
    $('pp').value = p.precio; $('pd').value = p.descuento; $('ps').value = p.stock;
    $('bp').textContent = 'Actualizar';
    window.scrollTo(0, 0);
}

async function borrar(id) {
    if (confirm('¿Eliminar este producto?')) { await api('prod_borrar', {id}); productos(); }
}

$('fp').addEventListener('submit', async ev => {
    ev.preventDefault();
    await api('prod_guardar', {id: $('pid').value, nombre: $('pn').value, categoria: $('pc').value,
        precio: $('pp').value, descuento: $('pd').value, stock: $('ps').value});
    $('fp').reset(); $('pid').value = ''; $('pd').value = 0; $('bp').textContent = 'Guardar';
    productos();
});

async function empleados() {
    const r = await api('emp_listar');
    $('te').innerHTML = r.map(x => `<tr><td>${x.id}</td><td>${e(x.nombre)}</td><td>${e(x.email)}</td><td>${e(x.puesto || '')}</td><td>${e(x.telefono || '')}</td>
        <td><button class="btn btn-sm btn-danger" onclick="quitarEmp(${x.id})">Eliminar</button></td></tr>`).join('')
        || '<tr><td colspan="6" class="text-muted text-center">Sin empleados registrados</td></tr>';
}

async function quitarEmp(id) {
    if (confirm('¿Eliminar este empleado?')) { await api('emp_borrar', {id}); empleados(); }
}

$('fe').addEventListener('submit', async ev => {
    ev.preventDefault();
    await api('emp_guardar', {nombre: $('en').value, email: $('ee').value, password: $('ec').value, puesto: $('eu').value, telefono: $('et').value});
    $('fe').reset(); empleados();
});

(async () => {
    U = (await api('yo')).usuario;
    if (!U || U.rol === 'cliente') return location.href = 'index.html';
    $('usr').textContent = U.nombre + ' (' + U.rol + ')';
    productos();
    if (U.rol === 'admin') { $('secEmp').classList.remove('d-none'); empleados(); }
})();
