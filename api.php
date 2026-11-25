<?php
session_start();
header("Content-Type: application/json; charset=utf-8");
require 'conexion.php';

$a = $_GET['a'] ?? '';
$d = json_decode(file_get_contents("php://input"), true) ?? [];
$cats = ['PlayStation', 'Xbox', 'Nintendo', 'Juegos', 'Accesorios'];

function out($x, $c = 200) { http_response_code($c); echo json_encode($x); exit; }
function uid() { return $_SESSION['u']['id'] ?? 0; }
function q($sql, $p = []) { global $pdo; $s = $pdo->prepare($sql); $s->execute($p); return $s; }
function need($roles = null) {
    if (!uid()) out(["error" => "Inicia sesión"], 401);
    if ($roles && !in_array($_SESSION['u']['rol'], $roles)) out(["error" => "Sin permiso"], 403);
}
function sesion($u) {
    session_regenerate_id(true);
    $_SESSION['u'] = ['id' => (int)$u['id'], 'nombre' => $u['nombre'], 'rol' => $u['rol']];
    out(["usuario" => $_SESSION['u']]);
}
function cuenta($d) {
    $n = trim($d['nombre'] ?? ''); $e = trim($d['email'] ?? ''); $p = $d['password'] ?? '';
    if ($n === '' || !filter_var($e, FILTER_VALIDATE_EMAIL) || strlen($p) < 6)
        out(["error" => "Revisa los datos (contraseña mínimo 6 caracteres)"], 400);
    if (q("SELECT id FROM usuarios WHERE email=?", [$e])->fetch())
        out(["error" => "Ese correo ya está registrado"], 400);
    return [$n, $e, password_hash($p, PASSWORD_DEFAULT)];
}

