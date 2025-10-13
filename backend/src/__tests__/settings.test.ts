import request from 'supertest'
import express from 'express'
import { config } from '../config'
import jwt from 'jsonwebtoken'

// Mocks must be defined BEFORE importing the router module
const users = new Map<string, any>()
let settingsRow: any = {
  id: 'settings1',
  primaryColor: '#111111',
  secondaryColor: '#222222',
  accentColor: '#333333',
  emailProvider: 'smtp',
  smtpHost: 'localhost',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: 'user',
  smtpPassword: 'pass',
  sessionTimeout: 30,
  frontendUrl: config.frontendUrl,
}

// Control flags and instance reference for Prisma mock to simulate failures and access raw SQL mocks
let prismaFail = { findFirst: false, update: false, create: false }
let prismaInstance: any

jest.mock('@prisma/client', () => {
  class PrismaClientMock {
    constructor() { prismaInstance = this }
    user = { findUnique: jest.fn((args: any) => { const id = args?.where?.id; return users.get(id) ?? null; }) }
    settings = {
      findFirst: jest.fn(async () => { if (prismaFail.findFirst) throw new Error('Prisma findFirst failure'); return settingsRow }),
      update: jest.fn(async ({ data }: any) => { if (prismaFail.update) throw new Error('Prisma update failure'); settingsRow = { ...settingsRow, ...data }; return settingsRow; }),
      create: jest.fn(async ({ data }: any) => { if (prismaFail.create) throw new Error('Prisma create failure'); settingsRow = { id: 'settings1', ...data }; return settingsRow; }),
    }
    $queryRaw = jest.fn()
    $executeRaw = jest.fn()
    $queryRawUnsafe = jest.fn()
    $executeRawUnsafe = jest.fn()
    member = { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() }
    pointRedemption = { aggregate: jest.fn(), count: jest.fn(), findMany: jest.fn() }
    ticket = { count: jest.fn() }
    event = { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() }
    registrationCode = { create: jest.fn() }
    announcement = { create: jest.fn() }
    pointAdjustment = { create: jest.fn(), findMany: jest.fn() }
    eventRegistration = { count: jest.fn(), findMany: jest.fn() }
  }
  return { PrismaClient: PrismaClientMock }
})

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }))

// Import admin router AFTER mocks
import adminRouter from '../routes/admin'

function buildTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/admin', adminRouter)
  return app
}

function makeToken(uid: string, role: string = 'ADMIN') {
  const payload = { uid, role } as any
  return jwt.sign(payload, config.jwtSecret)
}

function setUser(uid: string, adminRole: 'CASHIER' | 'MODERATOR' | 'OWNER' | 'SUPER_ADMIN', overrides: any = {}) {
  users.set(uid, { id: uid, adminRole, isActive: true, fullName: 'Admin', email: 'admin@test.com', ...overrides })
}

describe('Admin Settings endpoints (auth and validation)', () => {
  const app = buildTestApp()

  it('GET /api/admin/settings should require auth', async () => {
    const res = await request(app).get('/api/admin/settings')
    expect([401, 403]).toContain(res.status)
  })

  it('PUT /api/admin/settings should reject invalid payload', async () => {
    const uid = 'admin-invalid'
    setUser(uid, 'SUPER_ADMIN')
    const token = makeToken(uid)
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: 'not-a-color', sessionTimeout: -10, emailProvider: 'invalid' })
    expect(res.status).toBe(400)
  })
})

