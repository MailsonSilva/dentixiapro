import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientLayout } from '../ClientLayout';
import { supabase } from '@/lib/supabase';

// Mock dependências do Next.js
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/';
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock Sidebar e Navbar pra não renderizar a árvore toda nos testes do layout
vi.mock('@/components/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }));

describe('ClientLayout Authentication TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
    mockSearchParams = new URLSearchParams();
  });

  it('TESTE 1: Deve redirecionar usuário DESLOGADO para /login (Substituindo o histórico)', async () => {
    // Preparando o cenário nulo (unauthenticated)
    mockPathname = '/simulacoes'; // Simulando uma rota privada
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

    render(<ClientLayout><div>Página Privada</div></ClientLayout>);

    // De acordo com os requisitos:
    // 1) Tem que carregar ao abrir
    // 2) Como não está na rota /login nem public, deve chamar router.replace('/login')
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('TESTE 2: Deve redirecionar PARCEIRO logado na home para o seu respectivo dashboard', async () => {
    // Preparando cenário: Usuário Parceiro navegando na Home "/"
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: '123' } } });
    
    // Mockar tabela usuarios para retornar "parceiro"
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tipo_usuario: 'parceiro' } }),
    }));

    render(<ClientLayout><div>Conteúdo da Home</div></ClientLayout>);

    await waitFor(() => {
      // Como a pathname simulada é "/" e o tipo é "parceiro", deve sofrer o push/replace
      expect(mockPush).toHaveBeenCalledWith('/parceiros');
    });
  });

  it('TESTE 3: Usuário Comum acessando a aplicação normalmente não sofre redirect e renderiza o conteúdo', async () => {
    mockPathname = '/';
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: '123' } } });
    
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { tipo_usuario: 'comum' } }),
        };
      }
      if (table === 'verificar_status_usuario') {
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { status_code: 3 } }),
        };
      }
      return {};
    });

    render(<ClientLayout><div data-testid="app-content">Conteúdo da Home</div></ClientLayout>);

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
      // Não pode haver redirect para este caso de sucesso
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
