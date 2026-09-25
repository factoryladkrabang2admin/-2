import React, { useState, useEffect, useMemo } from 'react';
import { 
  Warehouse, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Package, 
  Boxes,
  PackageCheck,
  Truck,
  Barcode,
  ClipboardList,
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Layers, 
  Grid, 
  Table as TableIcon, 
  SlidersHorizontal, 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  Copy, 
  Settings, 
  ArrowUpRight, 
  TrendingUp, 
  History, 
  Tag, 
  X,
  Printer,
  Sparkles,
  Info,
  Edit3
} from 'lucide-react';
import { InventoryProduct, InventoryTransaction, InventoryCategory } from '../types';
import { 
  INVENTORY_CATEGORIES, 
  EQUIPMENT_INVENTORY_SHEET_URL, 
  INITIAL_INVENTORY_PRODUCTS,
  syncInventoryFromGoogleSheet, 
  getLocalInventoryProducts, 
  getLocalInventoryTransactions, 
  executeInventoryTransaction, 
  updateProductDetails, 
  updateBatchStockAndPrice,
  generateInventorySheetTsv, 
  getEquipmentInventoryWebhookUrl, 
  setEquipmentInventoryWebhookUrl, 
  EQUIPMENT_INVENTORY_APPS_SCRIPT 
} from '../services/equipmentInventoryService';
import { useLanguage } from '../contexts/LanguageContext';
import { canAccessEquipmentInventory } from '../data/mockData';

export const PRODUCT_EN_INFO: Record<string, { name: string; desc: string }> = {
  'item-1': { name: 'Red-Trim Apron', desc: 'Production line apron with red edge trim' },
  'item-2': { name: 'Blue-Trim Apron', desc: 'Production line apron with blue edge trim' },
  'item-3': { name: 'Paper Cap', desc: 'Disposable paper cap for visitors and staff' },
  'item-4': { name: 'Hairnet Mesh Cap', desc: 'Breathable soft mesh hairnet cap' },
  'item-5': { name: 'Non-Woven Face Mask', desc: 'Synthetic non-woven sanitary face mask' },
  'item-6': { name: 'Disposable Shoe Covers', desc: 'Anti-contamination disposable shoe covers' },
  'item-7': { name: 'White Fabric Cap (Size M)', desc: 'Standard production white fabric cap M' },
  'item-8': { name: 'White Fabric Cap (Size L)', desc: 'Standard production white fabric cap L' },
  'item-9': { name: 'White Shoulder-Cover Cap (Size M)', desc: 'Full shoulder-cover hygienic cap M' },
  'item-10': { name: 'White Shoulder-Cover Cap (Size L)', desc: 'Full shoulder-cover hygienic cap L' },
  'item-11': { name: 'Red-Stripe Shoulder Cap (Size M)', desc: 'Red-stripe cap for Supervisors/QC M' },
  'item-12': { name: 'Red-Stripe Shoulder Cap (Size L)', desc: 'Red-stripe cap for Supervisors/QC L' },
  'item-13': { name: 'Pink Uniform Band', desc: 'Pink velcro strap for dept/shift badge' },
  'item-14': { name: 'Gold Uniform Band', desc: 'Gold velcro strap for dept managers' },
  'item-15': { name: 'Safety ID Lanyard', desc: 'Safety breakaway ID badge lanyard' },
  'item-16': { name: 'RFID Badge Card Holder', desc: 'Clear rigid plastic RFID badge card case' },
  'item-17': { name: 'Heavy-Duty PVC Apron', desc: 'Waterproof chemical-resistant heavy PVC apron' },
  'item-18': { name: 'COVID-19 ATK Test Kit', desc: 'FDA-certified nasal antigen test kit' },
  'item-19': { name: 'Steel Toe Boots (#10)', desc: 'Slip-resistant steel toe rubber boots No. 10' },
  'item-20': { name: 'Steel Toe Boots (#10.5)', desc: 'Slip-resistant steel toe rubber boots No. 10.5' },
  'item-21': { name: 'Steel Toe Boots (#11)', desc: 'Slip-resistant steel toe rubber boots No. 11' },
  'item-22': { name: 'Steel Toe Boots (#11.5)', desc: 'Slip-resistant steel toe rubber boots No. 11.5' },
  'item-23': { name: 'Steel Toe Boots (#12)', desc: 'Slip-resistant steel toe rubber boots No. 12' },
  'item-24': { name: 'EVA Ultralight Boots (#9.5)', desc: 'Comfortable lightweight EVA foam boots No. 9.5' },
  'item-25': { name: 'EVA Ultralight Boots (#10)', desc: 'Comfortable lightweight EVA foam boots No. 10' },
  'item-26': { name: 'EVA Ultralight Boots (#10.5)', desc: 'Comfortable lightweight EVA foam boots No. 10.5' },
  'item-27': { name: 'EVA Ultralight Boots (#11)', desc: 'Comfortable lightweight EVA foam boots No. 11' },
  'item-28': { name: 'EVA Ultralight Boots (#11.5)', desc: 'Comfortable lightweight EVA foam boots No. 11.5' },
};

export const PRODUCT_NAME_EN_MAP: Record<string, string> = {
  'เอี๊ยมขอบสีแดง': 'Red-Trim Apron',
  'เอี๊ยมขอบสีน้ำเงิน': 'Blue-Trim Apron',
  'หมวกกระดาษ': 'Paper Cap',
  'หมวกเน็ตคลุมผม': 'Hairnet Mesh Cap',
  'ผ้าปิดจมูกใยสังเคราะห์': 'Non-Woven Face Mask',
  'ถุงครอบเท้า': 'Disposable Shoe Covers',
  'หมวกสีขาว SIZE M': 'White Fabric Cap (Size M)',
  'หมวกสีขาว SIZE L': 'White Fabric Cap (Size L)',
  'หมวกสีขาวคลุมบ่า SIZE M': 'White Shoulder-Cover Cap (Size M)',
  'หมวกสีขาวคลุมบ่า SIZE L': 'White Shoulder-Cover Cap (Size L)',
  'หมวกสีขาวคลุมบ่าคาดแดง SIZE M': 'Red-Stripe Shoulder Cap (Size M)',
  'หมวกสีขาวคลุมบ่าคาดแดง SIZE L': 'Red-Stripe Shoulder Cap (Size L)',
  'แถบเสื้อสีชมพู': 'Pink Uniform Band',
  'แถบเสื้อสีทอง': 'Gold Uniform Band',
  'สายคล้องบัตร': 'Safety ID Lanyard',
  'กรอบใส่บัตรพนักงาน': 'RFID Badge Card Holder',
  'ผ้ากันเปื้อน PVC': 'Heavy-Duty PVC Apron',
  'ชุดตรวจ ATK': 'COVID-19 ATK Test Kit',
  'รองเท้าบูท NO. 10': 'Steel Toe Boots (#10)',
  'รองเท้าบูท NO. 10.5': 'Steel Toe Boots (#10.5)',
  'รองเท้าบูท NO. 11': 'Steel Toe Boots (#11)',
  'รองเท้าบูท NO. 11.5': 'Steel Toe Boots (#11.5)',
  'รองเท้าบูท NO. 12': 'Steel Toe Boots (#12)',
  'รองเท้าบูท EVA NO. 9.5': 'EVA Ultralight Boots (#9.5)',
  'รองเท้าบูท EVA NO. 10': 'EVA Ultralight Boots (#10)',
  'รองเท้าบูท EVA NO. 10.5': 'EVA Ultralight Boots (#10.5)',
  'รองเท้าบูท EVA NO. 11': 'EVA Ultralight Boots (#11)',
  'รองเท้าบูท EVA NO. 11.5': 'EVA Ultralight Boots (#11.5)',
};

export const getTranslatedUnit = (unit: string, isEn: boolean) => {
  if (!isEn) return unit;
  const map: Record<string, string> = {
    'ผืน': 'pcs',
    'ใบ': 'pcs',
    'ชิ้น': 'pcs',
    'คู่': 'pair(s)',
    'อัน': 'pcs',
    'เส้น': 'band(s)',
    'แถบ': 'strap(s)',
    'ชุด': 'set(s)',
    'แพ็ค': 'pack(s)',
    'กล่อง': 'box(es)',
  };
  return map[unit] || unit;
};

export const getTranslatedCategory = (catId: string, isEn: boolean, fallbackTh?: string) => {
  const cat = INVENTORY_CATEGORIES.find((c) => c.id === catId);
  if (cat) return isEn ? cat.nameEn : cat.nameTh;
  return fallbackTh || catId;
};

export const getProductName = (p: { id?: string; name: string }, isEn: boolean) => {
  if (!isEn) return p.name;
  if (p.id && PRODUCT_EN_INFO[p.id]) return PRODUCT_EN_INFO[p.id].name;
  if (PRODUCT_NAME_EN_MAP[p.name]) return PRODUCT_NAME_EN_MAP[p.name];
  return p.name;
};

export const getProductDesc = (p: { id?: string; description?: string }, isEn: boolean) => {
  if (!isEn) return p.description;
  if (p.id && PRODUCT_EN_INFO[p.id]) return PRODUCT_EN_INFO[p.id].desc;
  return p.description;
};

interface EquipmentInventoryViewProps {
  currentUser?: any;
  isAuthenticated?: boolean;
}

