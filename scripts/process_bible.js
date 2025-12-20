/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path');

const csvPath = path.resolve(__dirname, '../../biblia_reina_valera_1960_completa.csv');
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split(',');

const booksMap = new Map();

// Abreviations map
const abrevs = {
    'Génesis': 'Gn', 'Éxodo': 'Ex', 'Levítico': 'Lv', 'Números': 'Nm', 'Deuteronomio': 'Dt',
    'Josué': 'Jos', 'Jueces': 'Jue', 'Rut': 'Rt', '1 Samuel': '1Sam', '2 Samuel': '2Sam',
    '1 Reyes': '1Re', '2 Reyes': '2Re', '1 Crónicas': '1Cr', '2 Crónicas': '2Cr',
    'Esdras': 'Esd', 'Nehemías': 'Neh', 'Ester': 'Est', 'Job': 'Job', 'Salmos': 'Sal',
    'Proverbios': 'Pr', 'Eclesiastés': 'Ec', 'Cantares': 'Cant', 'Isaías': 'Is',
    'Jeremías': 'Jer', 'Lamentaciones': 'Lam', 'Ezequiel': 'Ez', 'Daniel': 'Dn',
    'Oseas': 'Os', 'Joel': 'Jl', 'Amós': 'Am', 'Abdías': 'Abd', 'Jonás': 'Jon',
    'Miqueas': 'Miq', 'Nahúm': 'Nah', 'Habacuc': 'Hab', 'Sofonías': 'Sof',
    'Hageo': 'Hag', 'Zacarías': 'Zac', 'Malaquías': 'Mal', 'Mateo': 'Mt',
    'Marcos': 'Mc', 'Lucas': 'Lc', 'Juan': 'Jn', 'Hechos': 'Hch', 'Romanos': 'Rom',
    '1 Corintios': '1Co', '2 Corintios': '2Co', 'Gálatas': 'Gál', 'Efesios': 'Ef',
    'Filipenses': 'Fil', 'Colosenses': 'Col', '1 Tesalonicenses': '1Tes',
    '2 Tesalonicenses': '2Tes', '1 Timoteo': '1Tim', '2 Timoteo': '2Tim',
    'Tito': 'Tit', 'Filemón': 'Flm', 'Hebreos': 'Heb', 'Santiago': 'Sant',
    '1 Pedro': '1Pe', '2 Pedro': '2Pe', '1 Juan': '1Jn', '2 Juan': '2Jn',
    '3 Juan': '3Jn', 'Judas': 'Jud', 'Apocalipsis': 'Ap'
};

let bookId = 1;
for (let i = 1; i < lines.length; i++) {
    const [testamento, libro, totalCap, cap, vers] = lines[i].split(',');

    if (!booksMap.has(libro)) {
        booksMap.set(libro, {
            id: bookId++,
            nombre: libro,
            testamento: testamento === 'Antiguo Testamento' ? 'AT' : 'NT',
            abreviatura: abrevs[libro] || libro.substring(0, 3),
            capitulos: []
        });
    }

    const book = booksMap.get(libro);
    book.capitulos.push({
        n: parseInt(cap),
        v: parseInt(vers)
    });
}

const finalStructure = {
    libros: Array.from(booksMap.values())
};

fs.writeFileSync(path.resolve(__dirname, 'biblia_full.json'), JSON.stringify(finalStructure, null, 2));
console.log('Bible structure generated successfully with ' + finalStructure.libros.length + ' books.');
