/**
 * Lightweight client-side PDF page count using pdfjs-dist (bundled by unpdf,
 * so no extra runtime cost). Dynamic import keeps the worker out of the
 * initial bundle — only loaded when a user actually picks a file.
 */
export async function readPageCount(file: File): Promise<number | null> {
  try {
    const { getDocumentProxy } = await import("unpdf");
    const buf = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    return pdf.numPages;
  } catch {
    return null;
  }
}
