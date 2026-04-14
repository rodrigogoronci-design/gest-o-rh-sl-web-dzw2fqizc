// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4'
  }
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          avaliador_id: string | null
          colaborador_id: string
          created_at: string
          id: string
          nota_pontualidade: number
          nota_qualidade: number
          nota_trabalho_equipe: number
          observacoes: string | null
          organization_id: string | null
          periodo: string
        }
        Insert: {
          avaliador_id?: string | null
          colaborador_id: string
          created_at?: string
          id?: string
          nota_pontualidade: number
          nota_qualidade: number
          nota_trabalho_equipe: number
          observacoes?: string | null
          organization_id?: string | null
          periodo: string
        }
        Update: {
          avaliador_id?: string | null
          colaborador_id?: string
          created_at?: string
          id?: string
          nota_pontualidade?: number
          nota_qualidade?: number
          nota_trabalho_equipe?: number
          observacoes?: string | null
          organization_id?: string | null
          periodo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'avaliacoes_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_avaliacoes_avaliador'
            columns: ['avaliador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_avaliacoes_colaborador'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
        ]
      }
      colaboradores: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          departamento: string | null
          documentos_urls: Json | null
          email: string | null
          endereco: string | null
          id: string
          image_gender: string | null
          nome: string
          organization_id: string | null
          rg: string | null
          role: string
          salario: number | null
          status: string | null
          telefone: string | null
          tipo_contrato: string | null
          user_id: string | null
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          documentos_urls?: Json | null
          email?: string | null
          endereco?: string | null
          id?: string
          image_gender?: string | null
          nome: string
          organization_id?: string | null
          rg?: string | null
          role?: string
          salario?: number | null
          status?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          user_id?: string | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          documentos_urls?: Json | null
          email?: string | null
          endereco?: string | null
          id?: string
          image_gender?: string | null
          nome?: string
          organization_id?: string | null
          rg?: string | null
          role?: string
          salario?: number | null
          status?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'colaboradores_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      ferias: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          observacoes: string | null
          organization_id: string | null
          status: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          observacoes?: string | null
          organization_id?: string | null
          status?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          observacoes?: string | null
          organization_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ferias_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ferias_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ponto: {
        Row: {
          colaborador_id: string | null
          created_at: string
          data: string
          hora_entrada: string | null
          hora_saida: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          data: string
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          organization_id?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          data?: string
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ponto_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ponto_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      recrutamento: {
        Row: {
          created_at: string
          curriculo_url: string | null
          email: string | null
          id: string
          image_gender: string | null
          nome_candidato: string
          organization_id: string | null
          status: string
          telefone: string | null
          vaga: string
          vaga_id: string | null
        }
        Insert: {
          created_at?: string
          curriculo_url?: string | null
          email?: string | null
          id?: string
          image_gender?: string | null
          nome_candidato: string
          organization_id?: string | null
          status: string
          telefone?: string | null
          vaga: string
          vaga_id?: string | null
        }
        Update: {
          created_at?: string
          curriculo_url?: string | null
          email?: string | null
          id?: string
          image_gender?: string | null
          nome_candidato?: string
          organization_id?: string | null
          status?: string
          telefone?: string | null
          vaga?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'recrutamento_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recrutamento_vaga_id_fkey'
            columns: ['vaga_id']
            isOneToOne: false
            referencedRelation: 'vagas'
            referencedColumns: ['id']
          },
        ]
      }
      vagas: {
        Row: {
          created_at: string
          departamento: string
          descricao: string
          id: string
          organization_id: string | null
          requisitos: string
          salario: number
          status: string
          tipo_contrato: string
          titulo: string
        }
        Insert: {
          created_at?: string
          departamento: string
          descricao: string
          id?: string
          organization_id?: string | null
          requisitos: string
          salario: number
          status?: string
          tipo_contrato: string
          titulo: string
        }
        Update: {
          created_at?: string
          departamento?: string
          descricao?: string
          id?: string
          organization_id?: string | null
          requisitos?: string
          salario?: number
          status?: string
          tipo_contrato?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vagas_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: avaliacoes
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: now())
//   colaborador_id: uuid (not null)
//   avaliador_id: uuid (nullable)
//   periodo: text (not null)
//   nota_pontualidade: numeric (not null)
//   nota_qualidade: numeric (not null)
//   nota_trabalho_equipe: numeric (not null)
//   observacoes: text (nullable)
//   organization_id: uuid (nullable)
// Table: colaboradores
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   nome: text (not null)
//   cpf: text (nullable)
//   rg: text (nullable)
//   data_nascimento: date (nullable)
//   endereco: text (nullable)
//   email: text (nullable)
//   telefone: text (nullable)
//   cargo: text (nullable)
//   departamento: text (nullable)
//   data_admissao: date (nullable)
//   salario: numeric (nullable)
//   tipo_contrato: text (nullable)
//   status: text (nullable, default: 'Ativo'::text)
//   documentos_urls: jsonb (nullable, default: '[]'::jsonb)
//   image_gender: text (nullable, default: 'male'::text)
//   role: text (not null, default: 'Colaborador'::text)
//   user_id: uuid (nullable)
//   organization_id: uuid (nullable)
// Table: ferias
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   colaborador_id: uuid (nullable)
//   data_inicio: date (not null)
//   data_fim: date (not null)
//   status: text (nullable, default: 'Pendente'::text)
//   observacoes: text (nullable)
//   organization_id: uuid (nullable)
// Table: organizations
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: now())
//   nome: text (not null)
// Table: ponto
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   colaborador_id: uuid (nullable)
//   data: date (not null)
//   hora_entrada: text (nullable)
//   hora_saida: text (nullable)
//   organization_id: uuid (nullable)
// Table: recrutamento
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   nome_candidato: text (not null)
//   vaga: text (not null)
//   status: text (not null)
//   image_gender: text (nullable, default: 'male'::text)
//   vaga_id: uuid (nullable)
//   email: text (nullable)
//   telefone: text (nullable)
//   curriculo_url: text (nullable)
//   organization_id: uuid (nullable)
// Table: vagas
//   id: uuid (not null, default: gen_random_uuid())
//   created_at: timestamp with time zone (not null, default: now())
//   titulo: text (not null)
//   descricao: text (not null)
//   departamento: text (not null)
//   requisitos: text (not null)
//   salario: numeric (not null)
//   tipo_contrato: text (not null)
//   status: text (not null, default: 'Aberta'::text)
//   organization_id: uuid (nullable)

// --- CONSTRAINTS ---
// Table: avaliacoes
//   FOREIGN KEY avaliacoes_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
//   PRIMARY KEY avaliacoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY fk_avaliacoes_avaliador: FOREIGN KEY (avaliador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
//   FOREIGN KEY fk_avaliacoes_colaborador: FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
// Table: colaboradores
//   FOREIGN KEY colaboradores_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
//   PRIMARY KEY colaboradores_pkey: PRIMARY KEY (id)
//   FOREIGN KEY colaboradores_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id)
//   CHECK valid_roles: CHECK ((role = ANY (ARRAY['Admin'::text, 'Gerente'::text, 'Colaborador'::text])))
// Table: ferias
//   FOREIGN KEY ferias_colaborador_id_fkey: FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
//   FOREIGN KEY ferias_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
//   PRIMARY KEY ferias_pkey: PRIMARY KEY (id)
// Table: organizations
//   PRIMARY KEY organizations_pkey: PRIMARY KEY (id)
// Table: ponto
//   FOREIGN KEY ponto_colaborador_id_fkey: FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
//   FOREIGN KEY ponto_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
//   PRIMARY KEY ponto_pkey: PRIMARY KEY (id)
// Table: recrutamento
//   FOREIGN KEY recrutamento_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
//   PRIMARY KEY recrutamento_pkey: PRIMARY KEY (id)
//   FOREIGN KEY recrutamento_vaga_id_fkey: FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE CASCADE
// Table: vagas
//   FOREIGN KEY vagas_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
//   PRIMARY KEY vagas_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: avaliacoes
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: colaboradores
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: ferias
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: organizations
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: ponto
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: recrutamento
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Allow insert to anon users" (INSERT, PERMISSIVE) roles={anon}
//     WITH CHECK: true
// Table: vagas
//   Policy "Allow all access to authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Allow read access to anon users" (SELECT, PERMISSIVE) roles={anon}
//     USING: true

// --- DATABASE FUNCTIONS ---
// FUNCTION auto_confirm_users()
//   CREATE OR REPLACE FUNCTION public.auto_confirm_users()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
//     RETURN NEW;
//   END;
//   $function$
//

// --- INDEXES ---
// Table: colaboradores
//   CREATE INDEX idx_colaboradores_organization_id ON public.colaboradores USING btree (organization_id)
//   CREATE INDEX idx_colaboradores_user_id ON public.colaboradores USING btree (user_id)
