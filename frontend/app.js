const API = 'http://localhost:3000'
const ADMIN_PASS = 'nexo2024'

let empleados = []
let empleadoActual = null
let pinBuffer = ''

// ─── RELOJ ───────────────────────────────────────────
function actualizarReloj() {
  const ahora = new Date()
  document.getElementById('hora').textContent = ahora.toLocaleTimeString('es-CL')
  document.getElementById('fecha').textContent = ahora.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}
setInterval(actualizarReloj, 1000)
actualizarReloj()

// ─── TABS ────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.vista').forEach(v => v.style.display = 'none')

  if (tab === 'marcar') {
    document.querySelectorAll('.tab')[0].classList.add('active')
    document.getElementById('vista-marcar').style.display = 'block'
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active')
    document.getElementById('vista-admin').style.display = 'block'
  }
}

// ─── CARGAR EMPLEADOS ─────────────────────────────────
async function cargarEmpleados() {
  const res = await fetch(`${API}/empleados`)
  empleados = await res.json()

  await Promise.all(empleados.map(async (emp) => {
    const res = await fetch(`${API}/registros/hoy/${emp.id}`)
    const registro = await res.json()

    if (!registro) { emp._estado = 'none'; return }
    if (registro.salida) { emp._estado = 'salida'; return }
    if (registro.inicio_almuerzo && !registro.fin_almuerzo) { emp._estado = 'almuerzo'; return }
    emp._estado = 'trabajando'
  }))

  renderizarEmpleados()
}

function renderizarEmpleados() {
  const colores = [
    { fondo: '#EEEDFE', texto: '#3C3489' },
    { fondo: '#E1F5EE', texto: '#085041' },
    { fondo: '#FAECE7', texto: '#712B13' },
    { fondo: '#FAEEDA', texto: '#633806' }
  ]

  const estados = {
    none: { label: 'Sin registros', clase: 'badge-none' },
    trabajando: { label: 'Trabajando', clase: 'badge-trabajando' },
    almuerzo: { label: 'En almuerzo', clase: 'badge-almuerzo' },
    salida: { label: 'Salió', clase: 'badge-salida' }
  }

  const grid = document.getElementById('lista-empleados')
  grid.innerHTML = empleados.map((emp, i) => {
    const color = colores[i % colores.length]
    const iniciales = emp.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)
    const estado = emp._estado || 'none'
    const st = estados[estado]

    return `<div class="emp-card" onclick="seleccionarEmpleado('${emp.id}')">
      <div class="emp-avatar" style="background:${color.fondo};color:${color.texto}">${iniciales}</div>
      <div class="emp-nombre">${emp.nombre}</div>
      <div class="emp-rol">${emp.rol}</div>
      <span class="badge ${st.clase}">${st.label}</span>
    </div>`
  }).join('')
}

// ─── SELECCIONAR EMPLEADO ─────────────────────────────
async function seleccionarEmpleado(id) {
  empleadoActual = empleados.find(e => e.id === id)
  pinBuffer = ''
  actualizarPuntos()
  document.getElementById('pin-error').textContent = ''

  const iniciales = empleadoActual.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)
  const colores = ['#EEEDFE','#E1F5EE','#FAECE7','#FAEEDA']
  const textos = ['#3C3489','#085041','#712B13','#633806']
  const i = empleados.findIndex(e => e.id === id) % 4

  document.getElementById('info-empleado-pin').innerHTML = `
    <div class="info-emp">
      <div class="emp-avatar" style="background:${colores[i]};color:${textos[i]}">${iniciales}</div>
      <div>
        <div class="emp-nombre">${empleadoActual.nombre}</div>
        <div class="emp-rol">${empleadoActual.rol}</div>
      </div>
    </div>`

  mostrarPaso('pin')
}

// ─── PIN ──────────────────────────────────────────────
function agregarPin(digito) {
  if (pinBuffer.length >= 4) return
  pinBuffer += digito
  actualizarPuntos()
  if (pinBuffer.length === 4) validarPin()
}

function borrarPin() {
  pinBuffer = pinBuffer.slice(0, -1)
  actualizarPuntos()
  document.getElementById('pin-error').textContent = ''
}

