CREATE DATABASE IF NOT EXISTS inventario_consolas CHARACTER SET utf8mb4;
USE inventario_consolas;

SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS pedido_items, pedidos, carrito, favoritos, empleados, usuarios, productos;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('cliente','empleado','admin') NOT NULL DEFAULT 'cliente'
);

CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  categoria ENUM('PlayStation','Xbox','Nintendo','Juegos','Accesorios') NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descuento TINYINT NOT NULL DEFAULT 0,
  stock INT NOT NULL
);

CREATE TABLE empleados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  puesto VARCHAR(80),
  telefono VARCHAR(20),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE favoritos (
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  PRIMARY KEY (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE carrito (
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  PRIMARY KEY (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

INSERT INTO productos (nombre, categoria, precio, descuento, stock) VALUES
('PlayStation 5 Slim', 'PlayStation', 10999.00, 10, 8),
('Xbox Series X 1TB', 'Xbox', 11499.00, 0, 6),
('Nintendo Switch OLED', 'Nintendo', 7499.00, 15, 10),
('The Legend of Zelda: Tears of the Kingdom', 'Juegos', 1399.00, 0, 15),
('Control DualSense', 'Accesorios', 1599.00, 20, 20),
('Headset Xbox inalámbrico', 'Accesorios', 2299.00, 0, 7),
('God of War Ragnarök', 'Juegos', 1199.00, 25, 12),
('Control Pro Nintendo Switch', 'Accesorios', 1499.00, 0, 9);
