import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiscoveryRowFromCandidate, normalizeDiscoveryOpportunityItem } from '../src/discoveryAnalysis.js';

test('smoke: test runner is configured', () => {
  assert.equal(1 + 1, 2);
});

test('discovery analysis preserves evidence fields across normalization and row creation', () => {
  const normalized = normalizeDiscoveryOpportunityItem({
    name: 'Billing visibility gap',
    about: 'Users struggle to see subscription details quickly.',
    impact: 'high',
    businessObjective: 'Reduce support contacts about invoices.',
    evidence: {
      dk: ['"I can never find the invoice overview." (DK interview 2)'],
      se: '"Mitt3 hides the usage summary too deep." (SE transcript)',
      prototype: 'Prototype testers preferred a dashboard card first.',
      b2b: 'Admins asked for clearer billing ownership across teams.',
    },
  });

  const row = createDiscoveryRowFromCandidate(normalized, () => 'row_test');

  assert.equal(row.id, 'row_test');
  assert.equal(row.cells.col_opp, 'Billing visibility gap');
  assert.equal(row.cells.col_impact, 'High');
  assert.match(row.cells.col_dk, /invoice overview/i);
  assert.match(row.cells.col_se, /Mitt3/i);
  assert.match(row.cells.col_proto, /dashboard card/i);
  assert.match(row.cells.col_b2b, /billing ownership/i);
});
