const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    connectionString: 'postgresql://clientepro_db_user:fnZWBYK1SKpvWcu6RNJ5iDIBAEnI2dSO@dpg-d4j4lg75r7bs73f54810-a.oregon-postgres.render.com/clientepro_db',
    ssl: { rejectUnauthorized: false }
});

async function exportData() {
    try {
        await client.connect();
        console.log('✓ Conectado ao Render PostgreSQL');

        const tables = ['User', 'Customer', 'Appointment', 'Contract', 'Transaction', 'AppointmentChecklistItem', 'AppointmentPhoto', 'HelperExpense'];
        const data = {};

        for (const table of tables) {
            const result = await client.query(`SELECT * FROM "${table}"`);
            data[table] = result.rows;
            console.log(`✓ ${table}: ${result.rows.length} registros`);
        }

        fs.writeFileSync('/tmp/render_data.json', JSON.stringify(data, null, 2));
        console.log('\n✅ Dados exportados para /tmp/render_data.json');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

exportData();