function limpiarPin() {
  pinBuffer = ''
  actualizarPuntos()
}

function actualizarPuntos() {
  document.querySelectorAll('.punto').forEach((p, i) => {
    p.classList.toggle('lleno', i < pinBuffer.length)
  })
}

function validarPin() {
  if (pinBuffer === empleadoActual.pin) {
    document.getElementById('pin-error').textContent = ''
    mostrarPaso('accion')
    cargarAcciones()
  } else {
    document.getElementById('pin-error').textContent = 'PIN incorrecto. Intenta de nuevo.'
    setTimeout(() => { pinBuffer = ''; actualizarPuntos() }, 800)
  }
}

// ─── ACCIONES ─────────────────────────────────────────
async function cargarAcciones() {
  const res = await fetch(`${API}/registros/hoy/${empleadoActual.id}`)
  const registro = await res.json()

  const iniciales = empleadoActual.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)
  const colores = ['#EEEDFE','#E1F5EE','#FAECE7','#FAEEDA']
  const textos = ['#3C3489','#085041','#712B13','#633806']
  const i = empleados.findIndex(e => e.id === empleadoActual.id) % 4

  document.getElementById('info-empleado-accion').innerHTML = `
    <div class="info-emp">
      <div class="emp-avatar" style="background:${colores[i]};color:${textos[i]}">${iniciales}</div>
      <div class="emp-nombre">${empleadoActual.nombre}</div>
    </div>`

  // Estado de hoy
  if (registro) {
    const filas = [
      { label: 'Entrada', val: fmtHora(registro.entrada) },
      { label: 'Salida almuerzo', val: fmtHora(registro.inicio_almuerzo) },
      { label: 'Regreso almuerzo', val: fmtHora(registro.fin_almuerzo) },
      { label: 'Salida', val: fmtHora(registro.salida) },
    ]
    if (registro.horas_trabajadas) {
      filas.push({ label: 'Total trabajado', val: `${registro.horas_trabajadas} hrs`, clase: 'estado-total' })
    }
    document.getElementById('estado-hoy').innerHTML = `
      <div class="estado-hoy">
        ${filas.map(f => `
          <div class="estado-fila">
            <span class="estado-label">${f.label}</span>
            <span class="estado-val ${f.clase||''}">${f.val}</span>
          </div>`).join('')}
      </div>`
  } else {
    document.getElementById('estado-hoy').innerHTML =
      '<p style="font-size:13px;color:#888;margin-bottom:1rem">Sin registros hoy. Marca tu entrada para comenzar.</p>'
  }

  // Botones
  const canEntrada = !registro
  const canIniAlm = registro && registro.entrada && !registro.inicio_almuerzo
  const canFinAlm = registro && registro.inicio_almuerzo && !registro.fin_almuerzo
  const canSalida = registro && registro.entrada && !registro.salida &&
    (!registro.inicio_almuerzo || registro.fin_almuerzo)

  const acciones = [
    { tipo: 'entrada', icono: '🟢', titulo: 'Entrada', sub: 'Inicio jornada', activo: canEntrada },
    { tipo: 'inicio_almuerzo', icono: '🍽', titulo: 'Sal. almuerzo', sub: 'Pausa para comer', activo: canIniAlm },
    { tipo: 'fin_almuerzo', icono: '↩', titulo: 'Ret. almuerzo', sub: 'De vuelta al trabajo', activo: canFinAlm },
    { tipo: 'salida', icono: '🔴', titulo: 'Salida', sub: 'Fin de jornada', activo: canSalida },
  ]

  document.getElementById('botones-accion').innerHTML = acciones.map(a => `
    <button class="accion-btn" onclick="marcar('${a.tipo}')" ${a.activo ? '' : 'disabled'}>
      <div class="accion-icono">${a.icono}</div>
      <div class="accion-titulo">${a.titulo}</div>
      <div class="accion-sub">${a.sub}</div>
    </button>`).join('')
}

