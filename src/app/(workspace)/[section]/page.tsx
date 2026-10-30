import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { configured } from "@/lib/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ produto?: string }>;
}) {
  const { section } = await params;
  const { produto } = await searchParams;
  if (
    ![
      "mineracao",
      "radar",
      "favoritos",
      "analise",
      "historico",
      "configuracoes",
    ].includes(section)
  )
    notFound();
  return (
    <Dashboard
      section={section}
      configured={configured()}
      initialProductId={produto || ""}
    />
  );
}
