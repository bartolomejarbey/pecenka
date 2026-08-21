import type { ReactNode } from "react";
import "./doklad.css";

/**
 * Doklad má vlastní rozvržení — bez navigace, patičky a lišty cookies.
 * Je to úřední dokument, ne stránka webu.
 */
export default function DokladLayout({ children }: { children: ReactNode }) {
  return children;
}
