import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, 'responses.xlsx');
const SHEET_NAME = 'Responses';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

async function loadWorkbook() {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(STORE_PATH)) {
    await workbook.xlsx.readFile(STORE_PATH);
  }
  let sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.addRow(['timestamp', 'email', 'firstName', 'answers']);
  }
  return { workbook, sheet };
}

function normalizeHeaders(sheet) {
  const headers = sheet.getRow(1).values.slice(1);
  return headers.map(header => String(header || '').trim());
}

function ensureColumns(sheet, keys) {
  const headers = normalizeHeaders(sheet);
  const missing = keys.filter(key => !headers.includes(key));
  if (missing.length === 0) return headers;

  const newHeaders = [...headers, ...missing];
  sheet.spliceRows(1, 1, [newHeaders]);
  return newHeaders;
}

function buildRowData(headers, payload) {
  return headers.map(header => {
    if (header === 'timestamp') return new Date().toISOString();
    if (header === 'answers') return JSON.stringify(payload.answers || payload);
    return payload[header] ?? '';
  });
}

app.post('/api/save', async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid payload.' });
    }

    const email = String(data.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const firstName = String(data.firstName || data.name || '').trim();
    const answers = { ...data };
    delete answers.email;
    delete answers.firstName;

    const { workbook, sheet } = await loadWorkbook();
    const allHeaders = ensureColumns(sheet, Object.keys(answers));

    const rowValues = buildRowData(allHeaders, { email, firstName, answers, ...answers });
    const emailCol = allHeaders.indexOf('email') + 1;

    let existingRow = null;
    for (let i = 2; i <= sheet.rowCount; i += 1) {
      const row = sheet.getRow(i);
      const cellValue = String(row.getCell(emailCol).value || '').trim().toLowerCase();
      if (cellValue === email) {
        existingRow = row;
        break;
      }
    }

    if (existingRow) {
      existingRow.values = [null, ...rowValues];
    } else {
      sheet.addRow(rowValues);
    }

    await workbook.xlsx.writeFile(STORE_PATH);
    return res.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({ success: false, error: 'Could not save responses.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
