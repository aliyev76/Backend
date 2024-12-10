import Excel from 'exceljs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Define __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateExcelTemplate = async (templateid, rows, res) => {
  try {
    const templatePath = path.resolve(__dirname, '../files/siparis_template.xlsx');
    console.log('Loading template from:', templatePath);

    if (!fs.existsSync(templatePath)) {
      console.error('Template file not found:', templatePath);
      throw new Error('Template file not found');
    }

    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) {
      console.error('Worksheet not found in template');
      throw new Error('Worksheet not found');
    }

    // Populate rows if provided
    if (rows.length > 0) {
      rows.forEach((row, rowIndex) => {
        const excelRow = sheet.getRow(rowIndex + 1);
        row.forEach((cell, colIndex) => {
          excelRow.getCell(colIndex + 1).value = cell;
        });
        excelRow.commit();
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="siparis_template.xlsx"');
    await workbook.xlsx.write(res);
    console.log('Template sent successfully!');
  } catch (error) {
    console.error('Error in generateExcelTemplate:', error.message);
    console.error('Stack Trace:', error.stack);
    throw error;
  }
};
