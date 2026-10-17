function responseFailure(response: Response, reason: string): Error {
  const path = response.url ? new URL(response.url).pathname : "API request";
  const help =
    response.status === 401
      ? "Refresh the Wix dashboard to renew your session."
      : response.status === 403
        ? "Check this app's permissions and your site access."
        : "Try again. If this continues, check the server logs.";
  return new Error(
    `${path} returned HTTP ${response.status}: ${reason} ${help}`,
  );
}

export async function readResult<T>(response: Response): Promise<T> {
  const text = await response.text().catch(() => {
    throw responseFailure(response, "the response could not be read.");
  });
  if (!text.trim()) throw responseFailure(response, "the response was empty.");
  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw responseFailure(response, "the server did not return valid JSON.");
  }
  if (!result || typeof result !== "object" || !("success" in result))
    throw responseFailure(response, "the response format was unexpected.");
  const envelope = result as {
    success?: unknown;
    data?: unknown;
    error?: { message?: unknown };
  };
  if (!response.ok || envelope.success === false) {
    if (
      typeof envelope.error?.message === "string" &&
      envelope.error.message.trim()
    )
      throw new Error(envelope.error.message);
    throw responseFailure(response, "the request failed.");
  }
  if (envelope.success !== true || !Object.hasOwn(envelope, "data"))
    throw responseFailure(response, "the response format was unexpected.");
  return envelope.data as T;
}
