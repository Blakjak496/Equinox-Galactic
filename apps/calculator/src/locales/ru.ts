const ru = {
  language: "Язык",
  contractDetailsTitle: "Параметры контракта",
  contractDetailsSubtitle: "Введите параметры контракта для расчёта стоимости",
  ratePerM3: "ISK/m³",
  collateralPercent: "Коллатерал",
  minimum: "Минимум",
  origin: "Откуда",
  destination: "Куда",
  selectOrigin: "Выберите точку отправления",
  selectDestination: "Выберите точку назначения",
  copyToClipboard: "Скопировать",
  appraisalPlaceholder:
    "Введите список предметов для оценки\n\nнапример:\n\nTritanium 22222\nPyerite 8000\nMexallon 2444",
  getAppraisal: "Получить оценку",
  loading: "Загрузка...",
  viewAppraisalOnJanice: "Открыть оценку в Janice",
  orEnterManually: "Или введите вручную",
  volumeOverMaxTitle: "Объём превышает максимум для выбранного маршрута.",
  volumeOverMaxBody: "Разделите груз на несколько контрактов.",
  collateralOverMaxTitle:
    "Коллатерал превышает максимум, допустимый для одного контракта.",
  collateralOverMaxBody:
    "Вы всё ещё можете разделить груз на несколько контрактов.",
  volume: "Объём (m³)",
  volumeMax: "макс: {max}",
  volumePlaceholder: "например 375,000",
  collateralIsh: "Коллатерал (ISK)",
  collateralMax: "макс: 15,000,000,000",
  note: "ВНИМАНИЕ:",
  noteNpcStations:
    "В настоящее время станции NPC не обслуживаются. Контракты с получением или доставкой на станции NPC будут отклонены",
  noteStructures:
    "Структуры должны принадлежать WinterCo, чтобы гарантировать возможность стыковки",
  rush: "Срочная доставка (+{amount} ISK)",
  rushDescriptionShort:
    "Приоритетный контракт. Загружается раньше обычных контрактов.",

  quoteTitle: "Расчёт",
  quoteSubtitle: "Итог и детализация",
  quoteRushFee: "Доплата за срочность",
  totalReward: "Итоговая стоимость",
  contractSettings: "Параметры контракта",
  availability: "Доступность:",
  issuer: "Equinox Galactic",
  reward: "Награда:",
  description: "Описание:",
  rushLabel: "Срочно",
  collateralLabel: "Коллатерал:",
  expiration: "Срок действия:",
  expirationValue: "2 недели",
  daysToComplete: "Срок выполнения:",
  daysToCompleteValue: "7",
  allRoutesTitle: "Все маршруты",
  route: "Маршрут",
  ratePerM3Table: "Тариф (ISK/m³)",
  minimumReward: "Минимальная награда (ISK)",
  collateralFee: "Комиссия за коллатерал",
  rushPrice: "Цена срочности (ISK)",
  maxVolume: "Макс. объём (m³)",

  buybackPageTitle: "Расчёт скупки",
  buybackPageSubtitle:
    "Вставьте список предметов, чтобы получить постатейное предложение по скупке",
  pickupLocation: "Место получения",
  selectLocation: "Выберите место",
  getQuote: "Рассчитать",

  itemizedTitle: "Постатейные результаты",
  colItem: "Предмет",
  colVolume: "Объём (м³)",
  colQuantity: "Кол-во",
  colJbvPerUnit: "JBV / шт.",
  colTotalJbv: "Итого JBV",
  colPercentOffered: "% предложения",
  colOfferValue: "Сумма предложения",
  colAccepted: "Принято",
  statusAccepted: "Принято",
  statusNotAccepted: "Сейчас не принимается",

  summaryTitle: "Итог по расчёту",
  notAcceptedWarning:
    "{count} предмет(ов) в вашем списке сейчас не принимаются. Проверьте детализацию выше и удалите их перед созданием контракта.",
  itemsNotAccepted: "Не принято предметов",
  itemsAccepted: "Принято предметов",
  volumeAccepted: "Объём (принятые)",
  totalJbvAccepted: "Итого JBV (принятые)",
  haulingFee: "Плата за м³",
  pickupFee: "Плата за забор груза",
  totalOfferFinal: "Итоговое предложение",

  referenceIdRejectedNote:
    "Укажите этот номер ссылки в описании контракта. Контракты без него будут отклонены.",
  privateAvailability: "Приватно для Equinox Galactic",
  iWillReceive: "Я получу",
  buybackExpirationValue: "4 недели",

  capExceededTitle: "Заявка слишком большая",
  capExceededNote:
    "Итоговая сумма по этой заявке превышает лимит в 20 000 000 000 ISK. Пожалуйста, разделите заявку на несколько отдельных заявок.",

  buybackErrorGeneric:
    "Что-то пошло не так при расчёте. Пожалуйста, попробуйте снова.",
} as const;

export default ru;
