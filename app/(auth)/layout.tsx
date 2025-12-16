/**
 * =============================================================================
 * Auth Layout
 * =============================================================================
 * 
 * Layout for authentication pages (login, rules acceptance).
 * These pages don't show the bottom navigation.
 * 
 * Simple centered layout with UCI branding.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 
        UCI-inspired gradient background
        Subtle diagonal gradient from blue to white
      */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(0, 100, 164, 0.05) 0%, 
              rgba(255, 255, 255, 1) 50%,
              rgba(255, 210, 0, 0.05) 100%
            )
          `,
        }}
      />
      
      {/* Main content area - centered */}
      <main className="flex-1 flex items-center justify-center p-4 safe-top safe-bottom">
        {children}
      </main>
      
      {/* Footer with UCI branding */}
      <footer className="py-4 text-center text-sm text-neutral-500">
        <p>Exclusively for the UCI community 🐜</p>
      </footer>
    </div>
  );
}

