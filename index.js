const http = require('http');

function calculatePiNilakantha(iterations, decimals) {
    if (!Number.isInteger(iterations) || iterations <= 0) {
        throw new Error("Количество итераций должно быть положительным целым числом.");
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
        throw new Error("Количество знаков должно быть целым числом от 0 до 20.");
    }

    let pi = 3;
    let sign = 1;

    for (let i = 2; i < 2 * iterations; i += 2) {
        pi += sign * (4 / (i * (i + 1) * (i + 2)));
        sign *= -1;
    }

    return pi.toFixed(decimals);
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    const fio = 'Черепович Владислав Дмитриевич';
    const group = '401';
    const piValue = calculatePiNilakantha(1_000_000, 10);

    const html = `
        <h1>${fio}</h1>
        <p>Группа: ${group}</p>
        <p>Число π (10 знаков): ${piValue}</p>
    `;

    res.end(html);
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
