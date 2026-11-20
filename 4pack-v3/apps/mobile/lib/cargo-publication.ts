import {
  publishCargoWithMsds,
  requiresHazmatReview,
  type PublicationAttempt,
} from "@4pack/domain";
export type NativeMsds = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};
type Result = { data: unknown; error: { message: string } | null };
export async function publishMobileCargo(
  payload: Record<string, unknown>,
  attempt: PublicationAttempt,
  file: NativeMsds | null,
  api: {
    rpc(name: string, args: Record<string, unknown>): PromiseLike<Result>;
    upload(form: FormData): PromiseLike<Result>;
  },
  makeForm: () => FormData = () => new FormData(),
) {
  const required = requiresHazmatReview(
    `${payload.title} ${payload.description} ${payload.category}`,
  );
  return publishCargoWithMsds(attempt, required, file, {
    prepare: async (request_id) => {
      const result = await api.rpc("prepare_cargo_publication", {
        request_id,
        payload,
      });
      if (result.error) throw new Error(result.error.message);
      if (typeof result.data !== "string")
        throw new Error("No se pudo preparar la carga.");
      return result.data;
    },
    upload: async (id, uploadId) => {
      const form = makeForm();
      form.append("id", id);
      form.append("target_type", "cargo");
      form.append("document_type", "MSDS");
      form.append("kind", "msds");
      form.append("upload_request_id", uploadId);
      // React Native FormData sends this URI descriptor as multipart bytes.
      form.append("file", {
        uri: file!.uri,
        name: file!.name,
        type: file!.mimeType,
      } as unknown as Blob);
      const result = await api.upload(form);
      if (result.error || !(result.data as { id?: string } | null)?.id)
        throw new Error(
          "No se pudo subir el MSDS. La carga sigue como borrador; reintentá.",
        );
    },
    publish: async (target) => {
      const result = await api.rpc("publish_cargo", { target });
      if (result.error) throw new Error(result.error.message);
    },
  });
}
