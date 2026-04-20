// ============================================================
// roles.js — Hierarquia de Admin do StudyOS
// Inclua este arquivo ANTES de qualquer lógica de página:
//   <script src="roles.js"></script>
// ============================================================

const SUPABASE_URL = 'https://zafhdlehaukexusnpojm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZmhkbGVoYXVrZXh1c25wb2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjI4ODIsImV4cCI6MjA4ODgzODg4Mn0.aH0WrJKnyrngcFDUugcYNLGksk8Iu9Cs5smvX2Vv_ag';

// Instância global do Supabase (reutilize a existente se já tiver)
if (typeof window._sb === 'undefined') {
  window._sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
const sb = window._sb;

// ── Roles disponíveis ──────────────────────────────────────
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  EDUCADOR:    'educador',
  ALUNO:       'aluno',
};

// Hierarquia numérica (maior = mais permissão)
const ROLE_LEVEL = {
  aluno:       1,
  educador:    2,
  super_admin: 3,
};

// ── Busca o perfil do usuário logado ──────────────────────
async function getUserProfile() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, nome, email, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[roles.js] Erro ao buscar perfil:', error.message);
    return null;
  }
  return profile;
}

// ── Verifica se o usuário tem nível suficiente ─────────────
// Ex: hasRole('educador') → true para educador e super_admin
async function hasRole(minRole) {
  const profile = await getUserProfile();
  if (!profile) return false;
  return (ROLE_LEVEL[profile.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

// ── Atalhos práticos ───────────────────────────────────────
async function isSuperAdmin()       { return hasRole(ROLES.SUPER_ADMIN); }
async function isEducadorOrAbove()  { return hasRole(ROLES.EDUCADOR); }
async function isAluno()            { return !!(await getUserProfile()); }

// ── Protege a página: redireciona se sem permissão ─────────
// Uso: await requireRole('educador');
// Coloque no topo do <script> de cada página protegida.
async function requireRole(minRole = 'aluno', redirectTo = 'index.html') {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return false;
  }
  const ok = await hasRole(minRole);
  if (!ok) {
    alert('Você não tem permissão para acessar esta área.');
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// ── Mostra/oculta elementos por role ──────────────────────
// Uso no HTML: <div data-role="educador">...</div>
// Só aparece para educador e super_admin.
async function applyRoleVisibility() {
  const profile = await getUserProfile();
  const currentLevel = profile ? (ROLE_LEVEL[profile.role] ?? 0) : 0;

  document.querySelectorAll('[data-role]').forEach(el => {
    const required = el.getAttribute('data-role');
    const requiredLevel = ROLE_LEVEL[required] ?? 99;
    el.style.display = currentLevel >= requiredLevel ? '' : 'none';
  });
}

// ── Exporta para uso global ────────────────────────────────
window.StudyRoles = {
  ROLES,
  ROLE_LEVEL,
  getUserProfile,
  hasRole,
  isSuperAdmin,
  isEducadorOrAbove,
  isAluno,
  requireRole,
  applyRoleVisibility,
};
