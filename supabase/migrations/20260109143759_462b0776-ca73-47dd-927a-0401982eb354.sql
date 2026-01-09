-- Corrigir políticas permissivas nas tabelas existentes

-- Remover políticas antigas
DROP POLICY IF EXISTS "Allow all access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;

-- Criar políticas corretas para conversations
CREATE POLICY "Agents can view all conversations" 
ON public.conversations FOR SELECT 
TO authenticated 
USING (public.is_agent(auth.uid()));

CREATE POLICY "Agents can update conversations" 
ON public.conversations FOR UPDATE 
TO authenticated 
USING (public.is_agent(auth.uid()));

CREATE POLICY "Agents can insert conversations" 
ON public.conversations FOR INSERT 
TO authenticated 
WITH CHECK (public.is_agent(auth.uid()));

-- Criar políticas corretas para messages
CREATE POLICY "Agents can view all messages" 
ON public.messages FOR SELECT 
TO authenticated 
USING (public.is_agent(auth.uid()));

CREATE POLICY "Agents can insert messages" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (public.is_agent(auth.uid()));

CREATE POLICY "Agents can update messages" 
ON public.messages FOR UPDATE 
TO authenticated 
USING (public.is_agent(auth.uid()));