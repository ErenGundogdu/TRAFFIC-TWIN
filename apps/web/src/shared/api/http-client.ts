import axios from "axios";
import { apiErrorResponseSchema } from "@traffic-twin/contracts";

import { webConfig } from "@/shared/config";

import { ApiError } from "./api-error";

export const httpClient = axios.create({
  baseURL: webConfig.backendUrl,
  timeout: 20_000,
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const responseBody = apiErrorResponseSchema.safeParse(
        error.response?.data,
      );

      return Promise.reject(
        responseBody.success
          ? new ApiError(
              responseBody.data.error.code,
              responseBody.data.error.message,
              error.response?.status ?? null,
              responseBody.data.error.requestId,
              responseBody.data.error.timestamp,
              responseBody.data.error.details ?? null,
            )
          : new ApiError(
              "HTTP_REQUEST_FAILED",
              "Sunucuyla iletişim kurulurken bir hata oluştu.",
              error.response?.status ?? null,
            ),
      );
    }

    return Promise.reject(error);
  },
);
