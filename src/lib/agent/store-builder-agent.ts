import type { StoreConfig, StoreVisualConfig, SectionProperties } from "@/types/store-builder";

export interface AgentPlan {
  concept: string;
  palette: {
    backgroundColor: string;
    accentColor: string;
    backgroundGradient?: string;
  };
  steps: string[];
}

export interface AgentProduct {
  nombre: string;
  precioDetalle: number;
  precioMayoreo: number;
  sku?: string;
  descripcion?: string;
  stockActual?: number;
  imagenUrl?: string;
  publicado?: boolean;
}

export interface AgentExecutionResult {
  planRaw: string;
  explanation: string;
  storeConfig: StoreConfig | null;
  productsToCreate: AgentProduct[];
  rawText: string;
}

export function buildStoreBuilderSystemPrompt(currentConfig: StoreVisualConfig, activeStore: { nombre?: string; slug?: string } | null): string {
  const storeName = activeStore?.nombre || "Mi Tienda";
  const storeSlug = activeStore?.slug || "tienda";
  const sanitizedConfig = JSON.stringify(currentConfig, null, 2);

  return `Eres "DMHub Store Architect", un director de diseño digital de élite y experto en comercio electrónico y experiencia de usuario (UI/UX). Tu misión es concebir, diseñar y construir tiendas virtuales visualmente impactantes, modernas y de alta conversión dentro de la plataforma DMHub, además de sugerir o crear productos de catálogo cuando sea pertinente o se solicite.

TIENDA ACTUAL:
- Nombre: "${storeName}"
- Identificador / Slug: "${storeSlug}"

CONFIGURACIÓN VISUAL ACTUAL (storeConfig):
\`\`\`json
${sanitizedConfig}
\`\`\`

CAPACIDADES DEL CONSTRUCTOR:
1. Tema Global (theme):
   - backgroundColor: código HEX
   - accentColor: código HEX
   - backgroundGradient: string CSS ej. "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)"
   - useGradient: boolean (true o false)

2. Tipos de Secciones soportadas y sus propiedades EXACTAS:
   - "announcement":
     properties: { bannerText (string), backgroundColor (HEX), textColor (HEX), verticalPadding (number), linkAction ("None"|"Open Link"), linkUrl (string) }
   - "header":
     properties: { storeName (string), logoUrl (string), menuItems (string[]), backgroundColor (HEX), textColor (HEX) }
   - "hero":
     properties: { title (string - TÍTULO PRINCIPAL), subtitle (string - SUBTÍTULO DESCRIPTIVO), primaryButtonText (string), secondaryButtonText (string), backgroundImage (string URL Unsplash), backgroundColor (HEX), textColor (HEX), overlayOpacity (number 0-100) }
   - "products":
     properties: { title (string - TÍTULO DE CATÁLOGO), subtitle (string - SUBTÍTULO DE CATÁLOGO), columns (2|3|4), productsCount (number 3-12), layoutType ("grid"|"list"), showSearch (boolean), backgroundColor (HEX), textColor (HEX) }
   - "richtext":
     properties: { title (string), content (string), backgroundColor (HEX), textColor (HEX) }
   - "custom":
     properties: { title (string), backgroundColor (HEX), blocks: [{ id, type ("text"|"image"|"product_card"), content, url, alt, title, price }] }
   - "footer":
     properties: { copyrightText (string), backgroundColor (HEX), textColor (HEX) }

REGLA OBLIGATORIA PARA TÍTULOS Y SUBTÍTULOS:
En TODAS las secciones (especialmente "hero", "products", "richtext", "custom", "header", "announcement"), es INDISPENSABLE que definas y actualices explícitamente los campos "title", "subtitle", "bannerText" y "storeName" con textos sumamente atractivos, profesionales y adaptados al nicho de la tienda. NUNCA uses nombres de propiedades erróneos como "headline" o "subheadline" en vez de "title" y "subtitle".

PROTOCOLO ESTRICTO DE RESPUESTA EN FASES:
Debes formatear tu respuesta usando las siguientes etiquetas XML:

<plan>
### Concepto Visual & Estilo
[Explica la identidad de marca, psicología del color, vibra y dirección artística]

### Paleta Cromática
- Fondo: [Código HEX]
- Acento / Botones: [Código HEX]
- Textos: [Código HEX]
- Degradado: [CSS linear-gradient si aplica]

### Estructura de Secciones Planificada
1. [Nombre sección]: [Propósito y cambios clave]
2. [Nombre sección]: [Propósito y cambios clave]
...
</plan>

<explanation>
[Breve mensaje explicativo y motivador para el dueño de la tienda sobre las decisiones tomadas y cómo elevarán la percepción de valor de su marca.]
</explanation>

<construction>
{
  "theme": {
    "backgroundColor": "#HEX",
    "accentColor": "#HEX",
    "backgroundGradient": "linear-gradient(135deg, ...)",
    "useGradient": false
  },
  "pages": [
    {
      "id": "home",
      "name": "Inicio",
      "isHome": true,
      "sections": [
        ...
      ]
    }
  ]
}
</construction>

CREACIÓN Y SUGERENCIA DE PRODUCTOS (Opcional si se solicita o agrega valor):
Si el usuario te pide crear productos, o si estás diseñando una tienda y tiene sentido sugerir productos de muestra acorde al nicho comercial, incluye la etiqueta <products_to_create> con un arreglo JSON de productos:

<products_to_create>
[
  {
    "nombre": "Nombre del Producto",
    "precioDetalle": 75.00,
    "precioMayoreo": 55.00,
    "sku": "COD-001",
    "descripcion": "Descripción comercial atractiva.",
    "stockActual": 25,
    "imagenUrl": "https://images.unsplash.com/photo-...",
    "publicado": true
  }
]
</products_to_create>

REGLAS DE ORO CRÍTICAS:
1. <construction> DEBE contener ÚNICAMENTE un objeto JSON válido, completo y ejecutable. No pongas bloques de código markdown ni texto adicional dentro de <construction>.
2. Conserva SIEMPRE las secciones esenciales: "header" y "footer" en la página "home".
3. Todos los colores deben tener excelente contraste y legibilidad (reglas WCAG AA). Nunca coloques texto oscuro sobre fondo oscuro ni texto claro sobre fondo blanco.
4. Redacta copys comerciales persuasivos y profesionales para el nicho específico de la tienda.
5. No inventes tipos de secciones no soportados.`;
}

