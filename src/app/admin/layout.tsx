// Geldt voor ALLE admin-pagina's, ook /admin/login: lettertype en achtergrond, dezelfde als de shop.
// De auth-check zit één niveau dieper, in (protected)/layout.tsx.
export default function AdminShellLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-page font-body text-text-primary">
      {children}
    </div>
  );
}
