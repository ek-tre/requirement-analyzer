import { neon } from '@neondatabase/serverless';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function parsePlanningEntries(value) {
  return String(value || '')
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildSolutionsFromTeamFields(row, existingSolutions = []) {
  const solutionEntries = parsePlanningEntries(row?.cells?.col_sol_team);
  const experimentEntries = parsePlanningEntries(row?.cells?.col_exp_team);

  if (solutionEntries.length === 0 && experimentEntries.length === 0) {
    return [];
  }

  const normalizedSolutionEntries = solutionEntries.length > 0 ? solutionEntries : ['Proposed Solution'];

  return normalizedSolutionEntries.map((solutionText, index) => {
    const existingSolution = Array.isArray(existingSolutions) ? existingSolutions[index] : null;
    const existingExperiments = Array.isArray(existingSolution?.experiments)
      ? existingSolution.experiments
      : [];

    const experimentsForSolution =
      normalizedSolutionEntries.length === 1
        ? experimentEntries
        : experimentEntries[index]
          ? [experimentEntries[index]]
          : [];

    return {
      id: existingSolution?.id || `sol_${generateId()}`,
      text: solutionText,
      experiments: experimentsForSolution.map((experimentText, experimentIndex) => ({
        id: existingExperiments[experimentIndex]?.id || `exp_${generateId()}`,
        text: experimentText,
        result: existingExperiments[experimentIndex]?.result || '',
      })),
    };
  });
}

function scrubDiscoveryPlanningData(discoveryTable, opportunityTree) {
  if (!discoveryTable && !opportunityTree) {
    return { discoveryTable, opportunityTree };
  }

  const tableRows = Array.isArray(discoveryTable?.rows) ? discoveryTable.rows : [];
  const rows = tableRows.map((row) => ({
    ...row,
    cells: {
      ...(row?.cells || {}),
      col_sol: '',
      col_exp: '',
    },
  }));

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const opportunities = Array.isArray(opportunityTree?.opportunities)
    ? opportunityTree.opportunities.map((opp) => {
        const sourceRow = rowsById.get(opp?.sourceRowId);
        if (!sourceRow) return opp;

        return {
          ...opp,
          solutions: buildSolutionsFromTeamFields(sourceRow, opp?.solutions),
        };
      })
    : opportunityTree?.opportunities;

  return {
    discoveryTable: discoveryTable
      ? {
          ...discoveryTable,
          rows,
        }
      : discoveryTable,
    opportunityTree: opportunityTree
      ? {
          ...opportunityTree,
          opportunities: Array.isArray(opportunities) ? opportunities : [],
        }
      : opportunityTree,
  };
}

function sanitizeProjectData(project) {
  if (!project || typeof project !== 'object') return project;

  const sanitized = {
    ...project,
  };

  if (Array.isArray(sanitized.outcomes)) {
    sanitized.outcomes = sanitized.outcomes.map((outcome) => {
      const scrubbed = scrubDiscoveryPlanningData(outcome?.discoveryTable || null, outcome?.opportunityTree || null);
      return {
        ...outcome,
        discoveryTable: scrubbed.discoveryTable,
        opportunityTree: scrubbed.opportunityTree,
      };
    });
  }

  if (sanitized.discoveryTable || sanitized.opportunityTree) {
    const scrubbedLegacy = scrubDiscoveryPlanningData(sanitized.discoveryTable || null, sanitized.opportunityTree || null);
    sanitized.discoveryTable = scrubbedLegacy.discoveryTable;
    sanitized.opportunityTree = scrubbedLegacy.opportunityTree;
  }

  return sanitized;
}

function getSQL() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('No DATABASE_URL or POSTGRES_URL env var found');
  return neon(url);
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Untitled',
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_by TEXT
    )
  `;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getSQL();
    await ensureTable(sql);

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, name, data, updated_at, updated_by 
        FROM projects 
        ORDER BY updated_at DESC
      `;

      const sanitizedRows = [];
      for (const row of rows) {
        const rawData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        const sanitizedData = sanitizeProjectData(rawData);
        const wasChanged = JSON.stringify(sanitizedData) !== JSON.stringify(rawData);

        if (wasChanged) {
          const dataJson = JSON.stringify(sanitizedData);
          await sql`
            UPDATE projects
            SET data = ${dataJson}::jsonb,
                name = ${sanitizedData?.name || row.name || 'Untitled'},
                updated_at = NOW()
            WHERE id = ${row.id}
          `;
        }

        sanitizedRows.push({
          ...row,
          name: sanitizedData?.name || row.name,
          data: sanitizedData,
        });
      }

      return res.json(sanitizedRows);
    }

    if (req.method === 'PUT') {
      const { projects } = req.body;
      if (!Array.isArray(projects)) {
        return res.status(400).json({ error: 'Expected { projects: [...] }' });
      }

      for (const p of projects) {
        const sanitizedData = sanitizeProjectData(p.data || p);
        const dataJson = JSON.stringify(sanitizedData);
        await sql`
          INSERT INTO projects (id, name, data, updated_at, updated_by)
          VALUES (${p.id}, ${sanitizedData?.name || p.name || 'Untitled'}, ${dataJson}::jsonb, NOW(), ${p.updated_by || null})
          ON CONFLICT (id) DO UPDATE SET
            name = ${sanitizedData?.name || p.name || 'Untitled'},
            data = ${dataJson}::jsonb,
            updated_at = NOW(),
            updated_by = ${p.updated_by || null}
        `;
      }
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sql`DELETE FROM projects WHERE id = ${id}`;
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('DB error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
}
