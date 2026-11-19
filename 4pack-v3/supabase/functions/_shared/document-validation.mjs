export function validateDocumentBytes(name, type, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 1 || bytes.length > 10485760)
    throw new Error("Invalid document size");
  const formats = {
    "application/pdf": { extension: "pdf", names: ["pdf"], signature: [37,80,68,70,45] },
    "image/png": { extension: "png", names: ["png"], signature: [137,80,78,71,13,10,26,10] },
    "image/jpeg": { extension: "jpg", names: ["jpg","jpeg"], signature: [255,216,255] },
  };
  const format = formats[type];
  if (!format || !format.names.includes(name.split(".").pop()?.toLowerCase()) ||
      !format.signature.every((n,i)=>bytes[i]===n)) throw new Error("Invalid document format or signature");
  return format.extension;
}
