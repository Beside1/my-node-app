const FIRST_NAMES = ['Александр', 'Анна', 'Иван', 'Мария', 'Пётр', 'Елена',
  'Сергей', 'Ольга', 'Дмитрий', 'Наталья', 'Алексей', 'Екатерина'];
const LAST_NAMES = ['Иванов', 'Петров', 'Смирнов', 'Кузнецов', 'Соколов',
  'Попов', 'Лебедев', 'Козлов', 'Новиков', 'Морозов'];
const GROUPS = ['ББМО-01-23', 'ББМО-02-23', 'ББМО-03-23'];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateStudents(count = 50, baseGroup = 'ББМО-01-23') {
  const students = [];
  for (let i = 1; i <= count; i++) {
    const isFemale = Math.random() > 0.5;
    const firstName = randomFrom(FIRST_NAMES);
    const lastName = randomFrom(LAST_NAMES);
    const name = isFemale ? `${lastName}а ${firstName}` : `${lastName} ${firstName}`;

    students.push({
      id: i,
      name,
      group: i % 3 === 0 ? randomFrom(GROUPS) : baseGroup,
      course: 1 + Math.floor(Math.random() * 4),
    });
  }
  return students;
}

module.exports = { generateStudents };