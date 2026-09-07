import Aplikace from "@/components/pobyt/Aplikace";

/**
 * Obal se záložkami platí pro záložkové obrazovky. Přihlášení a focení
 * domku jsou mimo tuhle skupinu — viz `components/pobyt/Aplikace`.
 */
export default function AplikaceLayout({ children }: { children: React.ReactNode }) {
  return <Aplikace>{children}</Aplikace>;
}
