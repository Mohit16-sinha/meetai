"use client";

import { trpc } from "@/trpc/client";

export const HomeView = () => {
  const { data } = trpc.hello.useQuery({ text: "Antonio" });

  return (
    <div className="flex flex-col p-4 gap-y-4">
      {data?.greeting}
    </div>
  );
};
