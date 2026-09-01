import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FieldProps {
  label: string;
  value: string;
  disabledTone?: boolean;
}

function Field({ label, value, disabledTone = false }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300">
        {label}
      </label>
      <input
        value={value}
        disabled
        className={`w-full px-4 py-3 rounded-xl bg-[#0f1318] border border-gray-700 text-white text-sm focus:outline-none ${
          disabledTone ? "opacity-40" : ""
        }`}
      />
    </div>
  );
}

export function UserProfile() {
  const navigate = useNavigate();

  const user = {
    fullName: "João Silva Santos",
    email: "joao.silva@email.com",
    phone: "(11) 99999-9999",
    address: "Rua das Flores, 123 - São Paulo, SP",
    cpf: "123.456.789-00",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex-1 flex items-start justify-center min-h-0">
        <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#0b1220] p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Perfil do Usuário</h2>
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              aria-label="Fechar"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            <Field label="Nome Completo" value={user.fullName} />
            <Field label="Email" value={user.email} />
            <Field label="Telefone" value={user.phone} />
            <Field label="Endereço" value={user.address} />
            <Field label="CPF" value={user.cpf} disabledTone />
          </div>
        </div>
      </div>
    </div>
  );
}
