import express from 'express';
import multer from 'multer';
import Excel from 'exceljs';
import path from 'path';
import { generateExcelTemplate } from '../services/excelService.js';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Route to handle Excel generation
router.post('/exportwb', async (req, res) => {
  try {
    const { templateid, rows } = req.body;

    // Validate the request payload
    if (!templateid || !rows || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    // Call the service to generate the Excel file
    await generateExcelTemplate(templateid, rows, res);
  } catch (error) {
    console.error('Error in /exportwb:', error.message);
    res.status(500).json({ message: 'Error generating Excel file' });
  }
});

// Route to handle Excel import
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Save the uploaded file locally
    const filePath = path.resolve(__dirname, `../${req.file.path}`);
    console.log(`File saved at: ${filePath}`);

    // Parse the Excel file
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) {
      fs.unlinkSync(filePath); // Clean up the file before returning
      return res.status(400).json({ message: 'No valid worksheet found' });
    }

    const products = [];
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header row
      products.push({
        category: row.getCell(1).value || "prime",
        modifications: {
          fivePrime: row.getCell(2).value || "",
          threePrime: row.getCell(3).value || "",
        },
        saflaştırma: row.getCell(4).value || null,
        scale: row.getCell(5).value || "50 nmol",
        totalPrice: parseFloat(row.getCell(6).value) || 0,
        oligoAdi: row.getCell(7).value || `Imported Product ${rowIndex}`,
      });
    });

    console.log('Extracted Products:', products); // Log products correctly

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    // Return the extracted products
    res.status(200).json({ products });
  } catch (error) {
    console.error('Error in /import:', error.message);

    // Clean up file in case of an error
    if (req.file) {
      const filePath = path.resolve(__dirname, `../${req.file.path}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({ message: 'Error processing Excel file' });
  }
});

export default router;
