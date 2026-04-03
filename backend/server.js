// Cargamos las variables del archivo .env
require('dotenv').config()

// Importamos las librerías instaladas
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

// Conectamos con Supabase usando las variables del .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Creamos el servidor
const app = express()
app.use(cors())
app.use(express.json())

// ─── RUTAS ───────────────────────────────────────────

// Obtener todos los empleados activos
app.get('/empleados', async (req, res) => {
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .eq('activo', true)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Obtener el registro de hoy de un empleado
app.get('/registros/hoy/:empleadoId', async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .eq('empleado_id', req.params.empleadoId)
    .eq('fecha', hoy)
    .single()

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message })
  }
  res.json(data || null)
})

// Marcar entrada, almuerzo o salida
app.post('/registros/marcar', async (req, res) => {
  const { empleado_id, tipo } = req.body
  const hoy = new Date().toISOString().slice(0, 10)
  const ahora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(' ', 'T')

  // Buscar si ya existe un registro hoy
  let { data: registro } = await supabase
    .from('registros')
    .select('*')
    .eq('empleado_id', empleado_id)
    .eq('fecha', hoy)
    .single()

  if (!registro) {
    // Crear registro nuevo si no existe
    const { data, error } = await supabase
      .from('registros')
      .insert({ empleado_id, fecha: hoy, [tipo]: ahora })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // Calcular horas trabajadas si es salida
  let actualizacion = { [tipo]: ahora }
  if (tipo === 'salida' && registro.entrada) {
    const entrada = new Date(registro.entrada)
    const salida = new Date(ahora)
    const totalMs = salida - entrada
    const almuerzoMs = registro.inicio_almuerzo && registro.fin_almuerzo
      ? new Date(registro.fin_almuerzo) - new Date(registro.inicio_almuerzo)
      : 0
    const horasTrabajadas = ((totalMs - almuerzoMs) / 3600000).toFixed(2)
    actualizacion.horas_trabajadas = horasTrabajadas
  }

  // Actualizar registro existente
  const { data, error } = await supabase
    .from('registros')
    .update(actualizacion)
    .eq('id', registro.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Obtener registros del mes para el panel admin
app.get('/registros/mes', async (req, res) => {
  const { mes, empleado_id } = req.query
  const inicio = `${mes}-01`
  const [anio, mes2] = mes.split('-')
const fin = new Date(anio, mes2, 0).toISOString().slice(0, 10)

  let query = supabase
    .from('registros')
    .select('*, empleados(nombre)')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: false })

  if (empleado_id) query = query.eq('empleado_id', empleado_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ─── ARRANCAR SERVIDOR ────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor Nexo RRHH corriendo en http://localhost:${PORT}`)
})