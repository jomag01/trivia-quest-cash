import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrintifyShop {
  id: number;
  title: string;
  sales_channel: string;
}

interface PrintifyBlueprint {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  images: string[];
}

interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  images: { src: string }[];
  variants: { id: number; title: string; price: number }[];
  is_published: boolean;
}

interface PrintifyPrintProvider {
  id: number;
  title: string;
  location: { country: string };
}

export const usePrintify = () => {
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<PrintifyShop[]>([]);
  const [blueprints, setBlueprints] = useState<PrintifyBlueprint[]>([]);
  const [products, setProducts] = useState<PrintifyProduct[]>([]);
  const [printProviders, setPrintProviders] = useState<PrintifyPrintProvider[]>([]);

  const callPrintify = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('printify', {
        body: { action, ...params }
      });
      
      if (error) throw error;
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Printify API error';
      console.error('Printify error:', message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getShops = useCallback(async () => {
    const data = await callPrintify('get_shops');
    if (data) {
      setShops(data);
      return data;
    }
    return [];
  }, [callPrintify]);

  const getCatalog = useCallback(async () => {
    const data = await callPrintify('get_catalog');
    if (data) {
      setBlueprints(data);
      return data;
    }
    return [];
  }, [callPrintify]);

  const getBlueprint = useCallback(async (blueprintId: number) => {
    return await callPrintify('get_blueprint', { blueprintId });
  }, [callPrintify]);

  const getPrintProviders = useCallback(async (blueprintId: number) => {
    const data = await callPrintify('get_print_providers', { blueprintId });
    if (data) {
      setPrintProviders(data);
      return data;
    }
    return [];
  }, [callPrintify]);

  const getVariants = useCallback(async (blueprintId: number, printProviderId: number) => {
    return await callPrintify('get_variants', { blueprintId, printProviderId });
  }, [callPrintify]);

  const getProducts = useCallback(async (shopId: number) => {
    const data = await callPrintify('get_products', { shopId });
    if (data?.data) {
      setProducts(data.data);
      return data.data;
    }
    return [];
  }, [callPrintify]);

  const getProduct = useCallback(async (shopId: number, productId: string) => {
    return await callPrintify('get_product', { shopId, productId });
  }, [callPrintify]);

  const createProduct = useCallback(async (shopId: number, product: Record<string, unknown>) => {
    const data = await callPrintify('create_product', { shopId, product });
    if (data) {
      toast.success('Product created in Printify!');
      return data;
    }
    return null;
  }, [callPrintify]);

  const publishProduct = useCallback(async (shopId: number, productId: string) => {
    const data = await callPrintify('publish_product', { shopId, productId });
    if (data) {
      toast.success('Product published!');
      return data;
    }
    return null;
  }, [callPrintify]);

  const uploadImage = useCallback(async (fileName: string, imageSource: { base64?: string; url?: string }) => {
    const params: Record<string, string> = { fileName };
    if (imageSource.url) {
      params.url = imageSource.url;
    } else if (imageSource.base64) {
      params.base64Image = imageSource.base64;
    }
    return await callPrintify('upload_image', params);
  }, [callPrintify]);

  const getOrders = useCallback(async (shopId: number) => {
    const data = await callPrintify('get_orders', { shopId });
    return data?.data || [];
  }, [callPrintify]);

  const createOrder = useCallback(async (shopId: number, order: Record<string, unknown>) => {
    const data = await callPrintify('create_order', { shopId, order });
    if (data) {
      toast.success('Order sent to Printify!');
      return data;
    }
    return null;
  }, [callPrintify]);

  const calculateShipping = useCallback(async (shopId: number, order: Record<string, unknown>) => {
    return await callPrintify('calculate_shipping', { shopId, order });
  }, [callPrintify]);

  return {
    loading,
    shops,
    blueprints,
    products,
    printProviders,
    getShops,
    getCatalog,
    getBlueprint,
    getPrintProviders,
    getVariants,
    getProducts,
    getProduct,
    createProduct,
    publishProduct,
    uploadImage,
    getOrders,
    createOrder,
    calculateShipping,
  };
};
