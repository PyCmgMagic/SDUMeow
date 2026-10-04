import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AdoptionStatusMap,
  AdoptionAuditStatusCodeMap,
  AdminAdoptionStatusMap,
  isAdminAdoptionAuditableStatus,
  normalizeAdminAdoptionStatus,
  toAdoptionAuditRequestBody,
  toAdoptionStatusName
} from '../src/types/index.ts'

const statusCases = [
  [0, 0, 'PENDING'],
  [1, 1, 'INTERVIEW'],
  [2, 2, 'APPROVED'],
  [3, 3, 'REJECTED'],
  [4, 4, 'COMPLETED'],
  [5, 5, 'CANCELLED']
]

test('normalizes all backend adoption codes and enum names', () => {
  for (const [input, code, name] of statusCases) {
    assert.equal(normalizeAdminAdoptionStatus(input), code)
    assert.equal(normalizeAdminAdoptionStatus(String(input)), code)
    assert.equal(normalizeAdminAdoptionStatus(name), code)
    assert.equal(toAdoptionStatusName(input), name)
  }

  assert.equal(normalizeAdminAdoptionStatus('unknown'), undefined)
  assert.equal(toAdoptionStatusName('unknown'), undefined)
})

test('maps cancelled adoption status to the backend description', () => {
  assert.equal(AdminAdoptionStatusMap[5], '已取消')
  assert.equal(AdoptionStatusMap.CANCELLED, '已取消')
})

test('does not expose audit actions for cancelled applications', () => {
  assert.equal(isAdminAdoptionAuditableStatus(0), true)
  assert.equal(isAdminAdoptionAuditableStatus(1), true)
  assert.equal(isAdminAdoptionAuditableStatus(2), true)
  assert.equal(isAdminAdoptionAuditableStatus(3), false)
  assert.equal(isAdminAdoptionAuditableStatus(4), false)
  assert.equal(isAdminAdoptionAuditableStatus(5), false)
  assert.equal(isAdminAdoptionAuditableStatus('CANCELLED'), false)
})

test('maps completed audit and response status to backend code 4', () => {
  assert.equal(AdoptionAuditStatusCodeMap.COMPLETED, 4)
  assert.deepEqual(
    toAdoptionAuditRequestBody({ status: 'COMPLETED', reason: '领养流程完成' }),
    { status: 4, reason: '领养流程完成' }
  )
  assert.equal(normalizeAdminAdoptionStatus(4), 4)
  assert.equal(normalizeAdminAdoptionStatus('4'), 4)
  assert.equal(normalizeAdminAdoptionStatus('COMPLETED'), 4)
  assert.equal(toAdoptionStatusName(4), 'COMPLETED')
  assert.equal(AdminAdoptionStatusMap[4], '已完成')
  assert.equal(isAdminAdoptionAuditableStatus(4), false)
})
