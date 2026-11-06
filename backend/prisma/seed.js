import bcrypt from 'bcryptjs'
import prisma from '../src/config/prisma.js'

async function main() {
  console.log('🌱 Memulai seeding database Satoria Logbook...')

  // 1. Roles
  console.log('-> Seeding Roles...')
  const roles = [
    { name: 'Admin', description: 'Administrator Sistem & Pengelola Master Data' },
    { name: 'Supervisor', description: 'Pengawas Operasional & Penyetuju Logbook Tim' },
    { name: 'Teknisi', description: 'Pelaksana Pemeliharaan Mesin & Pengisi Logbook' }
  ]
  const roleMap = {}
  for (const r of roles) {
    const record = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r
    })
    roleMap[r.name] = record.id
  }

  // 2. Work Groups
  console.log('-> Seeding Work Groups...')
  const groups = [
    'Mekanikal',
    'Elektrikal & Instrumentasi',
    'Utility & HVAC',
    'Facility Support'
  ]
  const groupMap = {}
  for (const g of groups) {
    const record = await prisma.workGroup.upsert({
      where: { name: g },
      update: {},
      create: { name: g }
    })
    groupMap[g] = record.id
  }

  // 3. Plants
  console.log('-> Seeding Plants...')
  const plants = ['Plant 1', 'Plant 2', 'Plant 3', 'Plant 4']
  const plantMap = {}
  for (const p of plants) {
    const record = await prisma.plant.upsert({
      where: { name: p },
      update: {},
      create: { name: p }
    })
    plantMap[p] = record.id
  }

  // 4. Shifts
  console.log('-> Seeding Shifts...')
  const shifts = [
    { name: 'Shift 1 (Pagi)', start_time: '06:00', end_time: '14:00' },
    { name: 'Shift 2 (Sore)', start_time: '14:00', end_time: '22:00' },
    { name: 'Shift 3 (Malam)', start_time: '22:00', end_time: '06:00' }
  ]
  const shiftMap = {}
  for (const s of shifts) {
    let record = await prisma.shift.findFirst({ where: { name: s.name } })
    if (!record) {
      record = await prisma.shift.create({ data: s })
    }
    shiftMap[s.name] = record.id
  }

  // 5. Machines (dengan relasi plant_id per Section 9)
  console.log('-> Seeding Machines & Sub-Machines...')
  const machinesData = [
    // Plant 1
    {
      name: 'Mesin Filling Cair A',
      plant_id: plantMap['Plant 1'],
      subMachines: ['Nozzle Injeksi', 'Piston Pompa', 'Conveyor Botol']
    },
    {
      name: 'Mesin Sealing Tube 1',
      plant_id: plantMap['Plant 1'],
      subMachines: ['Pemanas Induksi', 'Jaw Crimper', 'Rotary Table']
    },
    {
      name: 'Mesin Autoclave Sterilizer 1',
      plant_id: plantMap['Plant 1'],
      subMachines: ['Pintu Pneumatik', 'Katup Solenoid Uap', 'Sensor Tekanan']
    },
    // Plant 2
    {
      name: 'Mesin Granulasi Tablet',
      plant_id: plantMap['Plant 2'],
      subMachines: ['Impeller Blades', 'Chopper Motor', 'Bowl Chamber']
    },
    {
      name: 'Mesin Kompresi Rotary 1',
      plant_id: plantMap['Plant 2'],
      subMachines: ['Upper Punch Set', 'Lower Punch Set', 'Die Table']
    },
    {
      name: 'Mesin Coating Tablet 2',
      plant_id: plantMap['Plant 2'],
      subMachines: ['Blower Udara Panas', 'Spray Gun Atomizer', 'Pan Pengering']
    },
    // Plant 3
    {
      name: 'Mesin Blister Packaging 1',
      plant_id: plantMap['Plant 3'],
      subMachines: ['Forming Roller', 'Sealing Cylinder', 'Cutter Die']
    },
    {
      name: 'Mesin Kartoning Otomatis 1',
      plant_id: plantMap['Plant 3'],
      subMachines: ['Leaflet Feeder', 'Carton Pusher', 'Hot Melt Gun']
    },
    // Plant 4
    {
      name: 'Chiller Sentral 1',
      plant_id: plantMap['Plant 4'],
      subMachines: ['Kompresor Screw', 'Evaporator Tube', 'Condenser Fan']
    },
    {
      name: 'Boiler Uap Industri 2',
      plant_id: plantMap['Plant 4'],
      subMachines: ['Burner Gas', 'Water Feed Pump', 'Safety Relief Valve']
    }
  ]

  const machineMap = {}
  const subMachineMap = {}

  for (const m of machinesData) {
    let machine = await prisma.machine.findFirst({
      where: { name: m.name, plant_id: m.plant_id }
    })
    if (!machine) {
      machine = await prisma.machine.create({
        data: { name: m.name, plant_id: m.plant_id }
      })
    }
    machineMap[m.name] = machine.id

    for (const smName of m.subMachines) {
      let subMachine = await prisma.subMachine.findFirst({
        where: { name: smName, machine_id: machine.id }
      })
      if (!subMachine) {
        subMachine = await prisma.subMachine.create({
          data: { name: smName, machine_id: machine.id }
        })
      }
      subMachineMap[`${m.name}-${smName}`] = subMachine.id
    }
  }

  // 6. Users (Termasuk Akun Dummy Resmi per Section 12)
  console.log('-> Seeding Users...')
  const defaultPasswordHash = await bcrypt.hash('password123', 10)

  const usersData = [
    {
      nik: 'ADM-2022-001',
      email: 'admin@satoria.co.id',
      full_name: 'Administrator Sistem',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Admin'],
      plant_id: plantMap['Plant 1'],
      group_id: groupMap['Facility Support']
    },
    {
      nik: 'SPV-2023-005',
      email: 'spv@satoria.co.id',
      full_name: 'Ir. Hendra Gunawan',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Supervisor'],
      plant_id: plantMap['Plant 1'],
      group_id: groupMap['Mekanikal']
    },
    {
      nik: 'TEK-2024-001',
      email: 'teknisi@satoria.co.id',
      full_name: 'Budi Santoso',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Teknisi'],
      plant_id: plantMap['Plant 1'],
      group_id: groupMap['Mekanikal']
    },
    {
      nik: 'TEK-2024-002',
      email: 'agus.setiawan@satoria.co.id',
      full_name: 'Agus Setiawan',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Teknisi'],
      plant_id: plantMap['Plant 1'],
      group_id: groupMap['Mekanikal']
    },
    {
      nik: 'TEK-2024-003',
      email: 'dedi.irawan@satoria.co.id',
      full_name: 'Dedi Irawan',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Teknisi'],
      plant_id: plantMap['Plant 1'],
      group_id: groupMap['Mekanikal']
    },
    {
      nik: 'TEK-2024-004',
      email: 'eko.prasetyo@satoria.co.id',
      full_name: 'Eko Prasetyo',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Teknisi'],
      plant_id: plantMap['Plant 2'],
      group_id: groupMap['Elektrikal & Instrumentasi']
    },
    {
      nik: 'TEK-2024-005',
      email: 'fajar.hidayat@satoria.co.id',
      full_name: 'Fajar Hidayat',
      password_hash: defaultPasswordHash,
      role_id: roleMap['Teknisi'],
      plant_id: plantMap['Plant 3'],
      group_id: groupMap['Utility & HVAC']
    }
  ]

  const userMap = {}
  for (const u of usersData) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password_hash: u.password_hash,
        role_id: u.role_id,
        plant_id: u.plant_id,
        group_id: u.group_id
      },
      create: u
    })
    userMap[u.email] = record.id
  }

  // 7. Failure Codes (Taksonomi ISO 14224 - 12 kode, Bagian 4.4)
  console.log('-> Seeding Failure Codes...')
  const failureCodes = [
    { code: 'MECH-01', category: 'MECHANICAL', name: 'Bearing aus/overheat/macet' },
    { code: 'MECH-02', category: 'MECHANICAL', name: 'Kebocoran seal/gasket/pneumatik/hidrolik' },
    { code: 'MECH-03', category: 'MECHANICAL', name: 'Belt/chain/gear kendor atau putus' },
    { code: 'MECH-04', category: 'MECHANICAL', name: 'Misalignment/getaran' },
    { code: 'ELEC-01', category: 'ELECTRICAL', name: 'Motor overload/trip' },
    { code: 'ELEC-02', category: 'ELECTRICAL', name: 'Inverter/VFD/servo fault' },
    { code: 'ELEC-03', category: 'ELECTRICAL', name: 'Heater putus/tidak stabil' },
    { code: 'INST-01', category: 'INSTRUMENTATION', name: 'Sensor/photoelectric/proximity error' },
    { code: 'INST-02', category: 'INSTRUMENTATION', name: 'PLC/HMI/komunikasi modul' },
    { code: 'UTIL-01', category: 'UTILITY', name: 'Tekanan angin/vacuum drop' },
    { code: 'UTIL-02', category: 'UTILITY', name: 'Suplai air/chiller/steam kurang' },
    { code: 'PROC-01', category: 'PROCESS', name: 'Penyesuaian parameter/set-up/jammed' }
  ]
  for (const fc of failureCodes) {
    await prisma.failureCode.upsert({
      where: { code: fc.code },
      update: { category: fc.category, name: fc.name },
      create: { ...fc, description: fc.name }
    })
  }

  // 8. Spareparts (fast-moving & consumable workshop, Bagian 4.4)
  console.log('-> Seeding Spareparts...')
  const spareparts = [
    { part_code: 'BRG-6201', part_name: 'Deep Groove Ball Bearing 6201', specification: '6201-2RS / 6201-ZZ', item_type: 'MACHINE_PART', unit: 'pcs' },
    { part_code: 'BRG-6202', part_name: 'Deep Groove Ball Bearing 6202', specification: '6202-2RS / 6202-ZZ', item_type: 'MACHINE_PART', unit: 'pcs' },
    { part_code: 'BRG-6204', part_name: 'Deep Groove Ball Bearing 6204', specification: '6204-2RS / 6204-ZZ', item_type: 'MACHINE_PART', unit: 'pcs' },
    { part_code: 'BSH-IGUS', part_name: 'Bushing IGUS', specification: 'Polymer plain bearing', item_type: 'MACHINE_PART', unit: 'pcs' },
    { part_code: 'SEAL-PST-85', part_name: 'Seal Piston 85x100x9', specification: '85 x 100 x 9 mm', item_type: 'MACHINE_PART', unit: 'pcs' },
    { part_code: 'FIT-PNE', part_name: 'Fitting Pneumatik', specification: 'Push-in fitting assorted', item_type: 'MACHINE_PART', unit: 'pcs' },
    { part_code: 'CON-GRD-4', part_name: 'Mata gerinda 4"', specification: '4 inch grinding disc', item_type: 'CONSUMABLE_WORKSHOP', unit: 'pcs' },
    { part_code: 'CON-LAS-308', part_name: 'Kawat las/filler SS 308', specification: 'ER308 filler rod', item_type: 'CONSUMABLE_WORKSHOP', unit: 'kg' },
    { part_code: 'CON-STP', part_name: 'Sealtape', specification: 'PTFE thread seal tape', item_type: 'CONSUMABLE_WORKSHOP', unit: 'roll' },
    { part_code: 'CON-BOR', part_name: 'Mata bor', specification: 'HSS drill bit assorted', item_type: 'CONSUMABLE_WORKSHOP', unit: 'pcs' }
  ]
  for (const sp of spareparts) {
    await prisma.sparepart.upsert({
      where: { part_code: sp.part_code },
      update: {
        part_name: sp.part_name,
        specification: sp.specification,
        item_type: sp.item_type,
        unit: sp.unit
      },
      create: sp
    })
  }

  // 9. Logbooks
  console.log('-> Tabel Logbooks dibiarkan bersih (0 data) agar siap untuk input data baru.')

  console.log('✅ Seeding database Satoria Logbook selesai dengan sukses!')
}

main()
  .catch(e => {
    console.error('❌ Gagal seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