try {
    switch ($a) {
        case 'yo': out(["usuario" => $_SESSION['u'] ?? null]);

        case 'registro':
            [$n, $e, $h] = cuenta($d);
            q("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,'cliente')", [$n, $e, $h]);
            sesion(['id' => $pdo->lastInsertId(), 'nombre' => $n, 'rol' => 'cliente']);

        case 'login':
            $u = q("SELECT * FROM usuarios WHERE email=?", [trim($d['email'] ?? '')])->fetch(PDO::FETCH_ASSOC);
            if (!$u || !password_verify($d['password'] ?? '', $u['password']))
                out(["error" => "Correo o contraseña incorrectos"], 400);
            sesion($u);

        case 'logout': session_destroy(); out(["ok" => 1]);

        case 'productos':
            out(q("SELECT p.*, ROUND(p.precio*(1-p.descuento/100),2) AS precio_final,
                   (f.producto_id IS NOT NULL) AS fav
                   FROM productos p LEFT JOIN favoritos f ON f.producto_id=p.id AND f.usuario_id=?
                   ORDER BY p.id DESC", [uid()])->fetchAll(PDO::FETCH_ASSOC));

        case 'fav':
            need();
            if (!q("DELETE FROM favoritos WHERE usuario_id=? AND producto_id=?", [uid(), (int)$d['id']])->rowCount())
                q("INSERT INTO favoritos VALUES (?,?)", [uid(), (int)$d['id']]);
            out(["ok" => 1]);

        case 'carrito':
            need();
            out(q("SELECT p.id, p.nombre, ROUND(p.precio*(1-p.descuento/100),2) AS precio, c.cantidad
                   FROM carrito c JOIN productos p ON p.id=c.producto_id WHERE c.usuario_id=?", [uid()])->fetchAll(PDO::FETCH_ASSOC));

        case 'carrito_add':
            need();
            $s = (int)q("SELECT stock FROM productos WHERE id=?", [(int)$d['id']])->fetchColumn();
            if ($s < 1) out(["error" => "Producto agotado"], 400);
            q("INSERT INTO carrito VALUES (?,?,1) ON DUPLICATE KEY UPDATE cantidad=LEAST(cantidad+1, $s)", [uid(), (int)$d['id']]);
            out(["ok" => 1]);

        case 'carrito_del':
            need();
            q("DELETE FROM carrito WHERE usuario_id=? AND producto_id=?", [uid(), (int)$d['id']]);
            out(["ok" => 1]);

        case 'comprar':
            need();
            $pdo->beginTransaction();
            $it = q("SELECT p.id, p.nombre, p.stock, ROUND(p.precio*(1-p.descuento/100),2) AS precio, c.cantidad
                     FROM carrito c JOIN productos p ON p.id=c.producto_id WHERE c.usuario_id=? FOR UPDATE", [uid()])->fetchAll(PDO::FETCH_ASSOC);
            if (!$it) { $pdo->rollBack(); out(["error" => "Tu carrito está vacío"], 400); }
            $t = 0;
            foreach ($it as $i) {
                if ($i['cantidad'] > $i['stock']) { $pdo->rollBack(); out(["error" => "Sin stock suficiente de " . $i['nombre']], 400); }
                $t += $i['precio'] * $i['cantidad'];
            }
            q("INSERT INTO pedidos (usuario_id,total) VALUES (?,?)", [uid(), $t]);
            $pid = $pdo->lastInsertId();
            foreach ($it as $i) {
                q("INSERT INTO pedido_items (pedido_id,nombre,precio,cantidad) VALUES (?,?,?,?)", [$pid, $i['nombre'], $i['precio'], $i['cantidad']]);
                q("UPDATE productos SET stock=stock-? WHERE id=?", [$i['cantidad'], $i['id']]);
            }
            q("DELETE FROM carrito WHERE usuario_id=?", [uid()]);
            $pdo->commit();
            out(["ok" => 1]);

        case 'historial':
            need();
            $o = q("SELECT id, total, DATE_FORMAT(fecha,'%d/%m/%Y %H:%i') AS fecha FROM pedidos WHERE usuario_id=? ORDER BY id DESC", [uid()])->fetchAll(PDO::FETCH_ASSOC);
            foreach ($o as &$x) $x['items'] = q("SELECT nombre, precio, cantidad FROM pedido_items WHERE pedido_id=?", [$x['id']])->fetchAll(PDO::FETCH_ASSOC);
            out($o);

        // ---------- Administración ----------
        case 'prod_guardar':
            need(['admin', 'empleado']);
            if (trim($d['nombre'] ?? '') === '' || !in_array($d['categoria'] ?? '', $cats, true)
                || !is_numeric($d['precio'] ?? null) || $d['precio'] < 0
                || !is_numeric($d['stock'] ?? null) || $d['stock'] < 0
                || !is_numeric($d['descuento'] ?? 0) || $d['descuento'] < 0 || $d['descuento'] > 90)
                out(["error" => "Datos inválidos"], 400);
            $v = [trim($d['nombre']), $d['categoria'], $d['precio'], (int)($d['descuento'] ?? 0), $d['stock']];
            if (!empty($d['id'])) q("UPDATE productos SET nombre=?,categoria=?,precio=?,descuento=?,stock=? WHERE id=?", [...$v, (int)$d['id']]);
            else q("INSERT INTO productos (nombre,categoria,precio,descuento,stock) VALUES (?,?,?,?,?)", $v);
            out(["ok" => 1]);

        case 'prod_borrar':
            need(['admin', 'empleado']);
            q("DELETE FROM productos WHERE id=?", [(int)$d['id']]);
            out(["ok" => 1]);

        case 'emp_listar':
            need(['admin']);
            out(q("SELECT u.id, u.nombre, u.email, e.puesto, e.telefono FROM empleados e JOIN usuarios u ON u.id=e.usuario_id ORDER BY u.id DESC")->fetchAll(PDO::FETCH_ASSOC));

        case 'emp_guardar':
            need(['admin']);
            [$n, $e, $h] = cuenta($d);
            $pdo->beginTransaction();
            q("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,'empleado')", [$n, $e, $h]);
            q("INSERT INTO empleados (usuario_id,puesto,telefono) VALUES (?,?,?)", [$pdo->lastInsertId(), trim($d['puesto'] ?? ''), trim($d['telefono'] ?? '')]);
            $pdo->commit();
            out(["ok" => 1]);

        case 'emp_borrar':
            need(['admin']);
            q("DELETE FROM usuarios WHERE id=? AND rol='empleado'", [(int)$d['id']]);
            out(["ok" => 1]);

        default: out(["error" => "Acción no válida"], 404);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    out(["error" => "Error de base de datos"], 500);
}
