import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientLayout } from '../ClientLayout';
import * as authActions from '@/lib/auth/actions';

// Mock dependências do Next.js
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock das Server Actions de autenticação
vi.mock('@/lib/auth/actions', () => ({
  getClientLayoutDataAction: vi.fn(),
  signOutAction: vi.fn().mockResolvedValue({ error: null }),
  saveUserPhoneAction: vi.fn().mockResolvedValue({ error: null }),
  setCheckVideoAction: vi.fn().mockResolvedValue({ error: null }),
}));

// Mock da action do vídeo de boas-vindas
vi.mock('@/lib/admin/actions', () => ({
  getPublicWelcomeVideoUrlAction: vi.fn().mockResolvedValue({ url: null }),
}));

// Mock Sidebar e Navbar para isolar o teste do layout
vi.mock('@/components/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }));

describe('ClientLayout Authentication & Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
  });

  it('TESTE 1: Deve renderizar o layout para usuário comum com trial ativo sem redirecionar', async () => {
    vi.mocked(authActions.getClientLayoutDataAction).mockResolvedValue({
      error: null,
      data: {
        user: { id: 'user-123', email: 'dentista@teste.com' } as any,
        userType: 'comum',
        userRole: 'user',
        trialExpired: false,
        telefone: '11999999999',
        checkVideo: true,
      },
    });

    render(
      <ClientLayout>
        <div data-testid="app-content">Conteúdo da Home</div>
      </ClientLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('TESTE 2: Deve redirecionar PARCEIRO para /parceiros ao acessar rota comum fora do escopo', async () => {
    mockPathname = '/simulacoes';

    vi.mocked(authActions.getClientLayoutDataAction).mockResolvedValue({
      error: null,
      data: {
        user: { id: 'partner-123', email: 'parceiro@teste.com' } as any,
        userType: 'parceiro',
        userRole: null,
        trialExpired: false,
        telefone: '11999999999',
        checkVideo: true,
      },
    });

    render(
      <ClientLayout>
        <div data-testid="app-content">Área de Simulações</div>
      </ClientLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/parceiros');
    });
  });

  it('TESTE 3: Exibe o banner de paywall quando o trial estiver expirado para usuário comum', async () => {
    mockPathname = '/';

    vi.mocked(authActions.getClientLayoutDataAction).mockResolvedValue({
      error: null,
      data: {
        user: { id: 'expired-123', email: 'expirado@teste.com' } as any,
        userType: 'comum',
        userRole: 'user',
        trialExpired: true,
        telefone: '11999999999',
        checkVideo: true,
      },
    });

    render(
      <ClientLayout>
        <div data-testid="app-content">Página Principal</div>
      </ClientLayout>
    );

    await waitFor(() => {
      expect(screen.getByText(/período de teste expirou/i)).toBeInTheDocument();
    });
  });
});
