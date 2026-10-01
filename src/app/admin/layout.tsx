import { Instrument_Sans } from "next/font/google";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-instrument-sans",
});

// Geldt voor ALLE admin-pagina's, ook /admin/login: lettertype en achtergrond.
// De auth-check zit één niveau dieper, in (protected)/layout.tsx.
export default function AdminShellLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div
      className={`${instrumentSans.variable} min-h-screen bg-canvas font-admin text-ink antialiased`}
    >
      {children}
    </div>
  );
}
