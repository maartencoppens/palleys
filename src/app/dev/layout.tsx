import { fontClassName } from "../fonts";
import "../globals.css";

// Root layout of the local test pages, which belong to neither the shop nor the backoffice.
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  return (
    <html lang="nl" className={fontClassName}>
      <body>{children}</body>
    </html>
  );
}
