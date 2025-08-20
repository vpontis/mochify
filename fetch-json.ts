import { z } from "zod";

type RequestOptions = {
  headers?: Record<string, string>;
  timeout?: number; // milliseconds
};

/**
 * Custom error class for fetch failures with response details
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public responseText?: string,
  ) {
    super(message);
    this.name = "FetchError";
  }

  static async fromResponse(response: Response): Promise<FetchError> {
    let responseText: string | undefined;
    try {
      responseText = await response.text();
    } catch {
      // Ignore errors reading response
    }

    return new FetchError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      response.statusText,
      responseText,
    );
  }
}

/**
 * Simplified fetch utilities with automatic JSON parsing and Zod validation.
 * Inspired by lux/utils fetch-json but simplified for our needs.
 */
export namespace FetchJSON {
  /**
   * GET request with query params and Zod validation.
   */
  export async function get<T extends z.ZodTypeAny>(
    url: string,
    options: RequestOptions & {
      params?: Record<string, any>;
      schema: T;
    },
  ): Promise<z.infer<T>> {
    const { params, headers, schema, timeout } = options;

    // Build URL with query parameters
    let requestUrl = url;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const separator = url.includes("?") ? "&" : "?";
      requestUrl = `${url}${separator}${searchParams.toString()}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    let timeoutId: Timer | undefined;

    if (timeout) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await FetchError.fromResponse(response);
        if (error.responseText) {
          console.error("API Error Response:", error.responseText);
        }
        throw error;
      }

      const data = await response.json();
      return schema.parse(data);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * POST request with JSON body and Zod validation.
   * If endpoint contains an ID (e.g., /cards/:id), it acts as an update.
   */
  export async function post<T extends z.ZodTypeAny>(
    url: string,
    data: any,
    options: RequestOptions & { schema: T },
  ): Promise<z.infer<T>> {
    return _mutate(url, data, "POST", options);
  }

  /**
   * PUT request with JSON body and Zod validation.
   */
  export async function put<T extends z.ZodTypeAny>(
    url: string,
    data: any,
    options: RequestOptions & { schema: T },
  ): Promise<z.infer<T>> {
    return _mutate(url, data, "PUT", options);
  }

  /**
   * DELETE request with optional Zod validation for response.
   * Schema is optional since DELETE often returns no content.
   */
  export async function del<T extends z.ZodTypeAny = z.ZodVoid>(
    url: string,
    options: RequestOptions & { schema?: T } = {},
  ): Promise<z.infer<T> | void> {
    const { headers, schema, timeout } = options;

    // Create AbortController for timeout
    const controller = new AbortController();
    let timeoutId: Timer | undefined;

    if (timeout) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          ...headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await FetchError.fromResponse(response);
        if (error.responseText) {
          console.error("API Error Response:", error.responseText);
        }
        throw error;
      }

      // Check if there's content to parse
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const responseData = await response.json();
        return schema ? schema.parse(responseData) : (responseData as any);
      }

      // No content or non-JSON response
      return schema ? schema.parse(undefined) : (undefined as any);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Internal mutation helper for POST/PUT requests
   */
  async function _mutate<T extends z.ZodTypeAny>(
    url: string,
    data: any,
    method: "POST" | "PUT",
    options: RequestOptions & { schema: T },
  ): Promise<z.infer<T>> {
    const { headers, schema, timeout } = options;

    // Create AbortController for timeout
    const controller = new AbortController();
    let timeoutId: Timer | undefined;

    if (timeout) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: data !== undefined ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await FetchError.fromResponse(response);
        if (error.responseText) {
          console.error("API Error Response:", error.responseText);
        }
        throw error;
      }

      const responseData = await response.json();
      return schema.parse(responseData);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
