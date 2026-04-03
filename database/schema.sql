-- Tabla de empleados
CREATE TABLE empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  pin TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'empleado',
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de registros de asistencia
CREATE TABLE registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID REFERENCES empleados(id),
  fecha DATE NOT NULL,
  entrada TIMESTAMP,
  inicio_almuerzo TIMESTAMP,
  fin_almuerzo TIMESTAMP,
  salida TIMESTAMP,
  horas_trabajadas NUMERIC(4,2),
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Empleados de prueba
INSERT INTO empleados (nombre, pin, rol) VALUES
  ('Ana Martínez', '1234', 'admin'),
  ('Carlos Rojas', '5678', 'empleado'),
  ('Valentina López', '9012', 'empleado'),
  ('Matías Fuentes', '3456', 'empleado');