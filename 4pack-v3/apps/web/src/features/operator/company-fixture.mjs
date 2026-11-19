export function companyFixturePdf() {
  const stream =
      "BT /F1 18 Tf 45 760 Td (4PACK - Credencial ficticia de ensayo) Tj 0 -30 Td /F1 11 Tf (Sin validez legal. Exclusivamente datos locales de prueba.) Tj ET",
    objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
    ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return Buffer.from(pdf);
}