describe('Admin Settings endpoints (roles and success)', () => {
  const app = buildTestApp()

  beforeEach(() => {
    users.clear()
    settingsRow = {
      id: 'settings1',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      emailProvider: 'smtp',
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'user',
      smtpPassword: 'pass',
      sessionTimeout: 30,
      frontendUrl: config.frontendUrl,
    }
  })

  it('GET /api/admin/settings should return 200 for SUPER_ADMIN', async () => {
    const uid = 'admin-super'
    setUser(uid, 'SUPER_ADMIN')
    const token = makeToken(uid)
    const res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('primaryColor', '#111111')
    expect(res.body).toHaveProperty('emailProvider', 'smtp')
  })

  it('GET /api/admin/settings should return 200 for OWNER', async () => {
    const uid = 'admin-owner'
    setUser(uid, 'OWNER')
    const token = makeToken(uid)
    const res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('GET /api/admin/settings should return 403 for CASHIER', async () => {
    const uid = 'admin-cashier'
    setUser(uid, 'CASHIER')
    const token = makeToken(uid)
    const res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/settings should return 403 for MODERATOR', async () => {
    const uid = 'admin-mod'
    setUser(uid, 'MODERATOR')
    const token = makeToken(uid)
    const res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('PUT /api/admin/settings should update and invalidate cache for SUPER_ADMIN', async () => {
    const uid = 'admin-super-2'
    setUser(uid, 'SUPER_ADMIN')
    const token = makeToken(uid)
    const putRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: '#123456', emailProvider: 'smtp', sessionTimeout: 45 })
    expect(putRes.status).toBe(200)
    expect(putRes.body).toHaveProperty('primaryColor', '#123456')

    const getRes = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
    expect(getRes.status).toBe(200)
    expect(getRes.body).toHaveProperty('primaryColor', '#123456')
  })
})

describe('Admin Settings endpoints (additional Zod validation)', () => {
  const app = buildTestApp()

  beforeEach(() => {
    users.clear()
    settingsRow = {
      id: 'settings1',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      emailProvider: 'smtp',
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'user',
      smtpPassword: 'pass',
      sessionTimeout: 30,
      frontendUrl: config.frontendUrl,
    }
  })

  function auth(role: 'SUPER_ADMIN' | 'OWNER' | 'MODERATOR' | 'CASHIER' = 'SUPER_ADMIN') {
    const uid = `admin-${role.toLowerCase()}-zod`
    setUser(uid, role)
    const token = makeToken(uid)
    return token
  }

  it('sessionTimeout: reject <5 and >1440; accept 5 and 1440', async () => {
    const token = auth('SUPER_ADMIN')
    // reject <5
    let res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionTimeout: 4, emailProvider: 'smtp' })
    expect(res.status).toBe(400)

    // reject >1440
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionTimeout: 1441, emailProvider: 'smtp' })
    expect(res.status).toBe(400)

    // accept 5
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionTimeout: 5, emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // accept 1440
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionTimeout: 1440, emailProvider: 'smtp' })
    expect(res.status).toBe(200)
  })

  it('primaryColor: accept #RGB/#RRGGBB, reject non-hex', async () => {
    const token = auth('SUPER_ADMIN')
    // accept #RGB
    let res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: '#abc', emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // accept #RRGGBB
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: '#A1B2C3', emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // reject non-hex
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: 'blue', emailProvider: 'smtp' })
    expect(res.status).toBe(400)
  })

  it('logoUrl/webhookUrl: accept null/valid URL, reject non-URL', async () => {
    const token = auth('SUPER_ADMIN')
    // accept null
    let res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ logoUrl: null, webhookUrl: null, emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // accept valid URL
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ logoUrl: 'https://example.com/logo.png', webhookUrl: 'https://example.com/webhook', emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // reject non-URL
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ logoUrl: 'not a url', webhookUrl: 'ftp://notallowed.local', emailProvider: 'smtp' })
    expect(res.status).toBe(400)
  })

  it("emailProvider: accept 'smtp', reject others", async () => {
    const token = auth('SUPER_ADMIN')
    // accept smtp
    let res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // reject other value
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ emailProvider: 'sendgrid' })
    expect(res.status).toBe(400)
  })

  it('announcement: reject >5000 chars, accept null/short', async () => {
    const token = auth('SUPER_ADMIN')
    const longText = 'a'.repeat(5001)
    // reject >5000
    let res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ announcement: longText, emailProvider: 'smtp' })
    expect(res.status).toBe(400)

    // accept null
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ announcement: null, emailProvider: 'smtp' })
    expect(res.status).toBe(200)

    // accept short
    res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ announcement: 'Pengumuman singkat', emailProvider: 'smtp' })
    expect(res.status).toBe(200)
  })
})

describe('Admin Settings endpoints (cache behavior)', () => {
  const app = buildTestApp()
  const TTL_MS = 60000

  beforeEach(() => {
    users.clear()
    settingsRow = {
      id: 'settings1',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      emailProvider: 'smtp',
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'user',
      smtpPassword: 'pass',
      sessionTimeout: 30,
      frontendUrl: config.frontendUrl,
    }
  })

  function authToken(role: 'SUPER_ADMIN' | 'OWNER' | 'MODERATOR' | 'CASHIER' = 'SUPER_ADMIN') {
    const uid = `admin-${role.toLowerCase()}-cache`
    setUser(uid, role)
    return makeToken(uid)
  }

  it('should use cached value within TTL and refresh after TTL expiry', async () => {
    const token = authToken('SUPER_ADMIN')

    // Control time
    const dateSpy = jest.spyOn(Date, 'now')
    try {
      // t0: initial time
      const t0 = 1_000
      dateSpy.mockReturnValue(t0)

      // First GET populates cache with current DB value (#111111)
      let res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#111111')

      // Change DB (mock) value to #999999
      settingsRow.primaryColor = '#999999'

      // t1: within TTL -> should still return cached value (#111111)
      const t1 = t0 + TTL_MS / 2
      dateSpy.mockReturnValue(t1)
      res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#111111')

      // t2: beyond TTL -> cache expired, should return fresh DB value (#999999)
      const t2 = t0 + TTL_MS + 1
      dateSpy.mockReturnValue(t2)
      res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#999999')
    } finally {
      dateSpy.mockRestore()
    }
  })

  it('PUT should invalidate cache so subsequent GET returns updated value immediately', async () => {
    const token = authToken('SUPER_ADMIN')

    // Control time
    const dateSpy = jest.spyOn(Date, 'now')
    try {
      const t0 = 2_000
      dateSpy.mockReturnValue(t0)

      // First GET populates cache with #111111
      let res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#111111')

      // Change DB (mock) value and also send PUT to update via API
      settingsRow.primaryColor = '#222222' // simulate underlying change
      const putPayload = { primaryColor: '#13579B', emailProvider: 'smtp', sessionTimeout: 45 }

      // t1 within TTL of old cache; but PUT should invalidate cache
      const t1 = t0 + TTL_MS / 3
      dateSpy.mockReturnValue(t1)
      const putRes = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send(putPayload)
      expect(putRes.status).toBe(200)
      expect(putRes.body).toHaveProperty('primaryColor', '#13579B')

      // Immediately after PUT (still within old TTL), GET should reflect updated value due to invalidation
      const getRes = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(getRes.status).toBe(200)
      expect(getRes.body).toHaveProperty('primaryColor', '#13579B')
    } finally {
      dateSpy.mockRestore()
    }
  })
})

