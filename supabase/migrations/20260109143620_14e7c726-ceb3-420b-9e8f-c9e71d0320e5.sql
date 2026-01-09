-- ========================================
-- 1. FUNÇÃO AUXILIAR PRIMEIRO
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========================================
-- 2. ENUM PARA ROLES
-- ========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'agent');

-- ========================================
-- 3. TABELAS
-- ========================================

-- Perfis de atendentes
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  is_online boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Roles dos usuários (separada para segurança)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Tags
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#8b5cf6',
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Regras de automação para tags
CREATE TABLE public.tag_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  trigger_type text NOT NULL,
  trigger_value text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Junction table conversas <-> tags
CREATE TABLE public.conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (conversation_id, tag_id)
);

-- Campos de atribuição na tabela conversations
ALTER TABLE public.conversations
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN assigned_at timestamp with time zone,
ADD COLUMN status text DEFAULT 'pending';

-- ========================================
-- 4. RLS
-- ========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se usuário é atendente
CREATE OR REPLACE FUNCTION public.is_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Policies
CREATE POLICY "Agents can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_agent(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_agent(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view tags" ON public.tags FOR SELECT TO authenticated USING (public.is_agent(auth.uid()));
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents can view automation rules" ON public.tag_automation_rules FOR SELECT TO authenticated USING (public.is_agent(auth.uid()));
CREATE POLICY "Admins can manage automation rules" ON public.tag_automation_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents can manage conversation tags" ON public.conversation_tags FOR ALL TO authenticated USING (public.is_agent(auth.uid()));

-- ========================================
-- 5. TRIGGERS
-- ========================================

-- Trigger para criar perfil automaticamente ao signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at no profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 6. DADOS INICIAIS
-- ========================================
INSERT INTO public.tags (name, color, description) VALUES
  ('Urgente', '#ef4444', 'Atendimento prioritário'),
  ('Aguardando Cliente', '#f59e0b', 'Esperando resposta do cliente'),
  ('Aguardando Interno', '#3b82f6', 'Esperando resposta interna'),
  ('Resolvido', '#22c55e', 'Atendimento finalizado'),
  ('Novo', '#8b5cf6', 'Primeira interação');

INSERT INTO public.tag_automation_rules (tag_id, trigger_type, trigger_value, is_active)
SELECT id, 'first_message', null, true FROM public.tags WHERE name = 'Novo';

INSERT INTO public.tag_automation_rules (tag_id, trigger_type, trigger_value, is_active)
SELECT id, 'no_response_time', '30', true FROM public.tags WHERE name = 'Urgente';