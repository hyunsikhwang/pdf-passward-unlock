import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as mupdf from 'mupdf';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Make sure we support large payloads for PDF decryption!
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // API endpoint for PDF decryption
  app.post('/api/decrypt', async (req, res) => {
    try {
      const { pdf, password } = req.body;
      if (!pdf) {
        return res.status(400).json({ success: false, error: 'PDF data is required' });
      }

      console.log('API Received decrypt request. Payload size:', pdf.length);

      // Convert base64 back to Buffer
      const pdfBuffer = Buffer.from(pdf, 'base64');

      // Open PDF using MuPDF
      const mupdfDoc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
      
      // If PDF requires a password, authenticate it
      if (mupdfDoc.needsPassword()) {
        const authStatus = mupdfDoc.authenticatePassword(password || '');
        if (!authStatus) {
          return res.status(400).json({ success: false, error: 'invalid_password' });
        }
      }

      const pdfDoc = mupdfDoc.asPDF();
      if (!pdfDoc) {
        return res.status(400).json({ success: false, error: 'Could not cast decrypted document to PDF' });
      }

      // Save decrypted bytes back to Buffer
      const decryptedBuffer = pdfDoc.saveToBuffer('decrypt');
      const decryptedBytes = decryptedBuffer.asUint8Array();

      // Convert Uint8Array back to Base64
      const decryptedBase64 = Buffer.from(decryptedBytes).toString('base64');

      console.log('Successfully decrypted PDF using MuPDF seamlessly! Out size:', decryptedBytes.byteLength);

      return res.json({
        success: true,
        pdf: decryptedBase64,
      });

    } catch (e: any) {
      console.error('Express decrypt error:', e);
      return res.status(500).json({
        success: false,
        error: e.message || e.toString(),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built client assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
