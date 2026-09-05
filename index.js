const http = require('http');

function calculatePi(decimals) {
    const scale = 10n ** BigInt(decimals + 10);
    let pi = 0n;
    let sign = 1n;
    const iterations = 1000000;
    
    for (let i = 0n; i < BigInt(iterations); i++) {
        const term = scale / (2n * i + 1n);
        pi += sign * term;
        sign = -sign;
    }
    pi = pi * 4n;
    
    let piStr = pi.toString();
    if (piStr.length <= decimals) {
        piStr = '0'.repeat(decimals - piStr.length + 1) + piStr;
    }
    const integerPart = piStr.slice(0, -decimals) || '0';
    const decimalPart = piStr.slice(-decimals);
    return `${integerPart}.${decimalPart}`;
}

function findNumberInPi(target, digits) {
    const piString = calculatePi(digits + 100);
    const targetStr = target.toString();
    const index = piString.indexOf(targetStr);
    
    if (index !== -1) {
        const start = Math.max(0, index - 15);
        const end = Math.min(piString.length, index + targetStr.length + 15);
        return {
            found: true,
            position: index,
            context: piString.substring(start, end),
            fullPi: piString.substring(0, 100) + '...'
        };
    }
    return {
        found: false,
        fullPi: piString.substring(0, 100) + '...'
    };
}

const server = http.createServer((req, res) => {
    const result = findNumberInPi(19, 2000);
    
    let html = `
        <h1>Черепович Владислав Дмитриевич</h1>
        <h2>Группа: 401</h2>
        <h3>Поиск числа 19 в числе Пи:</h3>
    `;
    
    if (result.found) {
        html += `
            <p>Число 19 найдено на позиции ${result.position}</p>
            <p>Контекст: ...${result.context}...</p>
            <p>Начало Пи: ${result.fullPi}</p>
        `;
    } else {
        html += `
            <p>Число 19 не найдено</p>
            <p>Начало Пи: ${result.fullPi}</p>
        `;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});