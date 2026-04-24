/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  // @TODO: Расчет выручки от операции
    if (!purchase) return 0;
    const { discount, sale_price, quantity } = purchase;
    if (
    typeof discount !== "number" ||
    typeof sale_price !== "number" ||
    typeof quantity !== "number"
    )
    return 0;
    if (sale_price < 0 || quantity < 0) return 0;
    const simpleRevenue = sale_price * quantity * (1 - discount / 100);
    return simpleRevenue;
    }

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
    if (typeof index !== "number") return 0;
    if (typeof total !== "number" || total <= 0) return 0;
    if (!seller || typeof seller.profit !== "number") return 0;

    const { profit } = seller;

    if (index === 0) {
    return seller.profit * 0.15;
    } else if (index === 1 || index === 2) {
    return seller.profit * 0.1;
    } else if (index === total - 1) {
    return 0;
    } else {
    return seller.profit * 0.05;
    }
    }

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        data.sellers.length === 0 ||
        !Array.isArray(data.products) ||
        data.products.length === 0 ||
        !Array.isArray(data.purchase_records) ||
        data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }
  // @TODO: Проверка наличия опций
const { calculateRevenue, calculateBonus } = options;
  //Проверка, что опции определены и являются функциями
if (typeof calculateRevenue === "undefined") {
    throw new Error("Опция calculateRevenue не определена");
}
if (typeof calculateBonus === "undefined") {
    throw new Error("Опция calculateBonus не определена");
}
if (typeof calculateRevenue !== "function") {
    throw new Error("calculateRevenue должна быть функцией");
}
if (typeof calculateBonus !== "function") {
    throw new Error("calculateBonus должна быть функцией");
}

  // @TODO: Подготовка промежуточных данных для сбора статистики
const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
}));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  // Создаём быстрый доступ к статистике по id
const statsById = Object.fromEntries(
    sellerStats.map((stat) => [stat.id, stat]),
);
  //Индекс продавцов
const sellerIndex = data.sellers.reduce((index, seller) => {
    if (statsById[seller.id]) {
    index[seller.id] = statsById[seller.id];
    }
    return index;
}, {});
  // Индекс товаров
const productIndex = data.products.reduce((index, product) => {
    index[product.sku] = product;
    return index;
}, {});

  // @TODO: Расчет выручки и прибыли для каждого продавца
data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    // Увеличить количество продаж
    seller.sales_count++;
    // Увеличить общую сумму выручки всех продаж
    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара
record.items.forEach((item) => {
    const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
    const cost = (product.purchase_price || 0) * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию
    const revenue = calculateSimpleRevenue(item);
      // Посчитать прибыль: выручка минус себестоимость
    const profit = revenue - cost;
      // Увеличить общую накопленную прибыль (profit) у продавца
    seller.profit += profit;

      // Учёт количества проданных товаров
    if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
    }
      // По артикулу товара увеличить его проданное количество у продавца
    seller.products_sold[item.sku] += item.quantity;
    });
});
  // @TODO: Сортировка продавцов по прибыли
  // @TODO: Назначение премий на основе ранжирования
sellerStats.sort((a, b) => b.profit - a.profit);
const totalSellers = sellerStats.length;
const topProducts = sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, totalSellers, seller); // Считаем бонус в рублях
    // Формируем топ-10 товаров
    seller.top_products = Object.entries(seller.products_sold)
    .map(([sku, quantity]) => ({
        sku,
        quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
});
  // @TODO: Подготовка итоговой коллекции с нужными полями
return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
}));
}
