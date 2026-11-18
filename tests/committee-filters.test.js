import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommitteeOptions,
  getDefaultCommitteeYear,
  getFilteredCommitteeRecords,
  resetCommitteeFilters,
} from '../src/lib/committee-filters.js';

const records = [
  { name: 'Kohhran Committee', committeeId: 'kohhran', year: 2026 },
  { name: 'Archives & Documentation Committee', committeeId: 'archive', year: 2026 },
  { name: 'Archives & Documentation Committee', committeeId: 'archive', year: 2025 },
  { name: 'Building Committee', committeeId: 'building', year: 2025 },
];

test('combined search, year, and committee filters intersect correctly', () => {
  assert.deepEqual(getFilteredCommitteeRecords(records, {
    query: 'archive', year: '2025', committeeId: 'archive',
  }), [records[2]]);
  assert.deepEqual(getFilteredCommitteeRecords(records, {
    query: 'kohhran', year: '2025', committeeId: 'archive',
  }), []);
});

test('All Years returns matching records across every year', () => {
  assert.deepEqual(getFilteredCommitteeRecords(records, {
    query: 'archive', year: 'all', committeeId: 'archive',
  }), [records[1], records[2]]);
});

test('latest available year is the default even when current calendar year is absent', () => {
  assert.equal(getDefaultCommitteeYear([2025, 2024, 2026]), '2026');
  assert.equal(getDefaultCommitteeYear([2024, 2025]), '2025');
  assert.equal(getDefaultCommitteeYear([]), 'all');
});

test('committee options come from the master list and include only committees with public records', () => {
  const master = [
    { id: 'building', name: 'Building Committee', display_order: 2 },
    { id: 'kohhran', name: 'Kohhran Committee', display_order: 0 },
    { id: 'unused', name: 'Unused Committee', display_order: 1 },
    { id: 'archive', name: 'Archives & Documentation Committee', display_order: 3 },
  ];
  assert.deepEqual(getCommitteeOptions(master, records), [
    { id: 'kohhran', name: 'Kohhran Committee' },
    { id: 'building', name: 'Building Committee' },
    { id: 'archive', name: 'Archives & Documentation Committee' },
  ]);
});

test('Clear Filters restores latest year, All Committees, and an empty search', () => {
  assert.deepEqual(resetCommitteeFilters('2026'), {
    query: '', year: '2026', committeeId: 'all',
  });
});

test('no-match filter combinations return an empty result without throwing', () => {
  assert.deepEqual(getFilteredCommitteeRecords(records, {
    query: 'not present', year: 'all', committeeId: 'all',
  }), []);
});
