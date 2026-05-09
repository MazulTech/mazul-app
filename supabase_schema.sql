-- ============================================================
-- MAZUL APP — Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('dueno', 'encargado', 'mesero');

-- Perfiles (extiende auth.users de Supabase)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  rol         user_role NOT NULL DEFAULT 'mesero',
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MENÚ
-- ─────────────────────────────────────────

CREATE TYPE categoria_menu AS ENUM (
  'platos_fuertes', 'antojitos', 'bebidas', 'postres', 'extras'
);

CREATE TABLE platillos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  categoria    categoria_menu NOT NULL,
  precio_venta NUMERIC(10,2) NOT NULL,
  activo       BOOLEAN DEFAULT TRUE,
  emoji        TEXT DEFAULT '🍽️',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insumos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    TEXT NOT NULL UNIQUE,
  unidad    TEXT NOT NULL,        -- kg, litro, pieza, etc.
  precio_unitario NUMERIC(10,4) NOT NULL DEFAULT 0,
  stock_actual    NUMERIC(10,3) DEFAULT 0,
  stock_minimo    NUMERIC(10,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recetas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platillo_id UUID NOT NULL REFERENCES platillos(id) ON DELETE CASCADE,
  insumo_id   UUID NOT NULL REFERENCES insumos(id),
  cantidad    NUMERIC(10,4) NOT NULL,   -- en unidad del insumo
  UNIQUE(platillo_id, insumo_id)
);

-- Vista: costo calculado por platillo
CREATE VIEW platillos_con_costo AS
SELECT
  p.*,
  COALESCE(SUM(r.cantidad * i.precio_unitario), 0) AS costo_calculado,
  CASE WHEN p.precio_venta > 0
    THEN ROUND((1 - COALESCE(SUM(r.cantidad * i.precio_unitario), 0) / p.precio_venta) * 100, 1)
    ELSE 0
  END AS margen_pct
FROM platillos p
LEFT JOIN recetas r ON r.platillo_id = p.id
LEFT JOIN insumos i ON i.id = r.insumo_id
GROUP BY p.id;

-- ─────────────────────────────────────────
-- CUENTAS (villas / externos)
-- ─────────────────────────────────────────

CREATE TYPE tipo_cuenta AS ENUM ('villa', 'externo');
CREATE TYPE estado_cuenta AS ENUM ('abierta', 'cerrada');
CREATE TYPE forma_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'a_la_villa');

CREATE TABLE cuentas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         tipo_cuenta NOT NULL,
  nombre       TEXT NOT NULL,        -- "Villa 7 – Familia Torres" o nombre externo
  estado       estado_cuenta DEFAULT 'abierta',
  abierta_por  UUID REFERENCES profiles(id),
  cerrada_por  UUID REFERENCES profiles(id),
  forma_pago   forma_pago,
  total_cobrado NUMERIC(10,2),
  nota_cierre  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  closed_at    TIMESTAMPTZ
);

CREATE TABLE cargos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id    UUID NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  platillo_id  UUID NOT NULL REFERENCES platillos(id),
  cantidad     INTEGER NOT NULL DEFAULT 1,
  precio_unit  NUMERIC(10,2) NOT NULL,  -- snapshot del precio al momento del cargo
  subtotal     NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED,
  nota         TEXT,
  registrado_por UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Vista: cuentas con total acumulado
CREATE VIEW cuentas_activas AS
SELECT
  c.*,
  COALESCE(SUM(ca.subtotal), 0) AS total_acumulado,
  COUNT(ca.id) AS num_cargos,
  EXTRACT(DAY FROM NOW() - c.created_at)::INT AS dias_abierta
FROM cuentas c
LEFT JOIN cargos ca ON ca.cuenta_id = c.id
WHERE c.estado = 'abierta'
GROUP BY c.id;

-- ─────────────────────────────────────────
-- INVENTARIO Y COMPRAS
-- ─────────────────────────────────────────

