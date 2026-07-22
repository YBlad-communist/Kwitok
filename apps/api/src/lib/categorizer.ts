import prisma from './prisma';

const keywordRules: { keywords: string[]; categoryName: string }[] = [
  { keywords: ['lidl', 'rima', 'maxima', 'supermarket', 'elvi', 'coop', 'продукты', 'продуктовый'], categoryName: 'Продукты' },
  { keywords: ['bolt', 'taxify', 'uber', 'такси', 'автобус', 'транспорт', 'metro', 'parking', 'парковка'], categoryName: 'Транспорт' },
  { keywords: ['netflix', 'spotify', 'youtube', 'apple.com/bill', 'patreon', 'figma', 'notion', 'google storage'], categoryName: 'Подписки' },
  { keywords: ['wolt', 'bolt food', 'dining', 'ресторан', 'cafe', 'кафе', 'доставка'], categoryName: 'Рестораны' },
  { keywords: ['electric', 'latvenergo', 'tet', 'газ', 'вода', 'коммунальные', 'отопление'], categoryName: 'ЖКХ' },
  { keywords: ['apteka', 'аптека', 'doctor', 'врач', 'hospital', 'больница', 'лаборатория'], categoryName: 'Здоровье' },
  { keywords: ['cinema', 'кино', 'steam', 'playstation', 'xbox', 'геймпад', 'theatre', 'театр'], categoryName: 'Развлечения' },
];

export async function categorizeTransaction(
  merchantName: string | null | undefined,
  description: string | null | undefined,
  userId: string
): Promise<string | null> {
  const searchText = `${merchantName || ''} ${description || ''}`.toLowerCase().trim();
  if (!searchText) return null;

  const rule = await prisma.merchantCategoryRule.findFirst({
    where: { merchantMatch: { contains: searchText, mode: 'insensitive' } },
  });
  if (rule) return rule.categoryId;

  for (const kRule of keywordRules) {
    if (kRule.keywords.some((kw) => searchText.includes(kw))) {
      const sysCat = await prisma.category.findFirst({
        where: { isSystem: true, name: kRule.categoryName },
      });
      if (sysCat) return sysCat.id;
    }
  }

  const otherCat = await prisma.category.findFirst({
    where: { userId, isSystem: false, name: 'Прочее' },
  });
  if (otherCat) return otherCat.id;

  const sysOther = await prisma.category.findFirst({
    where: { isSystem: true, name: 'Прочее' },
  });
  return sysOther?.id || null;
}
