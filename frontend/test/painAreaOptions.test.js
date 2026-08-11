import assert from 'node:assert/strict'
import test from 'node:test'
import { primaryPainAreaOptions } from '../src/pages/medical/painAreaOptions.js'

test('provides eight unique bilingual primary pain area choices', () => {
  assert.equal(primaryPainAreaOptions.length, 8)
  assert.equal(new Set(primaryPainAreaOptions.map(([value])=>value)).size, 8)
  for (const [value, label, ar] of primaryPainAreaOptions) {
    assert.match(value, /^[a-z_]+$/)
    assert.ok(label)
    assert.match(ar, /[\u0600-\u06ff]/)
  }
})
