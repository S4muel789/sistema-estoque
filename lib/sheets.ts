import { google } from 'googleapis';

function sheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key || !process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    throw new Error('Google Sheets não configurado');
  }
  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function appendMovement(row: string[]) {
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'Movimentações!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}