// ─── MARCAR ───────────────────────────────────────────
async function marcar(tipo) {
  const res = await fetch(`${API}/registros/marcar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empleado_id: empleadoActual.id, tipo })
  })
  const registro = await res.json()

  const labels = {
    entrada: 'Entrada registrada',
    inicio_almuerzo: 'Salida a almuerzo registrada',
    fin_almuerzo: 'Regreso de almuerzo registrado',
    salida: 'Salida registrada'
  }

  const msg = document.getElementById('mensaje-exito')
  msg.style.display = 'block'
  msg.innerHTML = `<div class="exito"><p>${labels[tipo]}</p><span>${fmtHora(registro[tipo])}</span></div>`
  setTimeout(() => msg.style.display = 'none', 3000)

  cargarAcciones()
  cargarEmpleados()
}

// ─── ADMIN ────────────────────────────────────────────
function verificarAdmin() {
  const pass = document.getElementById('admin-pass').value
  if (pass === ADMIN_PASS) {
    document.getElementById('admin-login').style.display = 'none'
    document.getElementById('admin-panel').style.display = 'block'
    iniciarAdmin()
  } else {
    document.getElementById('admin-error').textContent = 'Contraseña incorrecta.'
  }
}

async function iniciarAdmin() {
  // Poblar selector de empleados
  const sel = document.getElementById('filtro-empleado')
  sel.innerHTML = '<option value="">Todos los empleados</option>' +
    empleados.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')

  // Mes actual
  const ahora = new Date()
  document.getElementById('filtro-mes').value =
    `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  cargarTabla()
}

async function cargarTabla() {
  const mes = document.getElementById('filtro-mes').value
  const empId = document.getElementById('filtro-empleado').value

  let url = `${API}/registros/mes?mes=${mes}`
  if (empId) url += `&empleado_id=${empId}`

  const res = await fetch(url)
  const registros = await res.json()

  // Métricas
  const totalHrs = registros.reduce((s, r) => s + (parseFloat(r.horas_trabajadas) || 0), 0)
  const completos = registros.filter(r => r.entrada && r.salida).length
  document.getElementById('metricas').innerHTML = `
    <div class="metrica"><div class="metrica-label">Registros</div><div class="metrica-valor">${registros.length}</div></div>
    <div class="metrica"><div class="metrica-label">Completos</div><div class="metrica-valor">${completos}</div></div>
    <div class="metrica"><div class="metrica-label">Total horas</div><div class="metrica-valor">${totalHrs.toFixed(1)}</div></div>`

  // Tabla
  const tbody = document.getElementById('tabla-body')
  if (!registros.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem">Sin registros</td></tr>'
    return
  }

  tbody.innerHTML = registros.map(r => {
    const nombre = r.empleados?.nombre || '—'
    const completo = r.entrada && r.salida
    const hoy = r.fecha === new Date().toISOString().slice(0, 10)
    const badge = completo
      ? '<span class="badge badge-salida">Completo</span>'
      : hoy ? '<span class="badge badge-trabajando">En curso</span>'
      : '<span class="badge badge-none">Incompleto</span>'

    return `<tr>
      <td style="font-weight:500">${nombre}</td>
      <td>${r.fecha}</td>
      <td>${fmtHora(r.entrada)}</td>
      <td>${fmtHora(r.inicio_almuerzo)}</td>
      <td>${fmtHora(r.fin_almuerzo)}</td>
      <td>${fmtHora(r.salida)}</td>
      <td>${r.horas_trabajadas ? r.horas_trabajadas + ' hrs' : '—'}</td>
      <td>${badge}</td>
    </tr>`
  }).join('')
}

// ─── HELPERS ──────────────────────────────────────────
function fmtHora(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago'
  })
}

function mostrarPaso(paso) {
  ['seleccionar', 'pin', 'accion'].forEach(p => {
    document.getElementById(`paso-${p}`).style.display = p === paso ? 'block' : 'none'
  })
}

function volver(paso) {
  pinBuffer = ''
  actualizarPuntos()
  mostrarPaso(paso)
  if (paso === 'seleccionar') cargarEmpleados()
}

// ─── INICIO ───────────────────────────────────────────
cargarEmpleados()