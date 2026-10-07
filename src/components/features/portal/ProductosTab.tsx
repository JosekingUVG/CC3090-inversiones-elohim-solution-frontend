"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Upload, Plus, Loader2, Package, Eye, EyeOff, Edit, Trash2, X, Download, FileText, Grid, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PortalModal } from "@/components/ui/PortalModal";
import * as XLSX from "xlsx";
import { uploadToCloudinary } from "@/lib/cloudinary";
import ProductSpreadsheetEditor from "./ProductSpreadsheetEditor";
import {
  crearPlatformProducto,
  crearPlatformProductosBulk,
  actualizarPlatformProducto,
  eliminarPlatformProducto,
  type PlatformProductoDto,
  type SucursalDto,
  type CrearPlatformProductoBulkInput,
} from "@/lib/api/admin";
import type { TCategoria } from "@/types";

interface ProductosTabProps {
  token: string;
  productos: PlatformProductoDto[];
  loadingProductos: boolean;
  categorias: TCategoria[];
  sucursales: SucursalDto[];
  esAdmin: boolean;
  hasCloudinary: boolean;
  onRefresh: () => void;
}

export function ProductosTab({
  token,
  productos,
  loadingProductos,
  categorias,
  sucursales,
  esAdmin,
  hasCloudinary,
  onRefresh,
}: ProductosTabProps) {
  const t = useTranslations("Productos");
  // Search queries
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Modals
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isColumnMappingModalOpen, setIsColumnMappingModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<"excel" | "spreadsheet">("excel");

  // Edits
  const [selectedProducto, setSelectedProducto] = useState<PlatformProductoDto | null>(null);
  const [parsedProducts, setParsedProducts] = useState<CrearPlatformProductoBulkInput[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, unknown>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // Column mapping
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    nombre: "",
    precioDetalle: "",
    precioMayoreo: "",
    sku: "",
    stockActual: "",
    descripcion: "",
    categoriaId: "",
    imagenUrl: "",
    stockMinimo: "",
  });

  // Form
  const [productoForm, setProductoForm] = useState({
    nombre: "",
    precioMayoreo: 0,
    precioDetalle: 0,
    categoriaId: "",
    categoriaBuscada: "",
    sku: "",
    descripcion: "",
    imagenUrl: "",
    publicado: true,
    stockMinimo: 0,
  });

  const [stockSucursalesMap, setStockSucursalesMap] = useState<Record<string, number>>({});
  const [mostrarDropdownCategorias, setMostrarDropdownCategorias] = useState(false);

  const handleOpenProductoModal = (prod: PlatformProductoDto | null = null) => {
    if (prod) {
      setSelectedProducto(prod);
      setProductoForm({
        nombre: prod.nombre,
        precioMayoreo: prod.precioMayoreo,
        precioDetalle: prod.precioDetalle,
        categoriaId: prod.categoriaId ?? "",
        categoriaBuscada: categorias.find(c => c.id === prod.categoriaId)?.nombreCategoria ?? prod.categoriaId ?? "",
        sku: prod.sku ?? "",
        descripcion: prod.descripcion ?? "",
        imagenUrl: prod.imagenUrl ?? "",
        publicado: prod.publicado,
        stockMinimo: prod.stockMinimo,
      });
      const map: Record<string, number> = {};
      prod.inventarios?.forEach((i) => {
        map[i.sucursalId] = i.stock;
      });
      setStockSucursalesMap(map);
    } else {
      setSelectedProducto(null);
      setProductoForm({
        nombre: "",
        precioMayoreo: 0,
        precioDetalle: 0,
        categoriaId: "",
        categoriaBuscada: "",
        sku: "",
        descripcion: "",
        imagenUrl: "",
        publicado: true,
        stockMinimo: 0,
      });
      setStockSucursalesMap({});
    }
    setIsProductoModalOpen(true);
  };

  const handleSubmitProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const stockSucursales = Object.entries(stockSucursalesMap).map(([sucursalId, stock]) => ({
      sucursalId,
      stock: Number(stock) || 0,
    }));

    const payload = {
      nombre: productoForm.nombre,
      precioMayoreo: Number(productoForm.precioMayoreo),
      precioDetalle: Number(productoForm.precioDetalle),
      categoriaId: productoForm.categoriaId || null,
      sku: productoForm.sku || null,
      descripcion: productoForm.descripcion || null,
      imagenUrl: productoForm.imagenUrl || null,
      publicado: productoForm.publicado,
      stockMinimo: Number(productoForm.stockMinimo) || 0,
      stockSucursales,
    };

    try {
      if (selectedProducto) {
        await actualizarPlatformProducto(token, selectedProducto.id, payload);
        toast.success(t("toast_updated"));
      } else {
        await crearPlatformProducto(token, payload);
        toast.success(t("toast_created"));
      }
      setIsProductoModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(t("toast_save_error"));
    }
  };

  const handleTogglePublicadoProducto = async (prod: PlatformProductoDto) => {
    if (!token) return;

    try {
      const payload = {
        nombre: prod.nombre,
        precioMayoreo: prod.precioMayoreo,
        precioDetalle: prod.precioDetalle,
        categoriaId: prod.categoriaId,
        sku: prod.sku,
        descripcion: prod.descripcion,
        imagenUrl: prod.imagenUrl,
        publicado: !prod.publicado,
      };
      const updated = await actualizarPlatformProducto(token, prod.id, payload);
      toast.success(t("toast_visibility_changed", { status: updated.publicado ? t("visible") : t("hidden") }));
      onRefresh();
    } catch (err) {
      toast.error(t("toast_visibility_error"));
    }
  };

  const handleDeleteProducto = async (id: string) => {
    if (!token || !window.confirm(t("toast_delete_confirm"))) return;

    try {
      await eliminarPlatformProducto(token, id);
      toast.success(t("toast_deleted"));
      onRefresh();
    } catch (err) {
      toast.error(t("toast_delete_error"));
    }
  };

  // Import Excel templates
  const downloadTemplate = (format: "csv" | "xlsx") => {
    const templateData = [
      {
        Nombre: "Producto Ejemplo 1",
        Descripcion: "Descripción detallada del producto ejemplo 1",
        Sku: "SKU-EJEMPLO-01",
        PrecioDetalle: 120.5,
        PrecioMayoreo: 95.0,
        StockActual: 50,
        StockMinimo: 5,
        CategoriaId: "",
        Publicado: true,
        ImagenUrl: "https://ejemplo.com/imagen.jpg",
      },
      {
        Nombre: "Producto Ejemplo 2",
        Descripcion: "Descripción detallada del producto ejemplo 2",
        Sku: "SKU-EJEMPLO-02",
        PrecioDetalle: 45.0,
        PrecioMayoreo: 35.0,
        StockActual: 100,
        StockMinimo: 10,
        CategoriaId: "",
        Publicado: false,
        ImagenUrl: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Productos");
    XLSX.writeFile(workbook, `plantilla_importacion_productos.${format}`, {
      bookType: format === "xlsx" ? "xlsx" : "csv",
    });
    toast.success(t("toast_template_downloaded", { format: format.toUpperCase() }));
  };

  const parseRowsWithMapping = (rows: Record<string, unknown>[], mapping: Record<string, string>): CrearPlatformProductoBulkInput[] => {
    return rows.map((row, index) => {
      const getValue = (fieldKey: string) => {
        const colName = mapping[fieldKey];
        if (colName && colName in row) return row[colName];
        return undefined;
      };

      const rawNombre = getValue("nombre") ?? row.Nombre ?? row.nombre ?? row.Producto ?? row.producto ?? row.Name ?? row.name;
      const nombre = String(rawNombre || "").trim();
      if (!nombre) {
        throw new Error(t("err_name_required", { row: index + 2 }));
      }

      const rawPrecioDetalle = getValue("precioDetalle") ?? row.PrecioDetalle ?? row.precioDetalle ?? row.Precio ?? row.precio ?? row.Price ?? row.price;
      const precioDetalle = parseFloat(String(rawPrecioDetalle));
      if (isNaN(precioDetalle) || precioDetalle < 0) {
        throw new Error(t("err_invalid_price", { row: index + 2, name: nombre }));
      }

      const rawPrecioMayoreo = getValue("precioMayoreo") ?? row.PrecioMayoreo ?? row.precioMayoreo ?? row.Mayoreo ?? row.mayoreo;
      let precioMayoreo = parseFloat(String(rawPrecioMayoreo));
      if (isNaN(precioMayoreo) || precioMayoreo < 0) {
        precioMayoreo = precioDetalle;
      }

      const rawStockActual = getValue("stockActual") ?? row.StockActual ?? row.stockActual ?? row.Stock ?? row.stock;
      const stockActual = parseInt(String(rawStockActual || "0"), 10);

      const rawStockMinimo = getValue("stockMinimo") ?? row.StockMinimo ?? row.stockMinimo;
      const stockMinimo = parseInt(String(rawStockMinimo || "0"), 10);

      const rawSku = getValue("sku") ?? row.Sku ?? row.sku ?? row.SKU ?? row.Codigo ?? row.codigo;
      const sku = rawSku ? String(rawSku).trim() : null;

      const rawDescripcion = getValue("descripcion") ?? row.Descripcion ?? row.descripcion ?? row.Descripción;
      const descripcion = rawDescripcion ? String(rawDescripcion).trim() : null;

      const rawImagen = getValue("imagenUrl") ?? row.ImagenUrl ?? row.imagenUrl ?? row.Imagen ?? row.imagen;
      const imagenUrl = rawImagen ? String(rawImagen).trim() : null;

      const rawCat = getValue("categoriaId") ?? row.CategoriaId ?? row.categoriaId ?? row.Categoria ?? row.categoria;
      let categoriaId: string | null = null;
      if (rawCat) {
        const strCat = String(rawCat).trim();
        const match = categorias.find(
          (c) =>
            c.id === strCat ||
            (c.nombreCategoria && c.nombreCategoria.toLowerCase() === strCat.toLowerCase())
        );
        categoriaId = match ? match.id : strCat;
      }

      const rawPublicado = getValue("publicado") ?? row.Publicado ?? row.publicado;
      const publicado =
        rawPublicado === undefined
          ? true
          : String(rawPublicado).toLowerCase() === "true" ||
            rawPublicado === true ||
            rawPublicado === 1;

      return {
        nombre,
        descripcion,
        sku,
        precioDetalle,
        precioMayoreo,
        stockActual: isNaN(stockActual) ? 0 : Math.max(0, stockActual),
        stockMinimo: isNaN(stockMinimo) ? 0 : Math.max(0, stockMinimo),
        categoriaId,
        publicado,
        imagenUrl,
      };
    });
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (json.length === 0) {
          toast.error(t("toast_empty_file"));
          return;
        }

        const detectedCols = Object.keys(json[0]);
        setDetectedColumns(detectedCols);
        setRawExcelRows(json);

        // Auto-guess column mapping
        const guessedMapping: Record<string, string> = {
          nombre: detectedCols.find((c) => /nombre|producto|name|titulo/i.test(c)) || "",
          precioDetalle: detectedCols.find((c) => /precio.*det|precio|price/i.test(c)) || "",
          precioMayoreo: detectedCols.find((c) => /mayoreo|mayorista/i.test(c)) || "",
          sku: detectedCols.find((c) => /sku|codigo|code/i.test(c)) || "",
          stockActual: detectedCols.find((c) => /stock.*act|stock|cantidad/i.test(c)) || "",
          stockMinimo: detectedCols.find((c) => /stock.*min|min/i.test(c)) || "",
          descripcion: detectedCols.find((c) => /descrip/i.test(c)) || "",
          categoriaId: detectedCols.find((c) => /cat/i.test(c)) || "",
          imagenUrl: detectedCols.find((c) => /img|imagen|image/i.test(c)) || "",
        };

        setColumnMapping(guessedMapping);

        const productsToCreate = parseRowsWithMapping(json, guessedMapping);
        setParsedProducts(productsToCreate);
        toast.success(t("toast_file_loaded", { count: productsToCreate.length }));
      } catch (err) {
        toast.error((err instanceof Error ? err.message : "") || t("toast_file_process_error"));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!token || parsedProducts.length === 0) return;

    setIsImporting(true);
    try {
      const result = await crearPlatformProductosBulk(token, parsedProducts);
      const count = result?.length || parsedProducts.length;
      toast.success(t("toast_bulk_success", { count }));
      setIsImportModalOpen(false);
      setParsedProducts([]);
      setRawExcelRows([]);
      onRefresh();
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "") || t("toast_bulk_error"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{t("title")}</h2>
          <p className="text-xs text-slate-400">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder={t("search_placeholder")}
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="h-9 w-full pl-9 pr-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs placeholder:text-slate-500 text-slate-100 outline-none focus:border-[#22D3A6]/40"
            />
          </div>
          {esAdmin && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="h-9 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-750 shrink-0"
              >
                <Upload size={16} />
                <span>{t("import_button")}</span>
              </button>
              <button
                onClick={() => handleOpenProductoModal()}
                className="h-9 px-4 rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none shrink-0"
              >
                <Plus size={16} />
                <span>{t("new_button")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loadingProductos ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        </div>
      ) : productos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <Package className="mx-auto text-slate-600" size={40} />
          <p className="text-sm text-slate-400">{t("empty_state")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-4">{t("table_name")}</th>
                  <th className="p-4">{t("table_sku")}</th>
                  <th className="p-4">{t("table_price_detail")}</th>
                  <th className="p-4">{t("table_price_wholesale")}</th>
                  <th className="p-4 text-center">{t("table_stock_total")}</th>
                  <th className="p-4">{t("table_published")}</th>
                  {esAdmin && <th className="p-4 text-right">{t("table_actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {productos
                  .filter(
                    (p) =>
                      p.nombre.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                      (p.sku && p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()))
                  )
                  .map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-900/55 hover:bg-slate-950/30 transition-all"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {p.imagenUrl ? (
                            <img
                              src={p.imagenUrl}
                              alt={p.nombre}
                              className="h-8 w-8 rounded bg-slate-900 object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-900 flex items-center justify-center text-slate-600">
                              <Package size={14} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-xs leading-tight">{p.nombre}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{p.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{p.sku || "—"}</td>
                      <td className="p-4 text-white font-semibold">Q{p.precioDetalle.toFixed(2)}</td>
                      <td className="p-4 text-slate-350">Q{p.precioMayoreo.toFixed(2)}</td>
                      <td className="p-4 text-center font-bold text-[#38BDF8]">{t("stock_units", { count: p.stockTotal })}</td>
                      <td className="p-4">
                        <button
                          disabled={!esAdmin}
                          onClick={() => handleTogglePublicadoProducto(p)}
                          className={`p-1.5 rounded-lg transition-all border-none bg-transparent cursor-pointer ${
                            p.publicado ? "text-[#22D3A6] hover:text-[#22D3A6]/70" : "text-slate-600 hover:text-slate-400"
                          }`}
                        >
                          {p.publicado ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </td>
                      {esAdmin && (
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenProductoModal(p)}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer border-none"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteProducto(p.id)}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer border-none"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {isProductoModalOpen && (
        <PortalModal onClose={() => setIsProductoModalOpen(false)} ariaLabel={selectedProducto ? t("aria_edit") : t("aria_add")}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 my-8 relative animate-fade-in">
            <button
              onClick={() => setIsProductoModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {selectedProducto ? t("modal_edit_title") : t("modal_add_title")}
              </h3>
              <p className="text-xs text-slate-400">{t("modal_subtitle")}</p>
            </div>

            <form onSubmit={handleSubmitProducto} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("field_name_label")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("field_name_placeholder")}
                    value={productoForm.nombre}
                    onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("field_sku_label")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("field_sku_placeholder")}
                    value={productoForm.sku}
                    onChange={(e) => setProductoForm({ ...productoForm, sku: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("field_price_detail_label")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productoForm.precioDetalle || ""}
                    onChange={(e) => setProductoForm({ ...productoForm, precioDetalle: Number(e.target.value) })}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("field_price_wholesale_label")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productoForm.precioMayoreo || ""}
                    onChange={(e) => setProductoForm({ ...productoForm, precioMayoreo: Number(e.target.value) })}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("field_category_label")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("field_category_placeholder")}
                    value={productoForm.categoriaBuscada}
                    onChange={(e) => {
                      setProductoForm({ ...productoForm, categoriaBuscada: e.target.value });
                      setMostrarDropdownCategorias(true);
                    }}
                    onFocus={() => setMostrarDropdownCategorias(true)}
                    onBlur={() => {
                      setTimeout(() => setMostrarDropdownCategorias(false), 200);
                    }}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                  {mostrarDropdownCategorias && productoForm.categoriaBuscada && categorias.filter(cat => cat.nombreCategoria.toLowerCase().includes(productoForm.categoriaBuscada.toLowerCase())).length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg z-50 max-h-40 overflow-y-auto shadow-lg">
                      {categorias
                        .filter(cat => cat.nombreCategoria.toLowerCase().includes(productoForm.categoriaBuscada.toLowerCase()))
                        .map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setProductoForm({
                                ...productoForm,
                                categoriaBuscada: cat.nombreCategoria,
                                categoriaId: cat.id,
                              });
                              setMostrarDropdownCategorias(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition-all border-none bg-transparent cursor-pointer"
                          >
                            {cat.nombreCategoria}
                          </button>
                        ))}
                    </div>
                  )}
                  {productoForm.categoriaBuscada && !categorias.some(c => c.nombreCategoria.toLowerCase() === productoForm.categoriaBuscada.toLowerCase()) && (
                    <p className="text-[10px] text-slate-400 mt-1">{t("category_custom_hint")}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("field_min_stock_label")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={t("field_min_stock_placeholder")}
                    value={productoForm.stockMinimo || 0}
                    onChange={(e) => setProductoForm({ ...productoForm, stockMinimo: Number(e.target.value) })}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_image_label")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("field_image_placeholder")}
                    value={productoForm.imagenUrl}
                    onChange={(e) => setProductoForm({ ...productoForm, imagenUrl: e.target.value })}
                    className="flex-1 h-10 rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8]"
                  />
                  {hasCloudinary && (
                    <label className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700 shrink-0">
                      <Upload size={14} />
                      <span>{t("upload_button")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              toast.loading(t("toast_uploading_image"));
                              const url = await uploadToCloudinary(file, token);
                              setProductoForm((prev) => ({ ...prev, imagenUrl: url }));
                              toast.dismiss();
                              toast.success(t("toast_image_uploaded"));
                            } catch (err) {
                              toast.dismiss();
                              toast.error(err instanceof Error ? err.message : t("toast_image_error"));
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("field_description_label")}
                </label>
                <textarea
                  placeholder={t("field_description_placeholder")}
                  value={productoForm.descripcion}
                  onChange={(e) => setProductoForm({ ...productoForm, descripcion: e.target.value })}
                  className="h-20 w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8] resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("stock_by_branch_label")}
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border border-slate-800 bg-slate-900/40 p-3 rounded-lg">
                  {sucursales.map((suc) => (
                    <div key={suc.id} className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">{suc.nombre}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={stockSucursalesMap[suc.id] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          setStockSucursalesMap({
                            ...stockSucursalesMap,
                            [suc.id]: val,
                          });
                        }}
                        className="h-8 w-24 rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-100 outline-none text-right focus:border-[#38BDF8]"
                      />
                    </div>
                  ))}
                  {sucursales.length === 0 && (
                    <p className="text-xs text-slate-500 italic">{t("no_branches")}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="prod-publicado"
                  checked={productoForm.publicado}
                  onChange={(e) => setProductoForm({ ...productoForm, publicado: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-[#22D3A6] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="prod-publicado" className="text-xs text-slate-350 cursor-pointer select-none">
                  {t("publish_checkbox_label")}
                </label>
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <span>{t("save_button")}</span>
              </button>
            </form>
          </div>
        </PortalModal>
      )}

      {/* BULK PRODUCT IMPORT MODAL */}
      {isImportModalOpen && (
        <PortalModal
          onClose={() => {
            setIsImportModalOpen(false);
            setParsedProducts([]);
          }}
          ariaLabel={t("aria_import")}
        >
          <div className="w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-955 p-6 md:p-8 shadow-2xl space-y-6 my-4 relative max-h-[90vh] overflow-y-auto sidebar-scrollbar">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setParsedProducts([]);
              }}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{t("import_title")}</h3>
              <p className="text-xs text-slate-400">{t("import_subtitle")}</p>
            </div>

            {/* Import Mode Switcher Tabs */}
            <div className="flex border-b border-slate-900 gap-2 pb-1">
              <button
                type="button"
                onClick={() => setImportTab("excel")}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                  importTab === "excel"
                    ? "border-[#22D3A6] text-[#22D3A6] bg-slate-900/60"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/30"
                }`}
              >
                <FileSpreadsheet size={14} />
                <span>{t("tab_excel")}</span>
              </button>

              <button
                type="button"
                onClick={() => setImportTab("spreadsheet")}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                  importTab === "spreadsheet"
                    ? "border-[#22D3A6] text-[#22D3A6] bg-slate-900/60"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/30"
                }`}
              >
                <Grid size={14} />
                <span>{t("tab_spreadsheet")}</span>
              </button>
            </div>

            {/* TAB BODY: EXCEL UPLOAD */}
            {importTab === "excel" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-900 bg-slate-900/10 p-4 rounded-xl">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t("step1_title")}
                  </span>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {t("step1_desc")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadTemplate("csv")}
                      className="h-8 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-slate-800"
                    >
                      <Download size={10} />
                      <span>{t("template_csv_button")}</span>
                    </button>
                    <button
                      onClick={() => downloadTemplate("xlsx")}
                      className="h-8 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-slate-800"
                    >
                      <Download size={10} />
                      <span>{t("template_excel_button")}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t("step2_title")}
                  </span>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {t("step2_desc")}
                  </p>
                  <label className="h-8 px-3 rounded-lg bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-955 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none w-full text-center">
                    <Upload size={12} />
                    <span>{t("select_file_button")}</span>
                    <input
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB BODY: SPREADSHEET */}
            {importTab === "spreadsheet" && (
              <ProductSpreadsheetEditor
                categorias={categorias}
                onParsedProducts={setParsedProducts}
              />
            )}

            {/* MAPPING BUTTON FOR EXCEL MODE */}
            {importTab === "excel" && parsedProducts.length > 0 && (
              <div className="space-y-2 border border-slate-900 bg-slate-900/10 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t("standardize_columns_title")}
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  {t("standardize_columns_desc")}
                </p>
                <button
                  onClick={() => setIsColumnMappingModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-955 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none w-full"
                >
                  <span>{t("map_columns_button")}</span>
                </button>
              </div>
            )}

            {/* PREVIEW TABLE AND CONFIRMATION BUTTON */}
            {parsedProducts.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#22D3A6] uppercase tracking-wider">
                    {t("preview_title", { count: parsedProducts.length })}
                  </span>
                  <span className="text-[9px] text-slate-500 italic font-semibold">
                    {t("preview_hint")}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-900 overflow-hidden max-h-44 overflow-y-auto bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950 text-slate-500 uppercase font-bold tracking-wider sticky top-0">
                        <th className="p-2">{t("table_name")}</th>
                        <th className="p-2">{t("table_sku")}</th>
                        <th className="p-2 text-right">{t("preview_price_detail")}</th>
                        <th className="p-2 text-right">{t("preview_price_wholesale")}</th>
                        <th className="p-2 text-center">Stock</th>
                        <th className="p-2 text-center">{t("table_published")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {parsedProducts.map((p, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-900/10 transition-colors text-slate-300"
                        >
                          <td className="p-2 font-semibold text-white max-w-[150px] truncate">{p.nombre}</td>
                          <td className="p-2 font-mono text-slate-400">{p.sku || "—"}</td>
                          <td className="p-2 text-right font-mono">Q{p.precioDetalle.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono">Q{p.precioMayoreo.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono">{p.stockActual}</td>
                          <td className="p-2 text-center">
                            <span
                              className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold ${
                                p.publicado
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {p.publicado ? t("import_yes") : t("import_no")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] disabled:bg-slate-800 disabled:text-slate-500 text-slate-955 font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>{t("importing_button", { count: parsedProducts.length })}</span>
                    </>
                  ) : (
                    <span>{t("confirm_import_button", { count: parsedProducts.length })}</span>
                  )}
                </button>
              </div>
            )}

          </div>
        </PortalModal>
      )}

      {/* COLUMN MAPPING MODAL */}
      {isColumnMappingModalOpen && (
        <PortalModal
          onClose={() => setIsColumnMappingModalOpen(false)}
          ariaLabel={t("aria_mapping")}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 my-8 relative">
            <button
              onClick={() => setIsColumnMappingModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{t("mapping_title")}</h3>
              <p className="text-xs text-slate-400">{t("mapping_subtitle")}</p>
            </div>

            <div className="space-y-4">
              {/* Campos Requeridos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#22D3A6] uppercase tracking-wider">
                  {t("required_fields_title")}
                </h4>
                
                {["nombre", "precioDetalle", "precioMayoreo", "sku", "stockActual", "stockMinimo"].map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="w-40 text-sm font-semibold text-white">
                      {field === "nombre" && t("field_label_nombre")}
                      {field === "precioDetalle" && t("field_label_precioDetalle")}
                      {field === "precioMayoreo" && t("field_label_precioMayoreo")}
                      {field === "sku" && t("field_label_sku")}
                      {field === "stockActual" && t("field_label_stockActual")}
                      {field === "stockMinimo" && t("field_label_stockMinimo")}
                    </label>
                    <select
                      value={columnMapping[field]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                      className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8] cursor-pointer"
                    >
                      <option value="">{t("select_column_placeholder")}</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    {columnMapping[field] && (
                      <span className="text-[#22D3A6] text-lg">✓</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Campos Opcionales */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t("optional_fields_title")}
                </h4>
                
                {["descripcion", "categoriaId", "imagenUrl"].map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="w-40 text-sm text-slate-300">
                      {field === "descripcion" && t("field_label_descripcion")}
                      {field === "categoriaId" && t("field_label_categoriaId")}
                      {field === "imagenUrl" && t("field_label_imagenUrl")}
                    </label>
                    <select
                      value={columnMapping[field]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                      className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-100 outline-none focus:border-[#38BDF8] cursor-pointer"
                    >
                      <option value="">{t("not_assigned_placeholder")}</option>
                      {detectedColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsColumnMappingModalOpen(false)}
                className="flex-1 h-10 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 text-sm font-bold transition-all cursor-pointer"
              >
                {t("cancel_button")}
              </button>
              <button
                onClick={() => {
                  if (rawExcelRows.length === 0) {
                    toast.error(t("toast_no_rows_for_mapping"));
                    setIsColumnMappingModalOpen(false);
                    return;
                  }
                  try {
                    const mappedProducts = parseRowsWithMapping(rawExcelRows, columnMapping);
                    setParsedProducts(mappedProducts);
                    toast.success(t("toast_mapping_applied", { count: mappedProducts.length }));
                    setIsColumnMappingModalOpen(false);
                  } catch (err) {
                    toast.error((err instanceof Error ? err.message : "") || t("toast_mapping_error"));
                  }
                }}
                className="flex-1 h-10 rounded-lg bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-955 text-sm font-bold transition-all cursor-pointer border-none"
              >
                {t("apply_mapping_button")}
              </button>
            </div>
          </div>
        </PortalModal>
      )}

    </div>
  );
}

