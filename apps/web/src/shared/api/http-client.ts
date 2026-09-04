import axios from "axios";

import { ApiError } from "./api-error";

export const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  timeout: 20_000,
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const responseBody = error.response?.data as
        { error?: { message?: string } } | undefined;

      return Promise.reject(
        new ApiError(
          responseBody?.error?.message ??
            "Sunucuyla iletişim kurulurken bir hata oluştu.",
          error.response?.status ?? null,
        ),
      );
    }

    return Promise.reject(error);
  },
);
