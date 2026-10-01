import type { Metadata } from "next";
import JoinQueueScreen from "@/components/user/JoinQueueScreen";
import { demoServices } from "@/data/user-demo";

export const metadata: Metadata = { title: "Join queue" };

export default async function JoinQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { service } = await searchParams;
  let initialServiceId = "";
  let initialError: string | undefined;
  if (Array.isArray(service)) {
    initialError =
      "Choose a single service. The link included more than one service.";
  } else if (service !== undefined) {
    if (demoServices.some((item) => item.id === service))
      initialServiceId = service;
    else
      initialError =
        "This service is unavailable. Choose a service from the list.";
  }

  return (
    <JoinQueueScreen
      key={`${initialServiceId}:${initialError || ""}`}
      initialServiceId={initialServiceId}
      initialError={initialError}
    />
  );
}