export const EquipmentInventoryView: React.FC<EquipmentInventoryViewProps> = ({
  currentUser,
  isAuthenticated = false,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const canManage = canAccessEquipmentInventory(currentUser, isAuthenticated);

  // State
  const [products, setProducts] = useState<InventoryProduct[]>(() => getLocalInventoryProducts());
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => getLocalInventoryTransactions());
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'matrix'>('grid');
  const [activeMainTab, setActiveMainTab] = useState<'inventory' | 'pos' | 'history'>('inventory');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('ข้อมูลล่าสุดในเครื่อง');

  // Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<{
    tx: InventoryTransaction;
    product: InventoryProduct;
  } | null>(null);

  // Batch Row Editing State (แก้ไขข้อมูลแถว เพิ่มสต็อก, ราคาขาย)
  const [batchRowEditModalOpen, setBatchRowEditModalOpen] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState<'both' | 'restock' | 'price'>('both');
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchCategoryFilter, setBatchCategoryFilter] = useState<InventoryCategory>('all');
  const [batchRowsData, setBatchRowsData] = useState<Array<{
    id: string;
    name: string;
    category: InventoryCategory;
    categoryName: string;
    unit: string;
    initialStock: number;
    stockIn: number;
    price: number;
    soldCount: number;
  }>>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchSaveSuccess, setBatchSaveSuccess] = useState(false);

  // Inline cell quick edit for Table View
  const [inlineEditCell, setInlineEditCell] = useState<{ id: string; field: 'stockIn' | 'price'; val: number } | null>(null);

  // Selected item for quick action
  const [actionItem, setActionItem] = useState<InventoryProduct | null>(null);

  // Form states for Sale
  const [saleProductId, setSaleProductId] = useState<string>('');
  const [saleQty, setSaleQty] = useState<number>(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState<number>(0);
  const [saleCustomerName, setSaleCustomerName] = useState<string>('');
  const [saleDepartment, setSaleDepartment] = useState<string>('ฝ่ายผลิต');
  const [saleNote, setSaleNote] = useState<string>('');
  const [saleSubmitting, setSaleSubmitting] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Form states for Restock
  const [restockProductId, setRestockProductId] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockNote, setRestockNote] = useState<string>('');
  const [restockSubmitting, setRestockSubmitting] = useState<boolean>(false);
  const [restockError, setRestockError] = useState<string | null>(null);

  // Form states for Adjust / Edit Price
  const [adjustProductId, setAdjustProductId] = useState<string>('');
  const [adjustPrice, setAdjustPrice] = useState<number>(0);
  const [adjustInitial, setAdjustInitial] = useState<number>(0);
  const [adjustStockNow, setAdjustStockNow] = useState<number>(0);
  const [adjustSubmitting, setAdjustSubmitting] = useState<boolean>(false);

  // Webhook settings
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(() => getEquipmentInventoryWebhookUrl());
  const [webhookSaveNotice, setWebhookSaveNotice] = useState<string | null>(null);
  const [copiedTsvNotice, setCopiedTsvNotice] = useState<boolean>(false);
  const [copiedScriptNotice, setCopiedScriptNotice] = useState<boolean>(false);

  // Initial live sync from Google Sheet on mount
  useEffect(() => {
    handleSyncGoogleSheet(true);
  }, []);

  // Update sale product price when selection changes
  useEffect(() => {
    if (saleProductId) {
      const selected = products.find((p) => p.id === saleProductId);
      if (selected) {
        setSaleUnitPrice(selected.price);
        if (saleQty > selected.currentStock) {
          setSaleQty(Math.max(1, selected.currentStock));
        }
      }
    }
  }, [saleProductId, products]);

  // Sync with Google Sheet handler
  const handleSyncGoogleSheet = async (isInitial = false) => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncInventoryFromGoogleSheet();
      if (res.success && res.products.length > 0) {
        setProducts(res.products);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastSyncTime(`ซิงก์ตรงกับ Google Sheet (${timeStr})`);
        if (!isInitial) {
          setSyncStatusMsg({ text: 'ดึงข้อมูลสดจาก Google Sheet สำเร็จเรียบร้อย' });
        }
      } else {
        if (!isInitial) {
          setSyncStatusMsg({ text: res.error || 'ใช้ข้อมูลในเครื่องชั่วคราว', isError: true });
        }
      }
    } catch (err: any) {
      if (!isInitial) {
        setSyncStatusMsg({ text: 'ไม่สามารถติดต่อ Google Sheet ได้ในขณะนี้', isError: true });
      }
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Open Quick Sale Modal for a specific item
  const handleOpenSaleModal = (product?: InventoryProduct) => {
    if (!canManage) return;
    const target = product || products[0];
    if (target) {
      setActionItem(target);
      setSaleProductId(target.id);
      setSaleUnitPrice(target.price);
      setSaleQty(1);
      setSaleCustomerName(currentUser?.name || '');
      setSaleDepartment(currentUser?.department || 'ฝ่ายผลิต');
      setSaleNote('');
      setSaleError(null);
      setSaleModalOpen(true);
    }
  };

  // Open Quick Restock Modal for a specific item
  const handleOpenRestockModal = (product?: InventoryProduct) => {
    if (!canManage) return;
    const target = product || products[0];
    if (target) {
      setActionItem(target);
      setRestockProductId(target.id);
      setRestockQty(10);
      setRestockNote('รับเข้าสต็อกประจำงวด');
      setRestockError(null);
      setRestockModalOpen(true);
    }
  };

  // Open Adjust Modal
  const handleOpenAdjustModal = (product?: InventoryProduct) => {
    if (!canManage) return;
    const target = product || products[0];
    if (target) {
      setActionItem(target);
      setAdjustProductId(target.id);
      setAdjustPrice(target.price);
      setAdjustInitial(target.initialStock);
      setAdjustStockNow(target.currentStock);
      setAdjustModalOpen(true);
    }
  };

  // Open Batch Row Edit Modal (แก้ไขข้อมูลแถว เพิ่มสต็อก, ราคาขาย)
  const handleOpenBatchRowEdit = (mode: 'both' | 'restock' | 'price' = 'both') => {
    if (!canManage) return;
    setBatchEditMode(mode);
    setBatchRowsData(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        categoryName: p.categoryName,
        unit: p.unit,
        initialStock: p.initialStock,
        stockIn: p.stockIn,
        price: p.price,
        soldCount: p.soldCount,
      }))
    );
    setBatchSearchTerm('');
    setBatchCategoryFilter('all');
    setBatchSaveSuccess(false);
    setBatchRowEditModalOpen(true);
  };

  const handleBatchRowChange = (id: string, field: 'stockIn' | 'price' | 'initialStock', value: number) => {
    setBatchRowsData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: Math.max(0, value) } : item))
    );
  };

  const handleResetAllStockIn = () => {
    setBatchRowsData((prev) => prev.map((item) => ({ ...item, stockIn: 0 })));
  };

  const handleRestoreGoogleSheetPrices = () => {
    const defaultMap = new Map(INITIAL_INVENTORY_PRODUCTS.map((p) => [p.name.trim(), p.price]));
    setBatchRowsData((prev) =>
      prev.map((item) => ({
        ...item,
        price: defaultMap.get(item.name.trim()) ?? item.price,
      }))
    );
  };

  const handleSaveBatchRows = async () => {
    if (!canManage) return;
    setBatchSaving(true);
    try {
      const updated = updateBatchStockAndPrice(
        batchRowsData.map((b) => ({
          id: b.id,
          stockIn: b.stockIn,
          price: b.price,
          initialStock: b.initialStock,
        }))
      );
      setProducts(updated);
      setBatchSaveSuccess(true);
      setSyncStatusMsg({ text: 'บันทึกข้อมูลแถว "เพิ่มสต็อก" และ "ราคาขาย" สำเร็จเรียบร้อย' });
      setTimeout(() => {
        setBatchSaving(false);
        setBatchRowEditModalOpen(false);
      }, 700);
    } catch {
      setBatchSaving(false);
    }
  };

  const handleSaveInlineCell = (id: string, field: 'stockIn' | 'price', val: number) => {
    if (!canManage) return;
    const updated = updateProductDetails(id, {
      [field === 'stockIn' ? 'stockIn' : 'price']: Math.max(0, val),
    });
    if (updated) {
      setProducts(getLocalInventoryProducts());
      setSyncStatusMsg({
        text: `อัปเดต ${field === 'stockIn' ? 'เพิ่มสต็อก' : 'ราคาขาย'} ของ ${updated.name} เรียบร้อย`,
      });
    }
    setInlineEditCell(null);
  };

  // Submit Sale / Checkout
  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError(null);

    const product = products.find((p) => p.id === saleProductId);
    if (!product) {
      setSaleError('กรุณาเลือกรายการสินค้า');
      return;
    }

    if (saleQty <= 0) {
      setSaleError('กรุณาระบุจำนวนขายที่ถูกต้อง (มากกว่า 0)');
      return;
    }

    if (saleQty > product.currentStock) {
      setSaleError(`สต็อกคงเหลือไม่เพียงพอ (มีคงเหลือ ${product.currentStock} ${product.unit})`);
      return;
    }

    setSaleSubmitting(true);
    try {
      const res = await executeInventoryTransaction({
        type: 'sale',
        productId: product.id,
        quantity: saleQty,
        unitPrice: saleUnitPrice,
        customerName: saleCustomerName,
        department: saleDepartment,
        operatorName: currentUser?.name || 'ผู้ดูแลคลังอุปกรณ์',
        note: saleNote,
      });

      if (res.success && res.product && res.transaction) {
        setProducts(getLocalInventoryProducts());
        setTransactions(getLocalInventoryTransactions());
        setSaleModalOpen(false);

        // Open Receipt Modal
        setLastSaleReceipt({
          tx: res.transaction,
          product: res.product,
        });
        setReceiptModalOpen(true);
      } else {
        setSaleError(res.error || 'เกิดข้อผิดพลาดในการตัดสต็อก');
      }
    } catch (err: any) {
      setSaleError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaleSubmitting(false);
    }
  };

  // Submit Restock
  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestockError(null);

    const product = products.find((p) => p.id === restockProductId);
    if (!product) {
      setRestockError('กรุณาเลือกรายการสินค้า');
      return;
    }

    if (restockQty <= 0) {
      setRestockError('กรุณาระบุจำนวนรับเข้ามากกว่า 0');
      return;
    }

    setRestockSubmitting(true);
    try {
      const res = await executeInventoryTransaction({
        type: 'restock',
        productId: product.id,
        quantity: restockQty,
        operatorName: currentUser?.name || 'ผู้ดูแลคลังอุปกรณ์',
        note: restockNote,
      });

      if (res.success) {
        setProducts(getLocalInventoryProducts());
        setTransactions(getLocalInventoryTransactions());
        setRestockModalOpen(false);
      } else {
        setRestockError(res.error || 'เกิดข้อผิดพลาดในการรับเข้า');
      }
    } catch (err: any) {
      setRestockError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setRestockSubmitting(false);
    }
  };

  // Submit Adjust
  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === adjustProductId);
    if (!product) return;

    setAdjustSubmitting(true);
    try {
      updateProductDetails(product.id, {
        price: adjustPrice,
        initialStock: adjustInitial,
      });

      // If adjust stock now differs
      if (adjustStockNow !== product.currentStock) {
        await executeInventoryTransaction({
          type: 'adjust',
          productId: product.id,
          quantity: adjustStockNow,
          unitPrice: adjustPrice,
          operatorName: currentUser?.name || 'ผู้ดูแลคลัง',
          note: `ปรับปรุงยอดสต็อกเป็น ${adjustStockNow} ${product.unit}`,
        });
      }

      setProducts(getLocalInventoryProducts());
      setTransactions(getLocalInventoryTransactions());
      setAdjustModalOpen(false);
    } catch {
      // ignore
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Copy TSV Matrix for pasting directly into Google Sheet
  const handleCopyTsvToClipboard = async () => {
    const tsv = generateInventorySheetTsv(products);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedTsvNotice(true);
      setTimeout(() => setCopiedTsvNotice(false), 3000);
    } catch {
      // fallback
    }
  };

  // Copy Apps Script code
  const handleCopyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(EQUIPMENT_INVENTORY_APPS_SCRIPT);
      setCopiedScriptNotice(true);
      setTimeout(() => setCopiedScriptNotice(false), 3000);
    } catch {
      // fallback
    }
  };

  // Save Webhook URL
  const handleSaveWebhook = () => {
    setEquipmentInventoryWebhookUrl(webhookUrlInput);
    setWebhookSaveNotice('บันทึก Webhook URL สำเร็จเรียบร้อย');
    setTimeout(() => setWebhookSaveNotice(null), 3000);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category Filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = p.categoryName.toLowerCase().includes(q);
        const matchUnit = p.unit.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchUnit) return false;
      }
      // Stock Status Filter
      if (stockStatusFilter === 'in_stock') {
        if (p.currentStock <= 0) return false;
      } else if (stockStatusFilter === 'low_stock') {
        if (p.currentStock > 15 || p.currentStock <= 0) return false;
      } else if (stockStatusFilter === 'out_of_stock') {
        if (p.currentStock > 0) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, stockStatusFilter]);

  // Overall Warehouse Metrics
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
    const totalValue = products.reduce((acc, p) => acc + p.stockValue, 0);
    const totalSoldUnits = products.reduce((acc, p) => acc + p.soldCount, 0);
    const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= 15).length;
    const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

    return {
      totalCount,
      totalStockUnits,
      totalValue,
      totalSoldUnits,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  if (!canManage) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-amber-200 dark:border-slate-800 shadow-xl overflow-hidden text-center p-8 sm:p-12 relative">
          <div className="mx-auto mb-6 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-700 to-amber-950 text-white flex items-center justify-center shadow-lg shadow-amber-950/20">
            <Warehouse className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold mb-3 shadow-2xs">
            <span>{isEn ? 'Administrators & Page Admins Only' : 'สิทธิ์เฉพาะผู้ดูแลและแอดมินเพจเท่านั้น'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-950 dark:text-stone-100 tracking-tight mb-3">
            {isEn ? 'Equipment Warehouse (Restricted)' : 'หัวข้อคลังอุปกรณ์ (จำกัดสิทธิ์)'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed mb-6">
            {isEn
              ? 'This section is strictly restricted to Administrators and Page Admins. You do not have permission to view or perform operations in the Equipment Warehouse.'
              : 'หัวข้อคลังอุปกรณ์ จำกัดสิทธิ์การมองเห็นและทำรายการได้เฉพาะผู้ดูแลและแอดมินเพจ เท่านั้น ท่านไม่มีสิทธิ์ในการเข้าถึงหรือทำรายการในส่วนนี้'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card with Animated Brown-White Gradient & Moving Warehouse Motion */}
      <div className="relative overflow-hidden rounded-3xl warehouse-header-gradient text-stone-900 dark:text-stone-100 p-6 sm:p-8 shadow-xl border border-amber-900/20 dark:border-white/10">
        {/* Soft Radial Ambient Lighting */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-96 h-96 rounded-full bg-white/30 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-40 bottom-0 w-80 h-80 rounded-full bg-amber-400/20 dark:bg-amber-600/10 blur-2xl pointer-events-none" />

        {/* Animated Floating Warehouse Icons in Header */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          {/* Floating Warehouse Building */}
          <div className="absolute top-2 right-16 text-amber-950/15 dark:text-amber-100/15 animate-warehouse-float">
            <Warehouse className="w-20 h-20" />
          </div>
          {/* Floating Boxes */}
          <div className="absolute bottom-2 right-64 text-amber-950/20 dark:text-amber-100/20 animate-warehouse-float-reverse">
            <Boxes className="w-16 h-16" />
          </div>
          {/* Floating Package */}
          <div className="absolute top-1/2 right-40 -translate-y-1/2 text-amber-950/15 dark:text-amber-100/15 animate-warehouse-drift">
            <PackageCheck className="w-14 h-14" />
          </div>
          {/* Floating Transport Truck */}
          <div className="absolute top-4 right-96 text-amber-950/12 dark:text-amber-100/12 animate-warehouse-float">
            <Truck className="w-13 h-13" />
          </div>
          {/* Floating Barcode */}
          <div className="absolute bottom-3 left-1/3 text-amber-950/15 dark:text-amber-100/15 animate-warehouse-pulse-glow">
            <Barcode className="w-12 h-12" />
          </div>
          {/* Floating Inventory Checklist */}
          <div className="absolute top-3 left-1/2 text-amber-950/15 dark:text-amber-100/15 animate-warehouse-float-reverse">
            <ClipboardList className="w-11 h-11" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Title Area with Animated Warehouse Icon */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-950/15 dark:bg-white/10 backdrop-blur-md border border-amber-900/20 dark:border-white/20 shadow-inner text-amber-950 dark:text-amber-100 shrink-0">
              <Warehouse className="w-6 h-6 sm:w-7 sm:h-7 animate-warehouse-float" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-amber-950 dark:text-stone-100">
                {isEn ? 'Equipment Warehouse' : 'คลังอุปกรณ์'}
              </h1>
              <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-xl bg-amber-950/15 dark:bg-white/15 text-amber-950 dark:text-amber-100 border border-amber-900/20 dark:border-white/20 backdrop-blur-md shadow-xs">
                {isEn ? `${products.length} Items` : `${products.length} รายการสินค้า`}
              </span>
            </div>
          </div>

          {/* Quick Actions Header Toolbar - Icon Only Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:self-start lg:self-center">
            {/* 1. Open Google Sheet ต้นทาง (Icon Only) */}
            <a
              href={EQUIPMENT_INVENTORY_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 text-amber-950 dark:text-white border border-amber-900/15 dark:border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xs inline-flex items-center justify-center group"
              title={isEn ? "Open Source Google Sheet" : "เปิดดู Google Sheet ต้นทาง"}
              aria-label={isEn ? "Open Source Google Sheet" : "เปิดดู Google Sheet ต้นทาง"}
            >
              <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </a>

            {/* 2. Copy Table to Sheet (Icon Only) */}
            <button
              onClick={handleCopyTsvToClipboard}
              className="p-2.5 rounded-xl bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 text-amber-950 dark:text-white border border-amber-900/15 dark:border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xs inline-flex items-center justify-center group"
              title={copiedTsvNotice ? (isEn ? "Copied table to clipboard!" : "คัดลอกตารางแล้ว!") : (isEn ? "Copy table to Google Sheet" : "คัดลอกตารางไปวางที่ Sheet")}
              aria-label={isEn ? "Copy table to Google Sheet" : "คัดลอกตารางไปวางที่ Sheet"}
            >
              {copiedTsvNotice ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              ) : (
                <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* 3. Settings & Webhook (Icon Only) */}
            <button
              onClick={() => setWebhookModalOpen(true)}
              className="p-2.5 rounded-xl bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 text-amber-950 dark:text-white border border-amber-900/15 dark:border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xs inline-flex items-center justify-center group"
              title={isEn ? "Settings & Webhook" : "ตั้งค่า Webhook & Google Sheet"}
              aria-label={isEn ? "Settings & Webhook" : "ตั้งค่า Webhook & Google Sheet"}
            >
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            </button>

            {/* 4. Edit Rows Restock & Price (Icon Only) */}
            <button
              onClick={() => handleOpenBatchRowEdit('both')}
              className="p-2.5 rounded-xl bg-amber-900/80 hover:bg-amber-950 text-white dark:bg-amber-600/80 dark:hover:bg-amber-600 shadow-md shadow-amber-950/20 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center group"
              title={isEn ? "Edit Rows (Restock & Price)" : "แก้ไขแถว เพิ่มสต็อก, ราคาขาย"}
              aria-label={isEn ? "Edit Rows (Restock & Price)" : "แก้ไขแถว เพิ่มสต็อก, ราคาขาย"}
            >
              <Edit3 className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
            </button>

            {/* 5. Sale / POS (Icon Only) */}
            <button
              onClick={() => handleOpenSaleModal()}
              className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center group"
              title={isEn ? "New Sale / Dispatch" : "ทำรายการขาย / เบิก"}
              aria-label={isEn ? "New Sale / Dispatch" : "ทำรายการขาย / เบิก"}
            >
              <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            {/* 6. Restock (Icon Only) */}
            <button
              onClick={() => handleOpenRestockModal()}
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white shadow-md shadow-stone-950/20 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center group"
              title={isEn ? "Restock Inventory" : "รับเข้าสต็อก"}
              aria-label={isEn ? "Restock Inventory" : "รับเข้าสต็อก"}
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in ${
              syncStatusMsg.isError
                ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
            }`}
          >
            {syncStatusMsg.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{syncStatusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">{isEn ? 'Total Items' : 'รายการสินค้า'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalCount} <span className="text-xs font-normal text-slate-400">{isEn ? 'items' : 'รายการ'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isEn ? 'Matches Google Sheet' : 'ตรงตาม Google Sheet'}</div>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">{isEn ? 'Total Current Stock' : 'คงเหลือทั้งหมด'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.totalStockUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isEn ? 'units' : 'ชิ้น'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isEn ? 'All items in warehouse' : 'ยอดรวมทุกรายการในคลัง'}</div>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">{isEn ? 'Total Stock Value' : 'มูลค่าคงเหลือรวม'}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              ฿{Math.round(metrics.totalValue).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isEn ? 'Remaining × Selling Price' : 'คงเหลือ × ราคาขาย'}</div>
          </div>
        </div>

        {/* Total Sold */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">{isEn ? 'Accumulated Sales' : 'ยอดขาย/เบิกสะสม'}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
              {metrics.totalSoldUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isEn ? 'units' : 'ชิ้น'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isEn ? 'Deducted from warehouse' : 'ตัดยอดออกไปแล้ว'}</div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">{isEn ? 'Low Stock Alert' : 'จุดเตือนสต็อกต่ำ'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.lowStockCount + metrics.outOfStockCount} <span className="text-xs font-normal text-slate-400">{isEn ? 'items' : 'รายการ'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {metrics.outOfStockCount > 0 
                ? (isEn ? `Out of stock: ${metrics.outOfStockCount}` : `หมดสต็อก ${metrics.outOfStockCount} รายการ`) 
                : (isEn ? 'Stock Ready' : 'สต็อกพร้อมใช้งาน')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>{isEn ? 'Warehouse & Equipment Stock' : 'คลังสินค้า & สต็อกอุปกรณ์'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeMainTab === 'inventory' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('pos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isEn ? 'POS / Sales & Dispatch' : 'ระบบขาย / แคชเชียร์เบิกจ่าย'}</span>
          </button>

          <button
            onClick={() => setActiveMainTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === 'history'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{isEn ? 'Transaction History' : 'ประวัติการทำรายการ'}</span>
            {transactions.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeMainTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {transactions.length}
              </span>
            )}
          </button>
        </div>

        {/* View Mode Toggle (Only in Inventory Tab) */}
        {activeMainTab === 'inventory' && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title={isEn ? "Card View (Grid)" : "มุมมองแบบการ์ด (Grid)"}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden md:inline">{isEn ? 'Cards' : 'การ์ด'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title={isEn ? "Table View" : "มุมมองแบบตารางคลังสินค้า (Table)"}
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden md:inline">{isEn ? 'Table' : 'ตาราง'}</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title={isEn ? "Google Sheet Matrix View" : "โครงสร้างแนวนอน Google Sheet"}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">{isEn ? 'Sheet Matrix' : 'ชีต Matrix'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab Content 1: Inventory Management */}
      {activeMainTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter Bar: Category & Search & Stock Status */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {INVENTORY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count =
                  cat.id === 'all'
                    ? products.length
                    : products.filter((p) => p.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{isEn ? cat.nameEn : cat.nameTh}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Stock Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? "Search equipment, code, category..." : "ค้นหาชื่ออุปกรณ์, รหัส, หมวด..."}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Select */}
              <select
                value={stockStatusFilter}
                onChange={(e: any) => setStockStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold"
              >
                <option value="all">{isEn ? 'Status: All' : 'สถานะ: ทั้งหมด'}</option>
                <option value="in_stock">{isEn ? 'In Stock' : 'พร้อมขาย (In Stock)'}</option>
                <option value="low_stock">{isEn ? 'Low Stock (≤ 15)' : 'สต็อกต่ำ (≤ 15 ชิ้น)'}</option>
                <option value="out_of_stock">{isEn ? 'Out of Stock (0)' : 'หมดสต็อก (0)'}</option>
              </select>
            </div>
          </div>

          {/* VIEW MODE: GRID CARDS */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.currentStock <= 0;
                const isLowStock = product.currentStock > 0 && product.currentStock <= 15;
                const displayName = getProductName(product, isEn);
                const displayDesc = getProductDesc(product, isEn);
                const displayCategory = getTranslatedCategory(product.category, isEn, product.categoryName);
                const displayUnit = getTranslatedUnit(product.unit, isEn);

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Category Badge & Status Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {displayCategory}
                        </span>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {isEn ? 'Out of Stock' : 'หมดสต็อก'}
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            {isEn ? 'Low Stock' : 'สต็อกต่ำ'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {isEn ? 'In Stock' : 'พร้อมจำหน่าย'}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {displayName}
                      </h3>

                      {displayDesc && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {displayDesc}
                        </p>
                      )}

                      {/* Stock Numbers Grid */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                          <div className="text-[10px] text-slate-400 font-bold">{isEn ? 'Initial' : 'ยอดตั้งต้น'}</div>
                          <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                            {product.initialStock}
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30">
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{isEn ? '+ Restock' : '+ รับเข้า'}</div>
                          <div className="text-xs font-black text-blue-700 dark:text-blue-300">
                            {product.stockIn}
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30">
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">{isEn ? 'Sold' : 'ขายแล้ว'}</div>
                          <div className="text-xs font-black text-purple-700 dark:text-purple-300">
                            {product.soldCount}
                          </div>
                        </div>
                      </div>

                      {/* Main Stock & Price Row */}
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-800/30 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold">{isEn ? 'Remaining Stock' : 'คงเหลือในคลัง'}</div>
                          <div className="text-lg font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                            <span>{product.currentStock}</span>
                            <span className="text-xs font-bold text-slate-500">{displayUnit}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold">{isEn ? 'Unit Price' : 'ราคาขายต่อหน่วย'}</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ฿{product.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenAdjustModal(product)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={isEn ? "Adjust selling price or initial stock" : "แก้ไขราคาขายหรือยอดตั้งต้น"}
                      >
                        {isEn ? 'Adjust' : 'แก้ไขราคา/ยอด'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenRestockModal(product)}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer font-bold text-xs flex items-center gap-1"
                          title={isEn ? "Restock item" : "รับสินค้าเข้าสต็อก"}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Restock' : 'รับเข้า'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenSaleModal(product)}
                          disabled={isOutOfStock}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          title={isEn ? "Sale / Dispatch item" : "ทำรายการขาย / เบิกจ่าย"}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Sell' : 'ขาย'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <tr>
                      <th className="p-3.5 w-12 text-center">#</th>
                      <th className="p-3.5">{isEn ? 'Equipment Item' : 'รายการอุปกรณ์'}</th>
                      <th className="p-3.5">{isEn ? 'Category' : 'หมวดหมู่'}</th>
                      <th className="p-3.5 text-center">{isEn ? 'Unit' : 'หน่วย'}</th>
                      <th className="p-3.5 text-right">{isEn ? 'Initial Stock' : 'ยอดตั้งต้น'}</th>
                      <th className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenBatchRowEdit('restock')}
                          className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 font-bold cursor-pointer group"
                          title={isEn ? "Click to batch edit restock for all items" : "คลิกเพื่อแก้ไขข้อมูลแถวเพิ่มสต็อกทั้งหมด"}
                        >
                          <span>{isEn ? '+ Restock' : '+ เพิ่มสต็อก'}</span>
                          <Edit3 className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                        </button>
                      </th>
                      <th className="p-3.5 text-right">{isEn ? '- Sold' : '- ขายแล้ว'}</th>
                      <th className="p-3.5 text-right">{isEn ? 'Remaining' : 'คงเหลือ'}</th>
                      <th className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenBatchRowEdit('price')}
                          className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold cursor-pointer group"
                          title={isEn ? "Click to batch edit selling prices for all items" : "คลิกเพื่อแก้ไขข้อมูลแถวราคาขายทั้งหมด"}
                        >
                          <span>{isEn ? 'Selling Price (฿)' : 'ราคาขาย (฿)'}</span>
                          <Edit3 className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                        </button>
                      </th>
                      <th className="p-3.5 text-right">{isEn ? 'Stock Value (฿)' : 'มูลค่าคงเหลือ (฿)'}</th>
                      <th className="p-3.5 text-center">{isEn ? 'Status' : 'สถานะ'}</th>
                      <th className="p-3.5 text-center">{isEn ? 'Actions' : 'การดำเนินการ'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredProducts.map((p, idx) => {
                      const isOutOfStock = p.currentStock <= 0;
                      const isLowStock = p.currentStock > 0 && p.currentStock <= 15;
                      const displayName = getProductName(p, isEn);
                      const displayCategory = getTranslatedCategory(p.category, isEn, p.categoryName);
                      const displayUnit = getTranslatedUnit(p.unit, isEn);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3.5 font-black text-slate-900 dark:text-white">
                            {displayName}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                              {displayCategory}
                            </span>
                          </td>
                          <td className="p-3.5 text-center text-slate-500">{displayUnit}</td>
                          <td className="p-3.5 text-right font-mono">{p.initialStock.toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {inlineEditCell?.id === p.id && inlineEditCell.field === 'stockIn' ? (
                              <input
                                type="number"
                                min={0}
                                autoFocus
                                defaultValue={p.stockIn}
                                onBlur={(e) => handleSaveInlineCell(p.id, 'stockIn', parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveInlineCell(p.id, 'stockIn', parseFloat((e.target as HTMLInputElement).value) || 0);
                                  } else if (e.key === 'Escape') {
                                    setInlineEditCell(null);
                                  }
                                }}
                                className="w-16 px-1.5 py-0.5 text-right rounded border-2 border-blue-500 bg-white dark:bg-slate-800 text-xs font-bold text-blue-600 shadow-sm"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInlineEditCell({ id: p.id, field: 'stockIn', val: p.stockIn })}
                                className="hover:underline hover:bg-blue-50 dark:hover:bg-blue-950/50 px-1.5 py-0.5 rounded transition-all cursor-pointer group/cell inline-flex items-center gap-1"
                                title={isEn ? "Click to edit restock quantity" : "คลิกเพื่อแก้ไขตัวเลขรับเข้าสต็อก"}
                              >
                                <span>+{p.stockIn.toLocaleString()}</span>
                                <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/cell:opacity-100 transition-opacity text-blue-400" />
                              </button>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono text-purple-600 dark:text-purple-400 font-bold">
                            {p.soldCount.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                            {p.currentStock.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {inlineEditCell?.id === p.id && inlineEditCell.field === 'price' ? (
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                autoFocus
                                defaultValue={p.price}
                                onBlur={(e) => handleSaveInlineCell(p.id, 'price', parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveInlineCell(p.id, 'price', parseFloat((e.target as HTMLInputElement).value) || 0);
                                  } else if (e.key === 'Escape') {
                                    setInlineEditCell(null);
                                  }
                                }}
                                className="w-16 px-1.5 py-0.5 text-right rounded border-2 border-emerald-500 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-600 shadow-sm"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInlineEditCell({ id: p.id, field: 'price', val: p.price })}
                                className="hover:underline hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-1.5 py-0.5 rounded transition-all cursor-pointer group/cell inline-flex items-center gap-1"
                                title={isEn ? "Click to edit price" : "คลิกเพื่อแก้ไขราคาขาย"}
                              >
                                <span>฿{p.price.toLocaleString()}</span>
                                <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/cell:opacity-100 transition-opacity text-emerald-400" />
                              </button>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold">
                            ฿{Math.round(p.stockValue).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                {isEn ? 'Out of Stock' : 'หมดสต็อก'}
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                {isEn ? 'Low Stock' : 'สต็อกต่ำ'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                {isEn ? 'Normal' : 'ปกติ'}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenSaleModal(p)}
                                disabled={isOutOfStock}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] disabled:opacity-40 cursor-pointer"
                                title={isEn ? "Sell / Dispatch" : "ขาย"}
                              >
                                {isEn ? 'Sell' : 'ขาย'}
                              </button>
                              <button
                                onClick={() => handleOpenRestockModal(p)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer"
                                title={isEn ? "Restock" : "รับเข้า"}
                              >
                                {isEn ? 'Restock' : 'รับเข้า'}
                              </button>
                              <button
                                onClick={() => handleOpenAdjustModal(p)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                title={isEn ? "Adjust" : "แก้ไข"}
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE: GOOGLE SHEET MATRIX VIEW */}
          {viewMode === 'matrix' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isEn ? 'Google Sheet Format Matrix (Horizontal Structure)' : 'โครงสร้างตารางข้อมูลตามต้นฉบับ Google Sheet (Row Matrix)'}
                  </h3>
                </div>
                <button
                  onClick={handleCopyTsvToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedTsvNotice ? (isEn ? 'Copied to clipboard!' : 'คัดลอกตารางแล้ว!') : (isEn ? 'Copy to Google Sheet' : 'คัดลอกไปวางใน Google Sheet')}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {isEn 
                  ? 'Google Sheet row format: Row 1 Product name, Row 2 Initial stock, Row 3 Restock, Row 4 Price, Row 5 Date, Row 6 Sold count, Row 7 Remaining, Row 8 Stock value'
                  : 'รูปแบบแถวตามชีต Google Sheet: แถวที่ 1 คือชื่อสินค้า, แถวที่ 2 ยอดตั้งต้น, แถวที่ 3 เพิ่มสต็อก, แถวที่ 4 ราคาขาย, แถวที่ 5 วันที่, แถวที่ 6 จำนวนขาย, แถวที่ 7 คงเหลือ, แถวที่ 8 มูลค่าคงเหลือ'}
              </p>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {/* Header Row: รายการสินค้า */}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                      <td className="p-2.5 font-sans font-bold bg-slate-200 dark:bg-slate-700 sticky left-0 z-10 whitespace-nowrap">
                        {isEn ? 'Product Item' : 'รายการสินค้า'}
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 whitespace-nowrap min-w-[140px]">
                          {getProductName(p, isEn)}
                        </td>
                      ))}
                    </tr>

                    {/* Row 2: ยอดตั้งต้น */}
                    <tr>
                      <td className="p-2.5 font-sans font-bold bg-slate-50 dark:bg-slate-800/80 sticky left-0 z-10 whitespace-nowrap">
                        {isEn ? 'Initial Stock' : 'ยอดตั้งต้น'}
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center">
                          {p.initialStock}
                        </td>
                      ))}
                    </tr>

                    {/* Row 3: เพิ่มสต็อก */}
                    <tr className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                      <td className="p-2.5 font-sans font-bold bg-slate-50 dark:bg-slate-800/80 sticky left-0 z-10 whitespace-nowrap text-blue-600">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black">{isEn ? '+ Restock' : '+ เพิ่มสต็อก'}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenBatchRowEdit('restock')}
                            className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            title={isEn ? "Batch edit restock for all items" : "แก้ไขข้อมูลแถวเพิ่มสต็อกทั้งหมด"}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isEn ? 'Edit Row' : 'แก้ไขแถวนี้'}</span>
                          </button>
                        </div>
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center text-blue-600 font-bold">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchRowEdit('restock')}
                            className="hover:underline hover:bg-blue-100/60 dark:hover:bg-blue-900/50 px-2 py-0.5 rounded cursor-pointer transition-all"
                            title={isEn ? `Click to edit restock for ${getProductName(p, isEn)}` : `คลิกเพื่อแก้ไขเพิ่มสต็อกของ ${p.name}`}
                          >
                            {p.stockIn}
                          </button>
                        </td>
                      ))}
                    </tr>

                    {/* Row 4: ราคาขาย */}
                    <tr className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                      <td className="p-2.5 font-sans font-bold bg-slate-50 dark:bg-slate-800/80 sticky left-0 z-10 whitespace-nowrap text-emerald-600">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black">{isEn ? 'Selling Price (฿)' : 'ราคาขาย (฿)'}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenBatchRowEdit('price')}
                            className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            title={isEn ? "Batch edit selling prices for all items" : "แก้ไขข้อมูลแถวราคาขายทั้งหมด"}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isEn ? 'Edit Row' : 'แก้ไขแถวนี้'}</span>
                          </button>
                        </div>
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center text-emerald-600 font-bold">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchRowEdit('price')}
                            className="hover:underline hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 px-2 py-0.5 rounded cursor-pointer transition-all"
                            title={isEn ? `Click to edit price for ${getProductName(p, isEn)}` : `คลิกเพื่อแก้ไขราคาขายของ ${p.name}`}
                          >
                            ฿{p.price}
                          </button>
                        </td>
                      ))}
                    </tr>

                    {/* Row 5: วันที่ */}
                    <tr>
                      <td className="p-2.5 font-sans font-bold bg-slate-50 dark:bg-slate-800/80 sticky left-0 z-10 whitespace-nowrap text-slate-500">
                        {isEn ? 'Date' : 'วันที่'}
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center text-[11px] text-slate-500">
                          {p.lastUpdatedDate || '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Row 6: จำนวนขาย */}
                    <tr>
                      <td className="p-2.5 font-sans font-bold bg-slate-50 dark:bg-slate-800/80 sticky left-0 z-10 whitespace-nowrap text-purple-600">
                        {isEn ? 'Sold Count' : 'จำนวนขาย'}
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center text-purple-600 font-bold">
                          {p.soldCount}
                        </td>
                      ))}
                    </tr>

                    {/* Row 7: คงเหลือ */}
                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold">
                      <td className="p-2.5 font-sans font-black bg-emerald-100/80 dark:bg-emerald-900/60 sticky left-0 z-10 whitespace-nowrap text-emerald-800 dark:text-emerald-200">
                        {isEn ? 'Remaining' : 'คงเหลือ'}
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center text-emerald-700 dark:text-emerald-300 font-black text-sm">
                          {p.currentStock}
                        </td>
                      ))}
                    </tr>

                    {/* Row 8: มูลค่าคงเหลือ (฿) */}
                    <tr className="bg-slate-50 dark:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-bold bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 whitespace-nowrap">
                        {isEn ? 'Stock Value (฿)' : 'มูลค่าคงเหลือ (฿)'}
                      </td>
                      {products.map((p) => (
                        <td key={p.id} className="p-2.5 text-center font-bold">
                          ฿{Math.round(p.stockValue).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: POS Cashier / Sales Module */}
      {activeMainTab === 'pos' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {isEn ? 'POS Sales & Equipment Dispatch' : 'ระบบขาย / แคชเชียร์เบิกจ่ายอุปกรณ์'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {isEn 
                  ? 'Record sales, immediately deduct stock, and sync in real-time with Google Sheet' 
                  : 'ทำรายการขาย ตัดสต็อกทันที และบันทึกข้อมูลแบบเรียลไทม์ลง Google Sheet'}
              </p>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-4">
              {saleError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{saleError}</span>
                </div>
              )}

              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isEn ? 'Select equipment to sell / dispatch' : 'เลือกรายการอุปกรณ์ที่ต้องการขาย / เบิก'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={saleProductId}
                  onChange={(e) => setSaleProductId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                >
                  <option value="">{isEn ? '-- Please select an item --' : '-- กรุณาเลือกรายการสินค้า --'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                      {getProductName(p, isEn)} ({isEn ? 'Remaining' : 'คงเหลือ'}: {p.currentStock} {getTranslatedUnit(p.unit, isEn)} | {isEn ? 'Price' : 'ราคา'}: ฿{p.price})
                      {p.currentStock <= 0 ? (isEn ? ' [Out of Stock]' : ' [สินค้าหมด]') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEn ? 'Quantity to sell / dispatch' : 'จำนวนที่ขาย / เบิก'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={saleQty}
                      onChange={(e) => setSaleQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-center px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sel = products.find((p) => p.id === saleProductId);
                        if (sel && saleQty < sel.currentStock) {
                          setSaleQty(saleQty + 1);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEn ? 'Selling Price per Unit (฿)' : 'ราคาขายต่อหน่วย (฿)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={saleUnitPrice}
                    onChange={(e) => setSaleUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-emerald-600 dark:text-emerald-400"
                    required
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {isEn ? 'Total Payment Amount' : 'ยอดรวมที่ต้องชำระ'}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {saleQty} {isEn ? 'items' : 'ชิ้น'} × ฿{saleUnitPrice}
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  ฿{(saleQty * saleUnitPrice).toLocaleString()}
                </div>
              </div>

              {/* Customer & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEn ? 'Buyer / Requester Name' : 'ชื่อผู้ซื้อ / ผู้เบิก'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={saleCustomerName}
                      onChange={(e) => setSaleCustomerName(e.target.value)}
                      placeholder={isEn ? "e.g. John Doe" : "เช่น สมชาย ใจดี"}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEn ? 'Department / Division' : 'แผนก / ฝ่าย'}
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={saleDepartment}
                      onChange={(e) => setSaleDepartment(e.target.value)}
                      placeholder={isEn ? "e.g. Production Line A/2" : "เช่น ฝ่ายผลิต A/2"}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isEn ? 'Additional Note' : 'หมายเหตุเพิ่มเติม'}
                </label>
                <input
                  type="text"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  placeholder={isEn ? "e.g. Replacement for damaged item, Night shift dispatch" : "เช่น ซื้อทดแทนของเดิมสูญหาย, เบิกเข้ากะกลางคืน"}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saleSubmitting || !saleProductId}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saleSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isEn ? 'Saving and updating stock...' : 'กำลังบันทึกและตัดสต็อก...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isEn ? 'Confirm Sale & Deduct Stock' : 'ยืนยันการขาย & ตัดยอดสต็อก'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content 3: Transaction History Logs */}
      {activeMainTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>{isEn ? 'Transaction History' : 'ประวัติการทำรายการ (Transaction History)'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isEn 
                  ? 'Sales, restocks, and stock adjustment logs with requester details' 
                  : 'บันทึกการขาย การรับเข้า และการปรับยอดสต็อก พร้อมข้อมูลผู้ทำรายการ'}
              </p>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              {isEn ? `Total: ${transactions.length} records` : `รายการทั้งหมด ${transactions.length} รายการ`}
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-xs">{isEn ? 'No transaction records found in system' : 'ยังไม่มีประวัติการทำรายการในระบบ'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">{isEn ? 'Date & Time' : 'วัน-เวลา'}</th>
                    <th className="p-3">{isEn ? 'Type' : 'ประเภท'}</th>
                    <th className="p-3">{isEn ? 'Equipment Item' : 'รายการอุปกรณ์'}</th>
                    <th className="p-3 text-right">{isEn ? 'Quantity' : 'จำนวน'}</th>
                    <th className="p-3 text-right">{isEn ? 'Unit Price' : 'ราคาต่อหน่วย'}</th>
                    <th className="p-3 text-right">{isEn ? 'Total Amount' : 'ยอดเงินรวม'}</th>
                    <th className="p-3">{isEn ? 'Buyer / Requester' : 'ผู้ซื้อ/ผู้เบิก'}</th>
                    <th className="p-3">{isEn ? 'Department' : 'แผนก'}</th>
                    <th className="p-3">{isEn ? 'Note' : 'หมายเหตุ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => {
                    const isSale = tx.type === 'sale';
                    const isRestock = tx.type === 'restock';
                    const txItemName = isEn && PRODUCT_NAME_EN_MAP[tx.productName] ? PRODUCT_NAME_EN_MAP[tx.productName] : tx.productName;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{tx.timestamp}</td>
                        <td className="p-3">
                          {isSale ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {isEn ? 'Sale / Dispatch' : 'ขาย / เบิก'}
                            </span>
                          ) : isRestock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {isEn ? 'Restock' : 'รับเข้าคลัง'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {isEn ? 'Adjustment' : 'ปรับปรุงสต็อก'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{txItemName}</td>
                        <td
                          className={`p-3 text-right font-mono font-black ${
                            isSale ? 'text-rose-600' : 'text-blue-600'
                          }`}
                        >
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {tx.unitPrice ? `฿${tx.unitPrice}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {tx.totalAmount ? `฿${tx.totalAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{tx.customerName || '-'}</td>
                        <td className="p-3 text-slate-500">{tx.department || '-'}</td>
                        <td className="p-3 text-slate-400 text-[11px]">{tx.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SALE / CHECKOUT MODAL */}
      {saleModalOpen && actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {isEn ? 'Sale / Equipment Dispatch' : 'ทำรายการขาย / เบิกอุปกรณ์'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Deduct stock and record transaction' : 'ตัดสต็อกและบันทึกประวัติการขาย'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-3.5">
              {saleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {saleError}
                </div>
              )}

              {/* Selected Item Info Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">
                  {isEn ? 'Selected Equipment' : 'รายการที่เลือก'}
                </div>
                <div className="font-black text-base text-slate-900 dark:text-white">
                  {getProductName(actionItem, isEn)}
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    {isEn ? 'Remaining stock: ' : 'สต็อกคงเหลือ: '}
                    <strong className="text-slate-900 dark:text-white">{actionItem.currentStock} {getTranslatedUnit(actionItem.unit, isEn)}</strong>
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {isEn ? 'Price: ' : 'ราคาขาย: '}฿{actionItem.price} / {getTranslatedUnit(actionItem.unit, isEn)}
                  </span>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? `Quantity (${getTranslatedUnit(actionItem.unit, isEn)})` : `จำนวนที่ต้องการขาย (${actionItem.unit})`}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={actionItem.currentStock}
                    value={saleQty}
                    onChange={(e) => setSaleQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-center py-2 rounded-xl text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (saleQty < actionItem.currentStock) setSaleQty(saleQty + 1);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price Per Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Selling Price per Unit (฿)' : 'ราคาต่อหน่วย (฿)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={saleUnitPrice}
                  onChange={(e) => setSaleUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  required
                />
              </div>

              {/* Buyer & Dept */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Buyer / Requester Name' : 'ชื่อผู้ซื้อ / ผู้เบิก'}
                  </label>
                  <input
                    type="text"
                    value={saleCustomerName}
                    onChange={(e) => setSaleCustomerName(e.target.value)}
                    placeholder={isEn ? "e.g. John Doe" : "ระบุชื่อผู้เบิก"}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Department' : 'แผนก'}
                  </label>
                  <input
                    type="text"
                    value={saleDepartment}
                    onChange={(e) => setSaleDepartment(e.target.value)}
                    placeholder={isEn ? "e.g. Production Line A" : "เช่น ฝ่ายผลิต A"}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Note' : 'หมายเหตุ'}
                </label>
                <input
                  type="text"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  placeholder={isEn ? "Additional notes" : "หมายเหตุเพิ่มเติม"}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {isEn ? 'Total Amount' : 'ยอดรวม'}
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  ฿{(saleQty * saleUnitPrice).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'ยกเลิก'}
                </button>
                <button
                  type="submit"
                  disabled={saleSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {saleSubmitting ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : (isEn ? 'Confirm Sale & Deduct Stock' : 'บันทึกการขาย & ตัดสต็อก')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTOCK MODAL */}
      {restockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {isEn ? 'Restock Equipment' : 'รับสินค้าเข้าคลัง (Restock)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Increase stock in Restock column and recalculate remaining' : 'เพิ่มจำนวนในช่อง \'เพิ่มสต็อก\' และคำนวณคงเหลือใหม่'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-3.5">
              {restockError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {restockError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Select item to restock' : 'เลือกสินค้าที่ต้องการรับเข้า'}
                </label>
                <select
                  value={restockProductId}
                  onChange={(e) => setRestockProductId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductName(p, isEn)} ({isEn ? 'Current stock: ' : 'คงเหลือปัจจุบัน: '}{p.currentStock} {getTranslatedUnit(p.unit, isEn)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Quantity to restock' : 'จำนวนที่รับเข้าเพิ่ม'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Note / Ref document' : 'หมายเหตุ / เอกสารอ้างอิง'}
                </label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder={isEn ? "e.g. PO-69012, Supplier shipment" : "เช่น PO-69012, รับเข้าจากซัพพลายเออร์"}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'ยกเลิก'}
                </button>
                <button
                  type="submit"
                  disabled={restockSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  {restockSubmitting ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : (isEn ? 'Save Restock' : 'บันทึกรับเข้าคลัง')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST / EDIT PRICE & INITIAL STOCK */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {isEn ? 'Adjust Selling Price & Initial Stock' : 'ปรับแก้ราคาขายและสต็อกตั้งต้น'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Edit price and initial stock row values' : 'แก้ไขข้อมูลแถวราคาขาย และยอดตั้งต้น'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Select item' : 'เลือกสินค้า'}
                </label>
                <select
                  value={adjustProductId}
                  onChange={(e) => {
                    setAdjustProductId(e.target.value);
                    const sel = products.find((p) => p.id === e.target.value);
                    if (sel) {
                      setAdjustPrice(sel.price);
                      setAdjustInitial(sel.initialStock);
                      setAdjustStockNow(sel.currentStock);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductName(p, isEn)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Selling Price per Unit (฿)' : 'ราคาขายต่อหน่วย (฿)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={adjustPrice}
                    onChange={(e) => setAdjustPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-black text-emerald-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Initial Stock' : 'ยอดตั้งต้น'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={adjustInitial}
                    onChange={(e) => setAdjustInitial(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Update Current Stock Immediately (Optional)' : 'ปรับปรุงยอดคงเหลือจริง (ถ้าต้องการเปลี่ยนสต็อกทันที)'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={adjustStockNow}
                  onChange={(e) => setAdjustStockNow(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-black text-blue-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'ยกเลิก'}
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
                >
                  {adjustSubmitting ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : (isEn ? 'Save Changes' : 'บันทึกการเปลี่ยนแปลง')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH ROW EDIT (แก้ไขข้อมูลแถว เพิ่มสต็อก, ราคาขาย) */}
      {batchRowEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      {isEn ? 'Batch Row Edit: Restock & Selling Price' : 'แก้ไขข้อมูลแถว: เพิ่มสต็อก, ราคาขาย'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      {batchRowsData.length} {isEn ? 'items' : 'รายการ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEn 
                      ? 'Edit "Restock" and "Selling Price" for all items with real-time recalculation' 
                      : 'ปรับแก้จำนวนในแถว "เพิ่มสต็อก" และ "ราคาขาย" ของสินค้าทั้งหมด พร้อมคำนวณยอดคงเหลือและมูลค่าแบบเรียลไทม์'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBatchRowEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header: Mode switch, Search & Quick Bulk Actions */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/60 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBatchEditMode('both')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      batchEditMode === 'both'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {isEn ? 'Both Rows' : 'แก้ไขทั้งสองแถว'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchEditMode('restock')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      batchEditMode === 'restock'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{isEn ? 'Restock Only' : 'เฉพาะแถวเพิ่มสต็อก'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchEditMode('price')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      batchEditMode === 'price'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{isEn ? 'Price Only' : 'เฉพาะแถวราคาขาย'}</span>
                  </button>
                </div>

                {/* Quick Bulk Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetAllStockIn}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                    title={isEn ? "Set 'Restock' to 0 for all items" : "ตั้งค่า 'เพิ่มสต็อก' เป็น 0 ทุกรายการ"}
                  >
                    {isEn ? 'Reset All Restock to 0' : 'รีเซ็ตเพิ่มสต็อกเป็น 0 ทั้งหมด'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreGoogleSheetPrices}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 dark:border-emerald-900 transition-colors cursor-pointer"
                    title={isEn ? "Restore prices matching source Google Sheet" : "คืนค่าราคาขายตามตาราง Google Sheet ต้นทาง"}
                  >
                    {isEn ? 'Restore Google Sheet Prices' : 'คืนค่าราคาขายตาม Google Sheet'}
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={batchSearchTerm}
                    onChange={(e) => setBatchSearchTerm(e.target.value)}
                    placeholder={isEn ? `Search items among ${batchRowsData.length} products...` : `ค้นหาชื่อสินค้าใน ${batchRowsData.length} รายการ...`}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setBatchCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      batchCategoryFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isEn ? `All Categories (${batchRowsData.length})` : `ทุกหมวด (${batchRowsData.length})`}
                  </button>
                  {INVENTORY_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setBatchCategoryFilter(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        batchCategoryFilter === c.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isEn ? c.nameEn : c.nameTh}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Area (Scrollable) */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">{isEn ? 'Equipment Item' : 'รายการอุปกรณ์'}</th>
                    <th className="p-3 text-center">{isEn ? 'Unit' : 'หน่วย'}</th>
                    <th className="p-3 text-right">{isEn ? 'Initial Stock' : 'ยอดตั้งต้น'}</th>
                    {(batchEditMode === 'both' || batchEditMode === 'restock') && (
                      <th className="p-3 text-right text-blue-600 dark:text-blue-400 min-w-[150px]">
                        {isEn ? '+ Restock' : '+ เพิ่มสต็อก'}
                      </th>
                    )}
                    {(batchEditMode === 'both' || batchEditMode === 'price') && (
                      <th className="p-3 text-right text-emerald-600 dark:text-emerald-400 min-w-[140px]">
                        {isEn ? 'Selling Price (฿)' : 'ราคาขาย (฿)'}
                      </th>
                    )}
                    <th className="p-3 text-right">{isEn ? 'Sold' : 'ขายแล้ว'}</th>
                    <th className="p-3 text-right">{isEn ? 'New Remaining' : 'คงเหลือคำนวณใหม่'}</th>
                    <th className="p-3 text-right">{isEn ? 'Stock Value (฿)' : 'มูลค่าคงเหลือ (฿)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {batchRowsData
                    .filter((item) => {
                      const matchSearch =
                        !batchSearchTerm ||
                        item.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
                        (isEn && PRODUCT_NAME_EN_MAP[item.name]?.toLowerCase().includes(batchSearchTerm.toLowerCase()));
                      const matchCat =
                        batchCategoryFilter === 'all' || item.category === batchCategoryFilter;
                      return matchSearch && matchCat;
                    })
                    .map((item, index) => {
                      const newRemaining = Math.max(0, item.initialStock + item.stockIn - item.soldCount);
                      const newStockVal = newRemaining * item.price;
                      const itemName = getProductName(item, isEn);
                      const catName = getTranslatedCategory(item.category, isEn, item.categoryName);
                      const unitName = getTranslatedUnit(item.unit, isEn);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3 text-center text-slate-400">{index + 1}</td>
                          <td className="p-3 font-sans font-black text-slate-900 dark:text-white">
                            <div>{itemName}</div>
                            <span className="text-[10px] font-normal text-slate-400 font-sans">
                              {catName}
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans text-slate-500">{unitName}</td>
                          <td className="p-3 text-right text-slate-500 font-bold">
                            {item.initialStock}
                          </td>

                          {/* Editable: เพิ่มสต็อก */}
                          {(batchEditMode === 'both' || batchEditMode === 'restock') && (
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBatchRowChange('id' in item ? item.id : '', 'stockIn', Math.max(0, item.stockIn - 5))
                                  }
                                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
                                  title={isEn ? "Decrease 5" : "ลด 5"}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={item.stockIn}
                                  onChange={(e) =>
                                    handleBatchRowChange(item.id, 'stockIn', parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-20 px-2 py-1 rounded-lg border-2 border-blue-400/80 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-black text-right text-xs focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBatchRowChange(item.id, 'stockIn', item.stockIn + 5)
                                  }
                                  className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 text-blue-700 font-bold flex items-center justify-center cursor-pointer"
                                  title={isEn ? "Increase 5" : "เพิ่ม 5"}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Editable: ราคาขาย */}
                          {(batchEditMode === 'both' || batchEditMode === 'price') && (
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-emerald-600 font-bold font-sans">฿</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={item.price}
                                  onChange={(e) =>
                                    handleBatchRowChange(item.id, 'price', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 px-2 py-1 rounded-lg border-2 border-emerald-400/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black text-right text-xs focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            </td>
                          )}

                          <td className="p-3 text-right text-purple-600 font-bold">{item.soldCount}</td>

                          {/* Calculated New Remaining */}
                          <td className="p-3 text-right font-black text-sm text-slate-900 dark:text-white">
                            {newRemaining}
                          </td>

                          {/* Calculated New Value */}
                          <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                            ฿{Math.round(newStockVal).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer with Live Totals & Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
              {/* Summary calculations */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-sans">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {isEn ? 'Total Restock Added:' : 'รวมเพิ่มสต็อกทั้งหมด:'}
                  </span>
                  <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-sm">
                    {batchRowsData.reduce((acc, cur) => acc + cur.stockIn, 0).toLocaleString()} {isEn ? 'items' : 'ชิ้น'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {isEn ? 'New Total Stock Value:' : 'มูลค่าสต็อกรวมใหม่:'}
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                    ฿{Math.round(
                      batchRowsData.reduce(
                        (acc, cur) =>
                          acc + Math.max(0, cur.initialStock + cur.stockIn - cur.soldCount) * cur.price,
                        0
                      )
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setBatchRowEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'ยกเลิก'}
                </button>
                <button
                  type="button"
                  disabled={batchSaving}
                  onClick={handleSaveBatchRows}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                    batchSaveSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/25'
                  }`}
                >
                  {batchSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isEn ? 'Saving data...' : 'กำลังบันทึกข้อมูล...'}</span>
                    </>
                  ) : batchSaveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEn ? 'Saved successfully!' : 'บันทึกสำเร็จแล้ว!'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEn ? 'Save Row Data' : 'บันทึกข้อมูลแถวลงระบบ'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WEBHOOK & GOOGLE SHEET INTEGRATION */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {isEn ? 'Google Sheet & Webhook Integration' : 'การเชื่อมต่อ Google Sheet & Webhook'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Configure automatic sync to Google Sheet' : 'ตั้งค่าการบันทึกรายการลงใน Google Sheet แบบอัตโนมัติ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWebhookModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Google Sheet Details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isEn ? 'Connected Google Sheet:' : 'Google Sheet ที่เชื่อมต่อ:'}</span>
                <span className="text-[11px] font-mono text-slate-400">GID: 172141710</span>
              </div>
              <a
                href={EQUIPMENT_INVENTORY_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 break-all font-mono"
              >
                <span>{EQUIPMENT_INVENTORY_SHEET_URL}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isEn 
                  ? 'Google Apps Script Webhook URL (For automatic live sheet cell updates)' 
                  : 'Google Apps Script Webhook URL (สำหรับการอัปเดตเซลล์ในชีตสดอัตโนมัติ)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isEn ? 'Save' : 'บันทึก'}
                </button>
              </div>
              {webhookSaveNotice && (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{webhookSaveNotice}</span>
                </div>
              )}
            </div>

            {/* Apps Script Guide & Code */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-slate-800 dark:text-white">
                  {isEn ? 'Ready-to-use Google Apps Script code for installation:' : 'โค้ด Google Apps Script สำเร็จรูปสำหรับติดตั้งในชีต:'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {copiedScriptNotice 
                      ? (isEn ? 'Code Copied!' : 'คัดลอกโค้ดแล้ว!') 
                      : (isEn ? 'Copy Code' : 'คัดลอกโค้ด')}
                  </span>
                </button>
              </div>

              {isEn ? (
                <div className="text-[11px] text-slate-500 space-y-1 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="font-bold text-amber-800 dark:text-amber-300">Quick Installation Steps (1 minute):</div>
                  <div>1. Open Google Sheet via the link above</div>
                  <div>2. Go to <strong>Extensions</strong> &gt; <strong>Apps Script</strong></div>
                  <div>3. Delete existing code, paste the copied code, and click <strong>Save</strong></div>
                  <div>4. Click <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; Select <strong>Web app</strong></div>
                  <div>5. Set Who has access: <strong>Anyone</strong>, click Deploy, and copy the Web App URL into the input above</div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 space-y-1 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="font-bold text-amber-800 dark:text-amber-300">ขั้นตอนการติดตั้ง (เพียง 1 นาที):</div>
                  <div>1. เปิด Google Sheet ลิงก์ด้านบน</div>
                  <div>2. ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></div>
                  <div>3. ลบโค้ดเดิมแล้ววางโค้ดที่คัดลอกลงไป แล้วกด <strong>บันทึก</strong></div>
                  <div>4. กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่</strong> &gt; เลือก <strong>เว็บแอป (Web app)</strong></div>
                  <div>5. ตั้งค่า Who has access: <strong>Anyone (ทุกคน)</strong> แล้วก๊อปปี้ URL มาวางในช่องด้านบน</div>
                </div>
              )}

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                  {EQUIPMENT_INVENTORY_APPS_SCRIPT}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setWebhookModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                {isEn ? 'Close' : 'ปิดหน้าต่าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RECEIPT PREVIEW MODAL */}
      {receiptModalOpen && lastSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                {isEn ? 'Sale Recorded Successfully!' : 'บันทึกรายการขายสำเร็จ!'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEn ? 'Stock deducted and transaction logged successfully' : 'ระบบได้ตัดสต็อกและบันทึกประวัติเรียบร้อยแล้ว'}
              </p>
            </div>

            {/* Bill Receipt Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-2 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700 font-sans font-bold text-slate-800 dark:text-slate-200">
                {isEn ? 'Equipment Sale / Dispatch Voucher' : 'ใบสำคัญการขาย / เบิกอุปกรณ์'}
                <div className="text-[10px] font-normal text-slate-400">
                  {isEn ? 'Lat Krabang Factory 2 Warehouse' : 'คลังโรงงานลาดกระบัง 2'}
                </div>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>{isEn ? 'Date:' : 'วันที่:'}</span>
                <span>{lastSaleReceipt.tx.timestamp}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isEn ? 'Buyer/Requester:' : 'ผู้ซื้อ/เบิก:'}</span>
                <span className="font-sans font-bold text-slate-800 dark:text-slate-200">{lastSaleReceipt.tx.customerName || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isEn ? 'Department:' : 'แผนก:'}</span>
                <span className="font-sans font-bold text-slate-800 dark:text-slate-200">{lastSaleReceipt.tx.department || '-'}</span>
              </div>

              <div className="py-2 border-y border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                <div className="font-sans font-bold text-slate-900 dark:text-white">
                  {isEn && PRODUCT_NAME_EN_MAP[lastSaleReceipt.tx.productName] 
                    ? PRODUCT_NAME_EN_MAP[lastSaleReceipt.tx.productName] 
                    : lastSaleReceipt.tx.productName}
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>{Math.abs(lastSaleReceipt.tx.quantity)} × ฿{lastSaleReceipt.tx.unitPrice}</span>
                  <span className="font-bold text-slate-900 dark:text-white">฿{lastSaleReceipt.tx.totalAmount?.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1">
                <span>{isEn ? 'Total Amount:' : 'ยอดเงินรวม:'}</span>
                <span className="text-emerald-600">฿{lastSaleReceipt.tx.totalAmount?.toLocaleString()}</span>
              </div>

              <div className="text-[10px] text-slate-400 text-center pt-2">
                {isEn 
                  ? `Remaining stock after this transaction: ${lastSaleReceipt.product.currentStock} ${getTranslatedUnit(lastSaleReceipt.product.unit, isEn)}` 
                  : `คงเหลือในคลังหลังรายการนี้: ${lastSaleReceipt.product.currentStock} ${lastSaleReceipt.product.unit}`}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isEn ? 'Print Voucher' : 'พิมพ์ใบสำคัญ'}</span>
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
              >
                {isEn ? 'Done' : 'เสร็จสิ้น'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
