import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const uiPath = path.resolve(process.cwd(), 'src/components/ui');
    const files = await fs.readdir(uiPath, { withFileTypes: true });
    const regularFiles = files.filter(f => f.isFile() && !f.name.startsWith('.'));
    
    const zip = new JSZip();
    
    for (const file of regularFiles) {
      const filePath = path.join(uiPath, file.name);
      const buffer = await fs.readFile(filePath);
      zip.file(file.name, buffer);
    }
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="components-ui.zip"'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create components archive' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}