describe('Admin Settings endpoints (raw SQL fallback)', () => {
  const app = buildTestApp()
  const TTL_MS = 60000

  beforeEach(() => {
    users.clear()
    settingsRow = {
      id: 'settings1',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      emailProvider: 'smtp',
      smtpHost: 'localhost',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'user',
      smtpPassword: 'pass',
      sessionTimeout: 30,
      frontendUrl: config.frontendUrl,
    }
    prismaFail = { findFirst: false, update: false, create: false }
    if (prismaInstance) {
      prismaInstance.$queryRawUnsafe.mockReset()
      prismaInstance.$executeRawUnsafe.mockReset()
      prismaInstance.$queryRaw.mockReset()
      prismaInstance.$executeRaw.mockReset()
    }
  })

  function authToken(role: 'SUPER_ADMIN' | 'OWNER' | 'MODERATOR' | 'CASHIER' = 'SUPER_ADMIN') {
    const uid = `admin-${role.toLowerCase()}-sql`
    setUser(uid, role)
    return makeToken(uid)
  }

  it('GET should fallback to raw SQL when Prisma findFirst fails, honor TTL cache', async () => {
    const token = authToken('SUPER_ADMIN')
    const dateSpy = jest.spyOn(Date, 'now')

    try {
      const t0 = 10_000
      dateSpy.mockReturnValue(t0)

      // Force Prisma to fail
      prismaFail.findFirst = true

      // Raw SQL returns first row
      const row1 = { id: 'settings1', primaryColor: '#AAAAAA', updatedAt: new Date() }
      prismaInstance.$queryRawUnsafe.mockResolvedValue([row1])

      let res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#AAAAAA')

      // Change underlying SQL row
      const row2 = { id: 'settings1', primaryColor: '#BBBBBB', updatedAt: new Date() }
      prismaInstance.$queryRawUnsafe.mockResolvedValue([row2])

      // Within TTL -> should still return cached value
      const t1 = t0 + TTL_MS / 2
      dateSpy.mockReturnValue(t1)
      res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#AAAAAA')

      // Beyond TTL -> should return fresh SQL value
      const t2 = t0 + TTL_MS + 1
      dateSpy.mockReturnValue(t2)
      res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#BBBBBB')
    } finally {
      dateSpy.mockRestore()
    }
  })

  it('PUT should fallback to raw SQL UPDATE when Prisma update fails and invalidate cache', async () => {
    const token = authToken('SUPER_ADMIN')
    const dateSpy = jest.spyOn(Date, 'now')

    try {
      const t0 = 20_000
      dateSpy.mockReturnValue(t0)

      // Prepare GET fallback cache
      prismaFail.findFirst = true
      const currentRow = { id: 'settings1', primaryColor: '#EEEEEE', updatedAt: new Date() }
      prismaInstance.$queryRawUnsafe.mockResolvedValue([currentRow])

      let res = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('primaryColor', '#EEEEEE')

      // Now simulate PUT fallback UPDATE path
      // Fallback SELECT current row
      prismaInstance.$queryRawUnsafe.mockResolvedValue([currentRow])
      // UPDATE via raw SQL
      prismaInstance.$executeRaw.mockResolvedValue(1)
      const updatedRow = { id: 'settings1', primaryColor: '#13579B', updatedAt: new Date() }
      prismaInstance.$queryRaw.mockResolvedValue([updatedRow])

      const putRes = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ primaryColor: '#13579B', emailProvider: 'smtp', sessionTimeout: 45 })
      expect(putRes.status).toBe(200)
      expect(putRes.body).toHaveProperty('primaryColor', '#13579B')

      // Immediately after PUT, GET should reflect updated value due to invalidation
      // Ensure GET fallback returns updated row
      prismaInstance.$queryRawUnsafe.mockResolvedValue([updatedRow])
      const getRes = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`)
      expect(getRes.status).toBe(200)
      expect(getRes.body).toHaveProperty('primaryColor', '#13579B')
    } finally {
      dateSpy.mockRestore()
    }
  })
})