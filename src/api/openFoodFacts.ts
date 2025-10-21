import type { FoodProduct, Nutrients, ServingUnit } from '../types';
import { fillMissingNutrients, per100gToPerServing } from '../lib/nutrition';

const API_BASE = 'https://world.openfoodfacts.org';
const SEARCH_HOSTS = [
  'https://world.openfoodfacts.org',
  'https://world.openfoodfacts.net',
];

const SEARCH_TIMEOUT_MS = 6000;

type OFFProduct = {
  id: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
  code?: string;
};

type OFFBarcodeResponse = {
  status: number;
  product?: OFFProduct;
};

type OFFSearchResponse = {
  products: OFFProduct[];
};

const DEFAULT_SERVING = { value: 100, unit: 'g' as ServingUnit };

type RequestOptions = {
  signal?: AbortSignal;
};

export async function getProductByBarcode(
  barcode: string,
  options: RequestOptions = {},
): Promise<FoodProduct | null> {
  const res = await fetch(`${API_BASE}/api/v2/product/${barcode}.json`, {
    signal: options.signal,
  });
  if (!res.ok) {
    throw new Error(`Open Food Facts lookup failed: ${res.status}`);
  }
  const data = (await res.json()) as OFFBarcodeResponse;
  if (data.status !== 1 || !data.product) {
    return null;
  }
  return mapProduct(data.product, 'off');
}

export async function searchProducts(
  query: string,
  options: RequestOptions = {},
): Promise<FoodProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
    sort_by: 'unique_scans_n',
    sort_order: 'desc',
    fields: [
      'code',
      'product_name',
      'brands',
      'image_url',
      'serving_size',
      'nutriments',
    ].join(','),
  });
  const controllers = SEARCH_HOSTS.map(() => new AbortController());
  const requests = SEARCH_HOSTS.map((host, index) => {
    const controller = controllers[index];
    const signal = options.signal
      ? mergeSignals(options.signal, controller.signal)
      : controller.signal;
    const url = `${host}/cgi/search.pl?${params.toString()}`;
    return fetchWithTimeout(url, signal, SEARCH_TIMEOUT_MS)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Open Food Facts search failed: ${res.status}`);
        }
        const payload = (await res.json()) as OFFSearchResponse;
        return { payload, index };
      })
      .finally(() => {
        controller.abort();
      });
  });

  const { payload, index } = await firstSuccessful(requests, options.signal);
  controllers.forEach((ctrl, idx) => {
    if (idx !== index) ctrl.abort();
  });
  return payload.products
    .map((product) => mapProduct(product, 'off'))
    .filter((product): product is FoodProduct => Boolean(product));
}

function mapProduct(raw: OFFProduct, source: FoodProduct['source']): FoodProduct | null {
  const id = raw.code ?? raw.id;
  if (!id) return null;

  const name = raw.product_name?.trim() || 'Unnamed product';
  const servingSize = parseServing(raw.serving_size) ?? DEFAULT_SERVING;

  const per100g = extractNutrients(raw.nutriments);
  const perServing = per100gToPerServing(per100g, servingSize) ?? fillMissingNutrients(per100g);

  return {
    id,
    source,
    name,
    brand: raw.brands,
    imageUrl: raw.image_url,
    servingSize,
    perServing,
    per100g,
  };
}

function extractNutrients(input: OFFProduct['nutriments']): Nutrients {
  if (!input) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      salt: 0,
    };
  }
  const lookup = (key: string) => input[key] ?? 0;
  return {
    calories: lookup('energy-kcal_100g') || lookup('energy-kcal'),
    protein: lookup('proteins_100g') || lookup('protein_100g'),
    carbs: lookup('carbohydrates_100g') || lookup('carbohydrate_100g'),
    fat: lookup('fat_100g'),
    fiber: lookup('fiber_100g'),
    sugar: lookup('sugars_100g'),
    salt: lookup('salt_100g'),
  };
}

function parseServing(value?: string): { value: number; unit: ServingUnit } | null {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*(g|ml|l|oz|piece|serving|portion)?/i);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]);
  if (Number.isNaN(amount) || amount <= 0) return null;
  const unit = normalizeUnit(match[2]);
  return { value: unit === 'ml' && match[2]?.toLowerCase() === 'l' ? amount * 1000 : amount, unit };
}

function normalizeUnit(unit?: string): ServingUnit {
  const normalized = unit?.toLowerCase();
  switch (normalized) {
    case 'ml':
    case 'l':
      return 'ml';
    case 'g':
    case 'gram':
    case 'grams':
      return 'g';
    case 'piece':
    case 'pcs':
    case 'serving':
    case 'portion':
    case undefined:
      return 'piece';
    default:
      return 'g';
  }
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const forward = (signal: AbortSignal) => {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener(
        'abort',
        () => controller.abort(signal.reason),
        { once: true },
      );
    }
  };
  forward(a);
  forward(b);
  return controller.signal;
}

async function fetchWithTimeout(url: string, signal: AbortSignal, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
  const combinedSignal = mergeSignals(signal, controller.signal);
  try {
    const response = await fetch(url, { signal: combinedSignal, cache: 'no-cache' });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function firstSuccessful<T>(promises: Array<Promise<T>>, externalSignal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const errors: unknown[] = [];
    let settled = false;

    const maybeReject = () => {
      if (errors.length === promises.length && !settled) {
        settled = true;
        const error = errors[0] instanceof Error ? errors[0] : new Error('All requests failed');
        reject(error);
      }
    };

    promises.forEach((promise) => {
      promise
        .then((result) => {
          if (settled) return;
          settled = true;
          resolve(result);
        })
        .catch((error) => {
          errors.push(error);
          maybeReject();
        });
    });

    if (externalSignal) {
      if (externalSignal.aborted) {
        settled = true;
        reject(new DOMException('Aborted', 'AbortError'));
      } else {
        externalSignal.addEventListener(
          'abort',
          () => {
            if (!settled) {
              settled = true;
              reject(new DOMException('Aborted', 'AbortError'));
            }
          },
          { once: true },
        );
      }
    }
  });
}
