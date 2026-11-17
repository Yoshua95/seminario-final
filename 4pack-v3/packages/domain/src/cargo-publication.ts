export type MsdsFile = { name: string; mimeType: string; size: number };
export type PublicationAttempt = { requestId: string; uploadId: string };

export function validateMsdsFile(file: MsdsFile | null | undefined): void {
  if (
    !file ||
    file.mimeType !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf") ||
    !Number.isFinite(file.size) ||
    file.size < 1 ||
    file.size > 10 * 1024 * 1024
  ) {
    throw new Error("Adjuntá una ficha MSDS PDF válida, de hasta 10 MB.");
  }
}

// Shared by web and native mobile. An upload failure leaves a private draft.
// The caller retains both keys for retries, including a lost publish response.
export async function publishCargoWithMsds(
  attempt: PublicationAttempt,
  required: boolean,
  file: MsdsFile | null | undefined,
  ports: {
    prepare(requestId: string): Promise<string>;
    upload(cargoId: string, uploadId: string): Promise<void>;
    publish(cargoId: string): Promise<void>;
  },
): Promise<string> {
  if (required) validateMsdsFile(file);
  const id = await ports.prepare(attempt.requestId);
  if (required) await ports.upload(id, attempt.uploadId);
  await ports.publish(id);
  return id;
}
