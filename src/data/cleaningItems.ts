export interface CleaningFormItem {
  id: number;
  name: string;
  category?: string;
}

export const CLEANING_FORM_ITEMS: CleaningFormItem[] = [
  { id: 862459513, name: 'กระดาษไข', category: 'เครื่องเขียน/สำนักงาน' },
  { id: 1735750892, name: 'กระดาษโรเนียว', category: 'เครื่องเขียน/สำนักงาน' },
  { id: 1701816844, name: 'กระบอกฉีด (ป็อกกี้)', category: 'อุปกรณ์ฉีด/เช็ด' },
  { id: 2036639366, name: 'กาแฟ', category: 'เครื่องดื่ม/อาหารว่าง' },
  { id: 1970600240, name: 'กาลักน้ำ', category: 'อุปกรณ์ทั่วไป' },
  { id: 1197690768, name: 'ชามะลิ', category: 'เครื่องดื่ม/อาหารว่าง' },
  { id: 2032978359, name: 'ซองไม้ปาดน้ำ', category: 'อุปกรณ์ปาดน้ำ' },
  { id: 1891340887, name: 'โซดาไฟ', category: 'น้ำยา/เคมีภัณฑ์' },
  { id: 2118852996, name: 'ครีมเทียม', category: 'เครื่องดื่ม/อาหารว่าง' },
  { id: 1218891465, name: 'ด้ามถูพื้น', category: 'ไม้ถูพื้น/ด้ามจับ' },
  { id: 679164987, name: 'ด้ามที่ปาดน้ำ', category: 'อุปกรณ์ปาดน้ำ' },
  { id: 1244569853, name: 'ถุงพลาสติกรีไซเคิล', category: 'ถุง/บรรจุภัณฑ์' },
  { id: 1940594045, name: 'ถุงมือยางสีเขียว', category: 'อุปกรณ์ป้องกัน' },
  { id: 1500287575, name: 'ที่คีบขยะ', category: 'อุปกรณ์ทำความสะอาด' },
  { id: 782226559, name: 'ที่เช็ดกระจก', category: 'อุปกรณ์ฉีด/เช็ด' },
  { id: 153246680, name: 'ที่ตักขยะ', category: 'อุปกรณ์ทำความสะอาด' },
  { id: 1650691541, name: 'ธูปขาว', category: 'ของใช้ทั่วไป' },
  { id: 2088814470, name: 'ธูปดำ', category: 'ของใช้ทั่วไป' },
  { id: 1394872525, name: 'นมกล่องห้องพยาบาล', category: 'เครื่องดื่ม/อาหารว่าง' },
  { id: 899100949, name: 'น้ำดื่ม', category: 'เครื่องดื่ม/อาหารว่าง' },
  { id: 1750982925, name: 'น้ำตาลทราย', category: 'เครื่องดื่ม/อาหารว่าง' },
  { id: 449127466, name: 'น้ำยาเป็ด', category: 'น้ำยา/เคมีภัณฑ์' },
  { id: 1161869487, name: 'แปรงขัดเล็บ', category: 'แปรง/ขัด' },
  { id: 739397169, name: 'แปรงขัดรองเท้า', category: 'แปรง/ขัด' },
  { id: 574227140, name: 'แปรงขัดพื้นด้ามยาว', category: 'แปรง/ขัด' },
  { id: 406087586, name: 'แปรงขัดโถส้วม', category: 'แปรง/ขัด' },
  { id: 119626469, name: 'แปรงทองเหลือง', category: 'แปรง/ขัด' },
  { id: 84421736, name: 'แปรงทาสี', category: 'แปรง/ขัด' },
  { id: 1964739147, name: 'ไม้กวาดแข็ง', category: 'ไม้กวาด' },
  { id: 418454559, name: 'ไม้กวาดอ่อน', category: 'ไม้กวาด' },
  { id: 1987473054, name: 'ไม้กวาดหยากไย่', category: 'ไม้กวาด' },
  { id: 794467520, name: 'ผ้าถูพิ้น', category: 'ไม้ถูพื้น/ด้ามจับ' },
  { id: 1660148758, name: 'แผ่นกาวดักแมลง', category: 'อุปกรณ์ดักแมลง' },
  { id: 151524884, name: 'ฝอยสแตนเลส', category: 'ฟองน้ำ/ฝอยขัด' },
  { id: 1514188694, name: 'สก็อตไบร์ท', category: 'ฟองน้ำ/ฝอยขัด' },
  { id: 555546017, name: 'สก็อตไบร์ทฟองน้ำ', category: 'ฟองน้ำ/ฝอยขัด' },
  { id: 96122722, name: 'สเปรย์ปรับอากาศ', category: 'น้ำยา/เคมีภัณฑ์' },
  { id: 1161787169, name: 'หลอดไฟดักแมลง', category: 'อุปกรณ์ดักแมลง' },
  { id: 2015085314, name: 'หมึกโรเนียว', category: 'เครื่องเขียน/สำนักงาน' },
  { id: 1966969678, name: 'โอวัลติน', category: 'เครื่องดื่ม/อาหารว่าง' },
];

export const CLEANING_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSc_z8qRUirSajn070DxgHIa7MWuNy8Sn7Rj0b_QuBLC7ow25A/viewform?usp=pp_url';
export const CLEANING_FORM_ACTION_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSc_z8qRUirSajn070DxgHIa7MWuNy8Sn7Rj0b_QuBLC7ow25A/formResponse';
export const CLEANING_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1ghnlCzcIq9A6rGVrZtEqiVA0bGFdqO3ZhbuYLhyBViw/edit?gid=1432727518#gid=1432727518';
