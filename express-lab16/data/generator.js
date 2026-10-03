// Генератор тестовых книг на основе номера группы
const TITLES = [
  'Война и мир', 'Преступление и наказание', 'Мастер и Маргарита',
  'Идиот', 'Анна Каренина', 'Отцы и дети', 'Мёртвые души',
  'Тихий Дон', 'Доктор Живаго', 'Евгений Онегин',
  'Герой нашего времени', 'Ревизор', 'Белая гвардия',
  'Собачье сердце', 'Пиковая дама', 'Шинель',
];
const AUTHORS = [
  'Толстой', 'Достоевский', 'Булгаков', 'Тургенев',
  'Гоголь', 'Шолохов', 'Пастернак', 'Пушкин', 'Лермонтов',
];
const GENRES = ['роман', 'повесть', 'поэма', 'драма', 'рассказ', 'комедия'];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Простой генератор ISBN-13 (уникальный через суффикс id)
function generateISBN(id) {
  const prefix = '978';
  const group = '5';
  const publisher = String(id).padStart(4, '0').slice(-4);
  const body = prefix + group + publisher + String(randomInt(100000, 999999));
  const checkDigit = body.split('').reduce((s, d) => s + Number(d), 0) % 10;
  return `${prefix}-${group}-${publisher}-${body.slice(-6)}-${checkDigit}`;
}

function generateBooks(count = 100, baseGroup = 'ББМО-01-23') {
  const books = [];
  for (let i = 1; i <= count; i++) {
    books.push({
      id: i,
      title: `${randomFrom(TITLES)} (изд. ${i})`,
      author: randomFrom(AUTHORS),
      year: randomInt(1800, 2020),
      genre: randomFrom(GENRES),
      isbn: generateISBN(i),
      available: Math.random() > 0.3,
      reviews: [],
      sourceGroup: baseGroup,
    });
  }
  return books;
}

module.exports = { generateBooks };