CREATE TABLE compras (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id   UUID NOT NULL REFERENCES insumos(id),
  cantidad    NUMERIC(10,3) NOT NULL,
  precio_total NUMERIC(10,2),
  proveedor   TEXT,
  registrado_por UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: actualizar stock al registrar compra
CREATE OR REPLACE FUNCTION actualizar_stock_compra()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE insumos
  SET stock_actual = stock_actual + NEW.cantidad,
      updated_at = NOW()
  WHERE id = NEW.insumo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compra_stock
AFTER INSERT ON compras
FOR EACH ROW EXECUTE FUNCTION actualizar_stock_compra();

-- Trigger: descontar stock al registrar cargo
CREATE OR REPLACE FUNCTION descontar_stock_cargo()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE insumos i
  SET stock_actual = stock_actual - (r.cantidad * NEW.cantidad),
      updated_at = NOW()
  FROM recetas r
  WHERE r.platillo_id = NEW.platillo_id
    AND r.insumo_id = i.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cargo_stock
AFTER INSERT ON cargos
FOR EACH ROW EXECUTE FUNCTION descontar_stock_cargo();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE platillos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras    ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer todo
CREATE POLICY "autenticados leen todo" ON profiles   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados leen todo" ON platillos  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados leen todo" ON insumos    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados leen todo" ON recetas    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados leen todo" ON cuentas    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados leen todo" ON cargos     FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados leen todo" ON compras    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Escritura: cualquier autenticado puede insertar / actualizar
CREATE POLICY "autenticados escriben" ON cuentas  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados escriben" ON cargos   FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "autenticados escriben" ON compras  FOR ALL USING (auth.uid() IS NOT NULL);

-- Solo dueño puede modificar menú e insumos (verificar rol en profiles)
CREATE POLICY "dueno modifica platillos" ON platillos FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'dueno'));
CREATE POLICY "dueno modifica insumos" ON insumos FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'dueno'));
CREATE POLICY "dueno modifica recetas" ON recetas FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'dueno'));

-- ─────────────────────────────────────────
-- DATOS DE PRUEBA (menú oaxaqueño base)
-- ─────────────────────────────────────────

INSERT INTO platillos (nombre, descripcion, categoria, precio_venta, emoji) VALUES
('Tlayuda oaxaqueña',        'Tortilla grande con asiento, frijoles, quesillo y tasajo',       'platos_fuertes', 145, '🫓'),
('Mole negro con pollo',     'Mole negro tradicional con chocolate oaxaqueño',                 'platos_fuertes', 180, '🍲'),
('Tasajo con tortillas',     'Carne de res salada asada al comal con chapulines',              'platos_fuertes', 210, '🫔'),
('Enchiladas de mole amarillo', 'Tortillas bañadas en mole amarillo con pollo deshebrado',    'platos_fuertes', 130, '🍛'),
('Memelitas de frijol',      'Masa de maíz ovalada con frijoles negros y quesillo',           'antojitos',       65, '🌽'),
('Tostadas de chapulines',   'Tostadas con guacamole y chapulines fritos',                    'antojitos',       85, '🍃'),
('Quesillo con memelas',     'Memelas de maíz azul con quesillo fresco y salsa de morita',    'antojitos',       75, '🧀'),
('Agua de jamaica',          'Flor de jamaica de Oaxaca con piloncillo y limón',              'bebidas',         35, '🫙'),
('Tepache de piña',          'Fermentado de piña con piloncillo y canela',                    'bebidas',         45, '🍺'),
('Café de olla',             'Café oaxaqueño con piloncillo, canela y cacao en barro',        'bebidas',         40, '☕'),
('Nicuatole',                'Postre de maíz con leche y canela, textura de gelatina',        'postres',         55, '🍮'),
('Chocolate oaxaqueño',      'Chocolate molido en metate con canela, batido en molinillo',    'postres',         50, '🍫'),
('Tortillas extra',          'Tortillas hechas a mano, porción de 4',                         'extras',          20, '🫓'),
('Salsa extra',              'Salsa verde o roja de la casa',                                 'extras',          15, '🌶️');