export function parseAgentResponse(rawText: string, currentConfig: StoreVisualConfig): AgentExecutionResult {
  let planRaw = "";
  let explanation = "";
  let storeConfig: StoreConfig | null = null;
  let productsToCreate: AgentProduct[] = [];

  // Extract <plan>
  const planMatch = rawText.match(/<plan>([\s\S]*?)<\/plan>/i);
  if (planMatch) {
    planRaw = planMatch[1].trim();
  }

  // Extract <explanation>
  const explanationMatch = rawText.match(/<explanation>([\s\S]*?)<\/explanation>/i);
  if (explanationMatch) {
    explanation = explanationMatch[1].trim();
  }

  // Extract <construction>
  const constructionMatch = rawText.match(/<construction>([\s\S]*?)<\/construction>/i);
  if (constructionMatch) {
    try {
      const jsonStr = constructionMatch[1]
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(jsonStr);

      if (parsed && typeof parsed === "object") {
        storeConfig = sanitizeStoreConfig(parsed, currentConfig);
      }
    } catch (err) {
      console.error("Error al parsear el JSON de <construction>:", err);
    }
  }

  // Extract <products_to_create> or <products>
  const productsMatch = rawText.match(/<(?:products_to_create|products)>([\s\S]*?)<\/(?:products_to_create|products)>/i);
  if (productsMatch) {
    try {
      const jsonStr = productsMatch[1]
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed)) {
        productsToCreate = parsed.map((item: Record<string, unknown>, idx: number) => {
          const precioDetalle = Number(item.precioDetalle || item.price || item.precio || 50);
          const precioMayoreo = Number(item.precioMayoreo || item.wholesalePrice || (precioDetalle * 0.8) || 40);
          const sku = String(item.sku || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`);

          return {
            nombre: String(item.nombre || item.name || `Producto ${idx + 1}`),
            precioDetalle: isNaN(precioDetalle) ? 50 : precioDetalle,
            precioMayoreo: isNaN(precioMayoreo) ? 40 : precioMayoreo,
            sku,
            descripcion: String(item.descripcion || item.description || ""),
            stockActual: Number(item.stockActual || item.stock || 25),
            imagenUrl: String(item.imagenUrl || item.image || item.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80"),
            publicado: item.publicado !== false
          };
        });
      }
    } catch (err) {
      console.error("Error al parsear productos del agente:", err);
    }
  }

  // Fallback if explanation was not inside tags
  if (!explanation && !planRaw && !storeConfig) {
    explanation = rawText;
  } else if (!explanation && rawText) {
    const textWithoutTags = rawText
      .replace(/<plan>[\s\S]*?<\/plan>/gi, "")
      .replace(/<construction>[\s\S]*?<\/construction>/gi, "")
      .replace(/<(?:products_to_create|products)>[\s\S]*?<\/(?:products_to_create|products)>/gi, "")
      .trim();
    if (textWithoutTags) {
      explanation = textWithoutTags;
    }
  }

  return {
    planRaw,
    explanation,
    storeConfig,
    productsToCreate,
    rawText
  };
}

function sanitizeStoreConfig(newConfig: StoreVisualConfig, fallbackConfig: StoreVisualConfig): StoreConfig {
  const result: StoreConfig = {
    pages: [],
    ...fallbackConfig,
    ...newConfig
  };

  // Ensure theme
  if (!result.theme) {
    result.theme = fallbackConfig.theme || {
      backgroundColor: "#F8FAFC",
      accentColor: "#1AB38C",
      backgroundGradient: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)",
      useGradient: false
    };
  }

  // Ensure pages
  if (!Array.isArray(result.pages) || result.pages.length === 0) {
    if (Array.isArray(newConfig.sections) && newConfig.sections.length > 0) {
      result.pages = [
        {
          id: "home",
          name: "Inicio",
          isHome: true,
          sections: newConfig.sections
        }
      ];
    } else {
      result.pages = fallbackConfig.pages || [];
    }
  }

  // Ensure each page has sections with valid IDs and merged properties
  result.pages = result.pages.map((page) => {
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const fallbackPage = fallbackConfig.pages?.find((fp) => fp.id === (page.id || "home"));

    return {
      id: page.id || "home",
      name: page.name || "Inicio",
      isHome: Boolean(page.isHome),
      sections: sections.map((sec, idx: number) => {
        const { id, name, type, properties, ...otherProps } = sec;
        const defaultId = ["header", "footer", "announcement", "hero", "products", "richtext", "cart"].includes(type)
          ? type
          : `sec-${idx}-${Date.now()}`;
        const secId = id || defaultId;

        const existingSection = fallbackPage?.sections?.find((fs) => fs.id === secId || fs.type === type);

        const mergedProperties: SectionProperties = {
          ...(existingSection?.properties || {}),
          ...otherProps,
          ...(properties || {})
        };

        // Normalize title & subtitle aliases so they are NEVER lost!
        if (mergedProperties.headline && !mergedProperties.title) {
          mergedProperties.title = mergedProperties.headline;
        }
        if (mergedProperties.heading && !mergedProperties.title) {
          mergedProperties.title = mergedProperties.heading;
        }
        if (mergedProperties.subheadline && !mergedProperties.subtitle) {
          mergedProperties.subtitle = mergedProperties.subheadline;
        }
        if (mergedProperties.subheading && !mergedProperties.subtitle) {
          mergedProperties.subtitle = mergedProperties.subheading;
        }
        if (mergedProperties.ctaText && !mergedProperties.primaryButtonText) {
          mergedProperties.primaryButtonText = mergedProperties.ctaText;
        }
        if (mergedProperties.title && !mergedProperties.storeName && type === "header") {
          mergedProperties.storeName = mergedProperties.title;
        }
        if (mergedProperties.title && !mergedProperties.bannerText && type === "announcement") {
          mergedProperties.bannerText = mergedProperties.title;
        }

        return {
          id: secId,
          name: name || existingSection?.name || (type ? type.charAt(0).toUpperCase() + type.slice(1) : `Sección ${idx + 1}`),
          type: type || existingSection?.type || "custom",
          properties: mergedProperties
        };
      })
    };
  });

  result.currentPageId = result.currentPageId || fallbackConfig.currentPageId || "home";

  return result;
}
