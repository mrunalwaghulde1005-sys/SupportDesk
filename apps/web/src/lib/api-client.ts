export interface ApiErrorDetails {
  path: string[];
  message: string;
}

interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetails[];
}

interface ApiEnvelope {
  data: unknown;
  error: ApiErrorBody | null;
  meta: Record<string, unknown>;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly details: ApiErrorDetails[];

  constructor(code: string, message: string, status: number | null, details: ApiErrorDetails[] = []) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

let unauthorizedHandler: (() => void) | undefined;

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = import.meta.env.DEV
  ? ""
  : configuredApiBaseUrl?.replace(/\/+$/, "");

if (!import.meta.env.DEV && !apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL must be set for production builds.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseApiError(value: unknown): ApiErrorBody | null {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.code !== "string" ||
    typeof value.message !== "string"
  ) {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "The server returned an unexpected response.",
      null,
    );
  }

  return {
    code: value.code,
    message: value.message,
    details: Array.isArray(value.details)
      ? value.details.filter((detail): detail is ApiErrorDetails =>
          isRecord(detail) && Array.isArray(detail.path) && detail.path.every((part) => typeof part === "string") && typeof detail.message === "string",
        )
      : [],
  };
}

function parseEnvelope(value: unknown): ApiEnvelope {
  if (
    !isRecord(value) ||
    !("data" in value) ||
    !("error" in value) ||
    !isRecord(value.meta)
  ) {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "The server returned an unexpected response.",
      null,
    );
  }

  return {
    data: value.data,
    error: parseApiError(value.error),
    meta: value.meta,
  };
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, token, headers: requestHeaders, ...requestOptions } = options;
  const headers = new Headers(requestHeaders);
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestOptions,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiClientError(
        "NETWORK_ERROR",
        "Unable to reach SupportDesk. Check your connection and try again.",
        null,
      );
    }

    throw error;
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "The server returned an unexpected response.",
      response.status,
    );
  }

  const envelope = parseEnvelope(responseBody);

  if (!response.ok || envelope.error) {
    if (response.status === 401 && token) {
      unauthorizedHandler?.();
    }

    throw new ApiClientError(
      envelope.error?.code ?? "REQUEST_FAILED",
      envelope.error?.message ?? "The request could not be completed.",
      response.status,
      envelope.error?.details,
    );
  }

  if (envelope.data === null) {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "The server returned an unexpected response.",
      response.status,
    );
  }

  return envelope.data as T;
}

export const apiClient = {
  get<T>(path: string, token?: string): Promise<T> {
    return request<T>(path, { method: "GET", token });
  },

  post<T>(path: string, body: unknown, token?: string): Promise<T> {
    return request<T>(path, { method: "POST", body, token });
  },
  patch<T>(path: string, body?: unknown, token?: string): Promise<T> {
    return request<T>(path, { method: "PATCH", body, token });
  },
  delete<T>(path: string, token?: string): Promise<T> {
    return request<T>(path, { method: "DELETE", token });
  },
};
