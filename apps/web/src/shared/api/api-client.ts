import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { z } from "zod";

import { ApiError } from "./api-error";
import { httpClient } from "./http-client";

type ResponseSchema<TOutput> = z.ZodType<TOutput>;

class ApiClient {
  async get<TOutput>(
    url: string,
    responseSchema: ResponseSchema<TOutput>,
    config?: AxiosRequestConfig,
  ): Promise<TOutput> {
    return this.request({ ...config, method: "GET", url }, responseSchema);
  }

  async post<TOutput>(
    url: string,
    data: unknown,
    responseSchema: ResponseSchema<TOutput>,
    config?: AxiosRequestConfig,
  ): Promise<TOutput> {
    return this.request(
      { ...config, method: "POST", url, data },
      responseSchema,
    );
  }

  private async request<TOutput>(
    config: AxiosRequestConfig,
    responseSchema: ResponseSchema<TOutput>,
  ): Promise<TOutput> {
    const response = await httpClient.request<unknown, AxiosResponse<unknown>>(
      config,
    );
    const parsed = responseSchema.safeParse(response.data);

    if (!parsed.success) {
      throw new ApiError(
        "INVALID_API_RESPONSE",
        "Sunucudan beklenmeyen bir veri biçimi alındı.",
        response.status ?? null,
      );
    }

    return parsed.data;
  }
}

export const apiClient = new ApiClient();
