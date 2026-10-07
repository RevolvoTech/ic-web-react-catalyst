import type { Metadata } from "next";
import { OperationsConsole } from "@/components/operations-console";
import "@/styles/operations.css";

export const metadata: Metadata = {
  title: "Command Operations",
  description: "Role-aware alert review and expedition audit history.",
};

export default function OperationsPage() {
  return <OperationsConsole />;
}
