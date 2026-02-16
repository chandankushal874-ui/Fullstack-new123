import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('extractTextFromPDF: starting parsing...');
    const data = await pdf(buffer);
    console.log('extractTextFromPDF: parsing complete.');
    console.log('extractTextFromPDF: info:', data.info);
    console.log('extractTextFromPDF: numpages:', data.numpages);
    console.log('extractTextFromPDF: text length:', data.text?.length);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF in util:', error);
    throw new Error('Failed to parse PDF document');
  }
}
