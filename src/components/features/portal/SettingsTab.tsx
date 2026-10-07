"use client";

import type { StoreVisualConfig } from "@/types/store-builder";
import type { TiendaDto } from "@/lib/api/admin";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Store,
  Upload,
  Loader2,
  CreditCard,
  Package,
  Mail,
  ExternalLink
} from "lucide-react";
import {
  getIntegraciones,
  guardarIntegraciones,
  actualizarTiendaInfo,
  actualizarConfiguracionVisual
} from "@/lib/api/admin";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface SettingsTabProps {
  token: string | null;
  esAdmin: boolean;
  activeStore: TiendaDto | null;
  setActiveStore: (store: TiendaDto) => void;
  storeConfig: StoreVisualConfig | null;
  setTiendas: React.Dispatch<React.SetStateAction<TiendaDto[]>>;
}

export function SettingsTab({
  token,
  esAdmin,
  activeStore,
  setActiveStore,
  storeConfig,
  setTiendas
}: SettingsTabProps) {
  const t = useTranslations("Settings");
  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const storeSlug = activeStore?.slug || "";
  const isDevelopment = process.env.NODE_ENV === "development";
  const storePublicUrl = mainDomain
    ? `//${storeSlug}.${mainDomain}/`
    : isDevelopment
      ? `http://${storeSlug}.lvh.me:3000/`
      : `/preview/${storeSlug}`;
  const storePublicLabel = mainDomain
    ? `${storeSlug}.${mainDomain}`
    : isDevelopment
      ? `${storeSlug}.lvh.me:3000`
      : `/preview/${storeSlug}`;

  const [settingsForm, setSettingsForm] = useState({
    stripePublicKey: "",
    stripeSecretKey: "",
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    smtpEmail: "",
    smtpPassword: ""
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [storeForm, setStoreForm] = useState({
    nombre: "",
    slug: "",
    logoUrl: ""
  });
  const [isSavingStoreInfo, setIsSavingStoreInfo] = useState(false);

  const [previousStore, setPreviousStore] = useState<TiendaDto | null>(null);
  if (previousStore !== activeStore) {
    setPreviousStore(activeStore);
    if (activeStore) {
      let config: StoreVisualConfig | null = null;
      if (activeStore.configuracionVisual) {
        try {
          config = typeof activeStore.configuracionVisual === "string"
            ? JSON.parse(activeStore.configuracionVisual)
            : activeStore.configuracionVisual;
        } catch (e) {
          console.error("Error parsing visual config", e);
        }
      }
      let headerSec = null;
      if (config?.pages) {
        const homePage = config.pages.find((p) => p.id === "home") || config.pages[0];
        headerSec = homePage?.sections?.find((s) => s.type === "header");
      } else {
        headerSec = config?.sections?.find((s) => s.type === "header");
      }

      setStoreForm({
        nombre: activeStore.nombre || "",
        slug: activeStore.slug || "",
        logoUrl: headerSec?.properties?.logoUrl || ""
      });
    }
  }

  const [previousToken, setPreviousToken] = useState(token);
  if (previousToken !== token) {
    setPreviousToken(token);
    setLoadingSettings(true);
  }

  useEffect(() => {
    if (token) {
      getIntegraciones(token)
        .then((res) => {
          setSettingsForm({
            stripePublicKey: res.stripePublicKey || "",
            stripeSecretKey: res.stripeSecretKey || "",
            cloudinaryCloudName: res.cloudinaryCloudName || "",
            cloudinaryApiKey: res.cloudinaryApiKey || "",
            cloudinaryApiSecret: res.cloudinaryApiSecret || "",
            smtpEmail: res.smtpEmail || "",
            smtpPassword: res.smtpPassword || ""
          });
        })
        .catch((err) => {
          console.error("Error al obtener integraciones", err);
          toast.error(t("toast_load_integrations_error"));
        })
        .finally(() => setLoadingSettings(false));
    }
  }, [token]);

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeStore) return;

    setIsSavingStoreInfo(true);
    try {
      const normalizedSlug = storeForm.slug.trim().toLowerCase();
      if (!storeForm.nombre.trim()) {
        toast.error(t("toast_store_name_empty"));
        setIsSavingStoreInfo(false);
        return;
      }
      if (!normalizedSlug) {
        toast.error(t("toast_slug_empty"));
        setIsSavingStoreInfo(false);
        return;
      }

      // Validar formato del slug
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(normalizedSlug)) {
        toast.error(t("toast_slug_invalid"));
        setIsSavingStoreInfo(false);
        return;
      }

      const updated = await actualizarTiendaInfo(token, {
        nombre: storeForm.nombre.trim(),
        slug: normalizedSlug
      });

      // Actualizar la configuración visual con el logo y nombre
      let currentConfig: StoreVisualConfig | null = null;
      if (updated.configuracionVisual) {
        try {
          currentConfig = typeof updated.configuracionVisual === "string"
            ? JSON.parse(updated.configuracionVisual)
            : updated.configuracionVisual;
        } catch (e) {
          console.error("Error parsing visual config", e);
        }
      }

      if (!currentConfig || (!currentConfig.sections && !currentConfig.pages)) {
        currentConfig = structuredClone(storeConfig || { sections: [] });
      }

      // Update name and logo in header properties of all pages
      if (currentConfig.pages) {
        currentConfig.pages = currentConfig.pages.map((p) => ({
          ...p,
          sections: (p.sections || []).map((sec) => {
            if (sec.type === "header") {
              return {
                ...sec,
                properties: {
                  ...sec.properties,
                  storeName: storeForm.nombre.trim(),
                  logoUrl: storeForm.logoUrl.trim()
                }
              };
            }
            return sec;
          })
        }));
      }

      // Also update root sections if they exist
      if (currentConfig.sections) {
        currentConfig.sections = currentConfig.sections.map((sec) => {
          if (sec.type === "header") {
            return {
              ...sec,
              properties: {
                ...sec.properties,
                storeName: storeForm.nombre.trim(),
                logoUrl: storeForm.logoUrl.trim()
              }
            };
          }
          return sec;
        });
      }

      const updatedWithVisual = await actualizarConfiguracionVisual(token, currentConfig);

      // Actualizar estados locales
      setActiveStore(updatedWithVisual);
      setTiendas((prev) => prev.map((t) => t.id === updatedWithVisual.id ? updatedWithVisual : t));
      toast.success(t("toast_store_saved"));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast_store_save_error"));
    } finally {
      setIsSavingStoreInfo(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSavingSettings(true);
    try {
      await guardarIntegraciones(token, settingsForm);
      toast.success(t("toast_integrations_saved"));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("toast_integrations_save_error"));
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!esAdmin) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center space-y-3">
        <Store className="mx-auto text-slate-600" size={40} />
        <p className="text-sm text-slate-400">{t("no_permission")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">{t("title")}</h2>
        <p className="text-xs text-slate-400">{t("subtitle")}</p>
      </div>

      {/* Información de la Tienda */}
      <form onSubmit={handleSaveStoreInfo} className="rounded-xl border border-slate-900 bg-slate-950/40 p-6 space-y-4 max-w-2xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900/60 pb-3">
          <Store className="text-[#22D3A6]" size={18} />
          <span>{t("store_info_title")}</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_store_name")}</label>
            <input
              type="text"
              value={storeForm.nombre}
              onChange={(e) => setStoreForm({ ...storeForm, nombre: e.target.value })}
              className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_slug")}</label>
            <input
              type="text"
              value={storeForm.slug}
              onChange={(e) => setStoreForm({ ...storeForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-[#22D3A6] text-xs font-mono font-semibold outline-none focus:border-[#22D3A6] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">{t("field_logo_url")}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t("field_logo_placeholder")}
                value={storeForm.logoUrl || ""}
                onChange={(e) => setStoreForm({ ...storeForm, logoUrl: e.target.value })}
                className="flex-1 h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
              />
              {settingsForm.cloudinaryCloudName && settingsForm.cloudinaryApiKey && settingsForm.cloudinaryApiSecret && (
                <label className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700 shrink-0">
                  <Upload size={14} />
                  <span>{t("upload_logo_button")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          toast.loading(t("toast_uploading_logo"));
                          const url = await uploadToCloudinary(file, token ?? "");
                          setStoreForm(prev => ({ ...prev, logoUrl: url }));
                          toast.dismiss();
                          toast.success(t("toast_logo_uploaded"));
                        } catch (err) {
                          toast.dismiss();
                          toast.error(err instanceof Error ? err.message : t("toast_logo_error"));
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("store_link_label")}</span>
            {activeStore?.slug ? (
              <a
                href={`https://${activeStore.slug}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "dmhub.fun"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#22D3A6] hover:text-[#1ebda1] hover:underline bg-slate-900/60 px-3 py-2 rounded-lg truncate w-fit font-mono text-xs flex items-center gap-2 border border-slate-800"
              >
                <span>{`https://${activeStore.slug}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "dmhub.fun"}`}</span>
                <ExternalLink size={13} />
              </a>
            ) : (
              <span className="text-slate-500 italic text-xs">{t("no_subdomain")}</span>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSavingStoreInfo}
            className="h-9 px-4 rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingStoreInfo && <Loader2 className="animate-spin" size={14} />}
            <span>{t("save_store_button")}</span>
          </button>
        </div>
      </form>

      {loadingSettings ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          {/* Stripe Keys */}
          <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <CreditCard className="text-[#38BDF8]" size={18} />
              <span>{t("stripe_section_title")}</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_stripe_public")}</label>
                <input
                  type="text"
                  placeholder="pk_test_..."
                  value={settingsForm.stripePublicKey}
                  onChange={(e) => setSettingsForm({ ...settingsForm, stripePublicKey: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_stripe_secret")}</label>
                <input
                  type="password"
                  placeholder="sk_test_..."
                  value={settingsForm.stripeSecretKey}
                  onChange={(e) => setSettingsForm({ ...settingsForm, stripeSecretKey: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Cloudinary Keys */}
          <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <Package className="text-[#A78BFA]" size={18} />
              <span>{t("cloudinary_section_title")}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_cloudinary_cloud_name")}</label>
                <input
                  type="text"
                  placeholder={t("field_cloudinary_cloud_name_placeholder")}
                  value={settingsForm.cloudinaryCloudName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cloudinaryCloudName: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_cloudinary_api_key")}</label>
                <input
                  type="text"
                  placeholder={t("field_cloudinary_api_key_placeholder")}
                  value={settingsForm.cloudinaryApiKey}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cloudinaryApiKey: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_cloudinary_api_secret")}</label>
                <input
                  type="password"
                  placeholder={t("field_cloudinary_api_secret_placeholder")}
                  value={settingsForm.cloudinaryApiSecret}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cloudinaryApiSecret: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
            </div>
          </div>

          {/* SMTP Credentials */}
          <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <Mail className="text-[#38BDF8]" size={18} />
              <span>{t("smtp_section_title")}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_smtp_email")}</label>
                <input
                  type="email"
                  placeholder={t("field_smtp_email_placeholder")}
                  value={settingsForm.smtpEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtpEmail: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("field_smtp_password")}</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={settingsForm.smtpPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtpPassword: e.target.value })}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  {t("smtp_note_prefix")} <strong>{t("field_smtp_password")}</strong>. {t("smtp_note_suffix")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="h-11 px-6 rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>{t("saving_label")}</span>
                </>
              ) : (
                <span>{t("save_config_button")}</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
