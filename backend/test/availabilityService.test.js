import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clinicianSlots,
  groupSlotsByDay,
  inclusiveDayCount,
  isIsoDate,
  shuffled,
} from '../src/services/availabilityService.js';

function queryResult(result) {
  const query = {
    select: () => query,
    in: () => query,
    eq: () => query,
    lt: () => query,
    gt: () => query,
    neq: () => query,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function fakeDb(results) {
  return {
    from(table) {
      return queryResult(results[table] || { data: [], error: null });
    },
  };
}

test('validates real ISO calendar dates and range sizes', () => {
  assert.equal(isIsoDate('2026-07-23'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('07/23/2026'), false);
  assert.equal(inclusiveDayCount('2026-07-01', '2026-07-31'), 31);
});

test('generates aligned slots and removes booked periods', async () => {
  const db = fakeDb({
    physiotherapist_working_hours: {
      data: [{
        physiotherapist_id: 'doctor-1',
        day_of_week: 'monday',
        start_time: '09:00:00',
        end_time: '10:30:00',
        slot_duration_minutes: 30,
      }],
      error: null,
    },
    appointments: {
      data: [{
        id: 'appointment-1',
        physiotherapist_id: 'doctor-1',
        starts_at: '2026-07-27T09:30:00.000Z',
        ends_at: '2026-07-27T10:00:00.000Z',
      }],
      error: null,
    },
    physiotherapist_time_off: { data: [], error: null },
  });
  const clinicians = [{ profile_id: 'doctor-1', consultation_duration: 30 }];

  const slots = await clinicianSlots(db, clinicians, '2026-07-27', '2026-07-27', {
    now: '2026-07-01T00:00:00.000Z',
  });

  assert.deepEqual(slots, [
    {
      physiotherapist_id: 'doctor-1',
      starts_at: '2026-07-27T09:00:00.000Z',
      ends_at: '2026-07-27T09:30:00.000Z',
    },
    {
      physiotherapist_id: 'doctor-1',
      starts_at: '2026-07-27T10:00:00.000Z',
      ends_at: '2026-07-27T10:30:00.000Z',
    },
  ]);
});

test('groups doctors offering the same time into one patient-facing slot', () => {
  const days = groupSlotsByDay([
    {
      physiotherapist_id: 'doctor-1',
      starts_at: '2026-07-27T09:00:00.000Z',
      ends_at: '2026-07-27T09:30:00.000Z',
    },
    {
      physiotherapist_id: 'doctor-2',
      starts_at: '2026-07-27T09:00:00.000Z',
      ends_at: '2026-07-27T09:45:00.000Z',
    },
  ], '2026-07-27', '2026-07-27');

  assert.deepEqual(days['2026-07-27'][0].doctor_ids, ['doctor-1', 'doctor-2']);
  assert.equal(days['2026-07-27'][0].available_doctor_count, 2);
});

test('shuffles without losing or mutating candidates', () => {
  const original = ['a', 'b', 'c'];
  const result = shuffled(original, () => 0);
  assert.deepEqual(original, ['a', 'b', 'c']);
  assert.deepEqual([...result].sort(), original);
});
