"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mail, Users, X, AlertTriangle, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { PortalModal } from "@/components/ui/PortalModal";
import {
  invitarPlatformUsuario,
  cambiarRolPlatformUsuario,
  cambiarEstadoPlatformUsuario,
  eliminarPlatformUsuario,
  type PlatformUsuarioDto,
  type SucursalDto,
} from "@/lib/api/admin";
import { adminResetPassword } from "@/lib/api/auth";

interface UsuariosTabProps {
  token: string;
  usuarios: PlatformUsuarioDto[];
  loadingUsuarios: boolean;
  sucursales: SucursalDto[];
  usuario: import("@/stores/useAuthStore").TUsuario;
  esAdmin: boolean;
  onRefresh: () => void;
}

export function UsuariosTab({
  token,
  usuarios,
  loadingUsuarios,
  sucursales,
  usuario,
  esAdmin,
  onRefresh,
}: UsuariosTabProps) {
  const t = useTranslations("Usuarios");
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isChangeRolModalOpen, setIsChangeRolModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  // Selected user for edits
  const [selectedUsuario, setSelectedUsuario] = useState<PlatformUsuarioDto | null>(null);
  const [resetPasswordUsuario, setResetPasswordUsuario] = useState<PlatformUsuarioDto | null>(null);

  // Reset codes state
  const [resetCodes, setResetCodes] = useState<string[]>([]);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // Forms
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    tipoUsuario: "staff",
    rolStaff: "cajero",
    contrasena: "",
    sucursalId: "",
  });

  const [changeRolForm, setChangeRolForm] = useState({
    tipoUsuario: "cliente",
    rolStaff: "cajero",
    sucursalId: "",
  });

  // Load staff list
  const staffUsuarios = usuarios.filter(
    (u) => u.tipoUsuario === "staff" || u.tipoUsuario === "administrador"
  );

  // Fallback active user if not in backend list yet
  if (usuario && !staffUsuarios.some((u) => u.email === usuario.correo)) {
    staffUsuarios.push({
      id: usuario.usuarioId,
      name: usuario.nombre,
      email: usuario.correo,
      emailVerified: true,
      image: null,
      tipoUsuario: "staff",
      rolStaff: usuario.rol === "admin" ? "administrador" : usuario.rol,
      estado: true,
      createdAt: new Date().toISOString(),
      sucursalId: null,
      sucursalNombre: null,
    });
  }

  const handleOpenInviteModal = () => {
    setInviteForm({
      email: "",
      name: "",
      tipoUsuario: "staff",
      rolStaff: "cajero",
      contrasena: "",
      sucursalId: "",
    });
    setIsInviteModalOpen(true);
  };

  const handleInviteUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const payload = {
        email: inviteForm.email,
        name: inviteForm.name,
        contrasena: inviteForm.contrasena || undefined,
        tipoUsuario: inviteForm.tipoUsuario,
        rolStaff: inviteForm.tipoUsuario === "staff" ? inviteForm.rolStaff : undefined,
        sucursalId:
          inviteForm.tipoUsuario === "staff" && inviteForm.sucursalId
            ? inviteForm.sucursalId
            : null,
      };
      await invitarPlatformUsuario(token, payload);
      toast.success(t("toast_registered"));
      setIsInviteModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_register_error"));
    }
  };

  const handleOpenChangeRolModal = (u: PlatformUsuarioDto) => {
    setSelectedUsuario(u);
    setChangeRolForm({
      tipoUsuario: u.tipoUsuario,
      rolStaff: u.rolStaff || "cajero",
      sucursalId: u.sucursalId || "",
    });
    setIsChangeRolModalOpen(true);
  };

  const handleChangeRolUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUsuario) return;

    try {
      const payload = {
        tipoUsuario: changeRolForm.tipoUsuario,
        rolStaff: changeRolForm.tipoUsuario === "staff" ? changeRolForm.rolStaff : undefined,
        sucursalId:
          changeRolForm.tipoUsuario === "staff" && changeRolForm.sucursalId
            ? changeRolForm.sucursalId
            : null,
      };
      await cambiarRolPlatformUsuario(token, selectedUsuario.id, payload);
      toast.success(t("toast_role_updated"));
      setIsChangeRolModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_role_error"));
    }
  };

  const handleToggleEstadoUsuario = async (u: PlatformUsuarioDto) => {
    if (!token) return;

    try {
      const updated = await cambiarEstadoPlatformUsuario(token, u.id, !u.estado);
      toast.success(
        t("toast_status_changed", {
          status: updated.estado ? t("status_activated") : t("status_deactivated"),
        })
      );
      onRefresh();
    } catch (err) {
      toast.error(t("toast_status_error"));
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!window.confirm(t("confirm_delete")))
      return;

    try {
      await eliminarPlatformUsuario(token, id);
      toast.success(t("toast_deleted"));
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_delete_error"));
    }
  };

  const handleOpenResetPasswordModal = (u: PlatformUsuarioDto) => {
    setResetPasswordUsuario(u);
    setResetCodes([]);
    setIsResetPasswordModalOpen(true);
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!token || !resetPasswordUsuario) return;
    setIsGeneratingCodes(true);
    try {
      const result = await adminResetPassword(resetPasswordUsuario.id, token);
      setResetCodes(result.codigos);

      // Auto-download the .txt file
      const now = new Date().toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
      const contenido = [
        t("file_header"),
        "",
        t("file_user_label", { name: result.nombre }),
        t("file_email_label", { email: result.correo }),
        t("file_generated_label", { date: now }),
        "",
        t("file_instructions_title"),
        t("file_instr1"),
        t("file_instr2"),
        t("file_instr3"),
        t("file_instr4"),
        t("file_instr5"),
        "",
        t("file_codes_header"),
        ...result.codigos.map((c, i) => `  ${i + 1}. ${c}`),
        "",
        t("file_warning1"),
        t("file_warning2"),
      ].join("\n");

      const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `codigos-recuperacion-${result.correo.replace(/@.*/, "")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("toast_codes_generated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_reset_error"));
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">{t("title")}</h2>
          <p className="text-xs text-slate-400">
            {t("subtitle")}
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={handleOpenInviteModal}
            className="h-10 px-4 rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none"
          >
            <Mail size={16} />
            <span>{t("invite_button")}</span>
          </button>
        )}
      </div>

      {loadingUsuarios ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        </div>
      ) : staffUsuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <Users className="mx-auto text-slate-600" size={40} />
          <p className="text-sm text-slate-400">{t("empty_state")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-4">{t("table_collaborator")}</th>
                  <th className="p-4">{t("table_email")}</th>
                  <th className="p-4">{t("table_staff_role")}</th>
                  <th className="p-4">{t("table_status")}</th>
                  {esAdmin && <th className="p-4 text-right">{t("table_actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {staffUsuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-900/55 hover:bg-slate-950/30 transition-all"
                  >
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-[#38BDF8]">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">{u.name}</span>
                    </td>
                    <td className="p-4 text-slate-300">{u.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#38BDF8]/10 text-[#38BDF8] text-[9px] font-black uppercase tracking-wider">
                        {u.rolStaff || t("default_role_cajero")}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        disabled={!esAdmin}
                        onClick={() => handleToggleEstadoUsuario(u)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider cursor-pointer border-none ${
                          u.estado ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {u.estado ? t("status_active") : t("status_suspended")}
                      </button>
                    </td>
                    {esAdmin && (
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenChangeRolModal(u)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[#38BDF8] cursor-pointer border-none text-[10px] font-bold"
                          title={t("action_edit_permissions_tooltip")}
                        >
                          {t("action_edit_permissions")}
                        </button>
                        <button
                          onClick={() => handleOpenResetPasswordModal(u)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-amber-950/40 text-amber-400 cursor-pointer border-none text-[10px] font-bold"
                          title={t("action_reset_password_tooltip")}
                        >
                          {t("action_reset_password")}
                        </button>
                        {usuario?.correo !== u.email && (
                          <button
                            onClick={() => handleDeleteUsuario(u.id)}
                            className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/30 text-rose-400 cursor-pointer border-none text-[10px] font-bold"
                            title={t("action_delete_tooltip")}
                          >
                            {t("action_delete")}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVITE USER MODAL */}
      {isInviteModalOpen && (
        <PortalModal onClose={() => setIsInviteModalOpen(false)} ariaLabel={t("aria_invite")}>
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{t("invite_modal_title")}</h3>
              <p className="text-xs text-slate-400">{t("invite_modal_subtitle")}</p>
            </div>

            <form onSubmit={handleInviteUsuario} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_full_name")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("field_full_name_placeholder")}
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8] focus:ring-1"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_email")}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t("field_email_placeholder")}
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8] focus:ring-1"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_initial_password")}
                </label>
                <input
                  type="password"
                  placeholder={t("field_initial_password_placeholder")}
                  value={inviteForm.contrasena}
                  onChange={(e) => setInviteForm({ ...inviteForm, contrasena: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8] focus:ring-1"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_user_type")}
                </label>
                <select
                  value={inviteForm.tipoUsuario}
                  onChange={(e) => setInviteForm({ ...inviteForm, tipoUsuario: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                >
                  <option value="staff">{t("option_staff")}</option>
                  <option value="cliente">{t("option_client")}</option>
                </select>
              </div>

              {inviteForm.tipoUsuario === "staff" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t("field_staff_role")}
                    </label>
                    <select
                      value={inviteForm.rolStaff}
                      onChange={(e) => setInviteForm({ ...inviteForm, rolStaff: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                    >
                      <option value="cajero">{t("option_cajero")}</option>
                      <option value="administrador">{t("option_administrador")}</option>
                      <option value="superadmin">{t("option_superadmin")}</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t("field_branch")}
                    </label>
                    <select
                      value={inviteForm.sucursalId}
                      onChange={(e) => setInviteForm({ ...inviteForm, sucursalId: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                    >
                      <option value="">{t("option_no_branch")}</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <span>{t("add_user_button")}</span>
              </button>
            </form>
          </div>
        </PortalModal>
      )}

      {/* CHANGE ROLE MODAL */}
      {isChangeRolModalOpen && (
        <PortalModal onClose={() => setIsChangeRolModalOpen(false)} ariaLabel={t("aria_change_role")}>
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsChangeRolModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{t("change_role_title")}</h3>
              <p className="text-xs text-slate-400">{t("change_role_subtitle", { name: selectedUsuario?.name ?? "" })}</p>
            </div>

            <form onSubmit={handleChangeRolUsuario} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_user_type")}
                </label>
                <select
                  value={changeRolForm.tipoUsuario}
                  onChange={(e) => setChangeRolForm({ ...changeRolForm, tipoUsuario: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                >
                  <option value="cliente">{t("option_client")}</option>
                  <option value="staff">{t("option_staff")}</option>
                </select>
              </div>

              {changeRolForm.tipoUsuario === "staff" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t("field_staff_role")}
                    </label>
                    <select
                      value={changeRolForm.rolStaff}
                      onChange={(e) => setChangeRolForm({ ...changeRolForm, rolStaff: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                    >
                      <option value="cajero">{t("option_cajero")}</option>
                      <option value="administrador">{t("option_administrador")}</option>
                      <option value="superadmin">{t("option_superadmin")}</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t("field_branch")}
                    </label>
                    <select
                      value={changeRolForm.sucursalId}
                      onChange={(e) => setChangeRolForm({ ...changeRolForm, sucursalId: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                    >
                      <option value="">{t("option_no_branch")}</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <span>{t("save_permissions_button")}</span>
              </button>
            </form>
          </div>
        </PortalModal>
      )}

      {/* REESTABLECER CONTRASEÑA MODAL */}
      {isResetPasswordModalOpen && (
        <PortalModal onClose={() => setIsResetPasswordModalOpen(false)} ariaLabel={t("aria_reset_password")}>
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsResetPasswordModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{t("reset_password_title")}</h3>
              <p className="text-xs text-slate-400">
                {t("reset_password_subtitle", { name: resetPasswordUsuario?.name ?? "" })}
              </p>
            </div>

            {resetCodes.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 text-xs text-amber-300 leading-relaxed space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle size={14} />
                    <span>{t("important_label")}</span>
                  </p>
                  <p>{t("warning_p1")}</p>
                  <p>
                    {t("warning_p2")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateRecoveryCodes}
                  disabled={isGeneratingCodes}
                  className="h-11 w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  {isGeneratingCodes ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t("generating_codes")}</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>{t("generate_codes_button")}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-950/40 bg-emerald-950/20 text-xs text-emerald-400 leading-relaxed space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Check size={14} />
                    <span>{t("codes_generated_title")}</span>
                  </p>
                  <p>{t("codes_generated_desc")}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("recovery_codes_label")}
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-100 select-all max-h-40 overflow-y-auto">
                    {resetCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-955 px-2.5 py-1.5 rounded-lg border border-slate-900"
                      >
                        <span className="text-slate-400 text-[10px] font-bold">{idx + 1}.</span>
                        <span className="font-bold text-white tracking-wide">{code}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500">
                    {t("drag_select_hint")}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateRecoveryCodes}
                    className="h-11 px-4 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download size={15} />
                    <span>{t("download_again_button")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="h-11 flex-1 rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
                  >
                    <span>{t("done_close_button")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </PortalModal>
      )}
    </div>
  );
}
