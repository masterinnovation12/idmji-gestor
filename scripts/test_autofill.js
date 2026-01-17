/**
 * Script para probar autoFillAlabanzaSequence
 */

const { autoFillAlabanzaSequence } = require('../src/app/dashboard/himnos/actions');

async function testAutofill() {
    console.log('--- TEST: autoFillAlabanzaSequence ---');
    try {
        const result = await autoFillAlabanzaSequence();
        console.log('Resultado:', result);
    } catch (error) {
        console.error('Error ejecutando autoFillAlabanzaSequence:', error);
    }
}

testAutofill();
