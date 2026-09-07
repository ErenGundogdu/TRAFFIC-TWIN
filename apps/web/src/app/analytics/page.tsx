import { redirect } from "next/navigation";

type LegacyAnalyticsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: LegacyAnalyticsSearchParams;
}) {
  const legacyParams = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(legacyParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  params.set("mode", "analysis");
  redirect(`/monitoring?${params.toString()}`);
}
