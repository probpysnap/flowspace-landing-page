const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mybeisbemfrduvheaaul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YmVpc2JlbWZyZHV2aGVhYXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODc2ODYsImV4cCI6MjA5NzU2MzY4Nn0.1jaLT7ZbBUzulNvvDEklLu4ryqrLPxtu-xwfXXnmfJY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDB() {
    console.log("Fetching spaces...");
    const { data, error } = await supabase.from('spaces').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Spaces:", data);
    }
}

testDB();
